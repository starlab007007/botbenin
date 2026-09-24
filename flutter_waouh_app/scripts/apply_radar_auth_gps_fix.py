#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "android/app/src/main/AndroidManifest.xml"
SERVICE = ROOT / "lib/live/live_radar_service.dart"
VIEW = ROOT / "lib/live/radar_view.dart"


def replace_block(source: str, start: str, end: str, replacement: str) -> str:
    begin = source.find(start)
    if begin < 0:
        raise RuntimeError(f"Radar patch: start marker not found: {start}")
    finish = source.find(end, begin)
    if finish < 0:
        raise RuntimeError(f"Radar patch: end marker not found: {end}")
    return source[:begin] + replacement + source[finish:]


# Android requires these manifest permissions before Geolocator can show the
# runtime Android permission dialog.
manifest = MANIFEST.read_text(encoding="utf-8")
permission_lines = (
    '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n'
    '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n'
)
if "android.permission.ACCESS_FINE_LOCATION" not in manifest:
    anchor = '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n'
    if anchor not in manifest:
        raise RuntimeError("Radar patch: Android manifest network permission anchor not found.")
    manifest = manifest.replace(anchor, anchor + permission_lines, 1)
    MANIFEST.write_text(manifest, encoding="utf-8")

service = SERVICE.read_text(encoding="utf-8")
if "class LiveRadarScanException" not in service:
    anchor = "class LiveRadarService {"
    if anchor not in service:
        raise RuntimeError("Radar patch: LiveRadarService declaration not found.")
    exception = '''class LiveRadarScanException implements Exception {
  const LiveRadarScanException(this.message, {this.requiresAuthentication = false});

  final String message;
  final bool requiresAuthentication;

  @override
  String toString() => message;
}

'''
    service = service.replace(anchor, exception + anchor, 1)

scan_function = '''  Future<LiveRadarScanSnapshot> scanSnapshot({
    required double latitude,
    required double longitude,
    required LiveRadarFilters filters,
  }) async {
    final session = client.auth.currentSession;
    if (session == null || session.accessToken.trim().isEmpty) {
      throw const LiveRadarScanException(
        'Connectez-vous pour scanner les opportunités autour de vous.',
        requiresAuthentication: true,
      );
    }

    try {
      final response = await client.functions
          .invoke('waouh-radar-nearby', body: {
        'latitude': latitude,
        'longitude': longitude,
        'radius_km': filters.maxRadiusKm,
        'types': filters.types.map((item) => switch (item) {
          LiveRadarItemType.sell => 'sell',
          LiveRadarItemType.buy => 'buy',
          LiveRadarItemType.status => 'status',
        }).toList(),
        'category': filters.category,
        'photo_only': filters.photoOnly,
        'verified_only': filters.verifiedOnly,
      }).timeout(const Duration(seconds: 15));

      final raw = response.data;
      if (raw is! Map) {
        throw const LiveRadarScanException('Réponse Radar invalide. Réessayez dans un instant.');
      }
      final data = Map<String, dynamic>.from(raw);
      if (data['ok'] != true) {
        final message = '${data['error'] ?? 'Le service Radar a renvoyé une erreur.'}';
        throw LiveRadarScanException(
          _radarHumanMessage(message),
          requiresAuthentication: _radarAuthenticationError(message),
        );
      }

      final items = (data['items'] is List ? data['items'] as List : const [])
          .whereType<Map>()
          .map((item) => _apiItem(Map<String, dynamic>.from(item)))
          .whereType<LiveRadarItem>()
          .toList()
        ..sort((a, b) => b.score.compareTo(a.score));
      final sources = data['sources'] is Map
          ? Map<String, dynamic>.from(data['sources'] as Map)
          : const <String, dynamic>{};
      final catalog = _radarSource(sources['catalog']);
      final articles = _radarSource(sources['articles']);
      final external = _radarSource(sources['external']);
      final statuses = _radarSource(sources['statuses']);
      final warnings = [
        data['warning'],
        catalog['error'],
        articles['error'],
        external['error'],
        statuses['error'],
      ].whereType<String>().map(_radarHumanMessage).where((item) => item.isNotEmpty).toSet();
      return LiveRadarScanSnapshot(
        items: items,
        scannedAt: DateTime.tryParse('${data['generated_at'] ?? ''}')?.toLocal() ?? DateTime.now(),
        backendMode: true,
        catalogCount: _int(catalog['count']) + _int(articles['count']) + _int(external['count']),
        statusCount: _int(statuses['count']),
        warning: warnings.isEmpty ? null : warnings.join(' · '),
      );
    } on LiveRadarScanException {
      rethrow;
    } on TimeoutException {
      throw const LiveRadarScanException(
        'Le Radar met trop de temps à répondre. Vérifiez la connexion puis réessayez.',
      );
    } catch (error) {
      final message = _cleanError(error);
      throw LiveRadarScanException(
        _radarHumanMessage(message),
        requiresAuthentication: _radarAuthenticationError(message),
      );
    }
  }

'''
service = replace_block(
    service,
    "  Future<LiveRadarScanSnapshot> scanSnapshot({",
    "  Future<LiveRadarScanSnapshot> _directSnapshot({",
    scan_function,
)
service = service.replace("id: _int(ringRaw['id']).clamp(1, 4),", "id: _int(ringRaw['id']).clamp(1, 4).toInt(),")
if "Map<String, dynamic> _radarSource" not in service:
    helpers = '''

Map<String, dynamic> _radarSource(dynamic value) => value is Map
    ? Map<String, dynamic>.from(value)
    : const <String, dynamic>{};

bool _radarAuthenticationError(String value) {
  final message = value.toLowerCase();
  return message.contains('connexion requise') ||
      message.contains('unauthorized') ||
      message.contains('jwt') ||
      message.contains('401') ||
      message.contains('session');
}

String _radarHumanMessage(String value) {
  final message = value.trim();
  if (message.isEmpty) return 'Le Radar est momentanément indisponible.';
  if (_radarAuthenticationError(message)) {
    return 'Votre session a expiré. Connectez-vous pour scanner les opportunités.';
  }
  return message;
}
'''
    service += helpers
SERVICE.write_text(service, encoding="utf-8")

view = VIEW.read_text(encoding="utf-8")
if "String? _scanError;" not in view:
    view = view.replace("  bool _loading = false;", "  bool _loading = false;\n  String? _scanError;\n  bool _needsAuthentication = false;")

new_scan = '''  Future<void> _scan({bool refreshLocation = false}) async {
    if (_loading) return;
    final auth = context.read<legacy.AuthController>();
    if (!auth.signedIn) {
      setState(() {
        _needsAuthentication = true;
        _scanError = 'Connectez-vous pour scanner les opportunités réelles autour de vous.';
      });
      return;
    }
    if (refreshLocation) await _resolveLocation();
    if (!mounted) return;
    setState(() {
      _loading = true;
      _scanError = null;
      _needsAuthentication = false;
    });
    _sweep.repeat();
    try {
      final value = await _service.scanSnapshot(
        latitude: _latitude,
        longitude: _longitude,
        filters: _filters,
      );
      if (mounted) setState(() => _snapshot = value);
    } on LiveRadarScanException catch (error) {
      if (mounted) {
        setState(() {
          _scanError = error.message;
          _needsAuthentication = error.requiresAuthentication;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _scanError = 'Erreur Radar : $error');
    } finally {
      _sweep.stop();
      _sweep.value = 0;
      if (mounted) setState(() => _loading = false);
    }
  }

'''
view = replace_block(view, "  Future<void> _scan({", "  Future<void> _openFilters() async {", new_scan)

old_notice = '''          if ((snapshot?.warning ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            RadarNotice(text: snapshot!.warning!, backendMode: snapshot.backendMode),
          ],
          const SizedBox(height: 18),'''
new_notice = '''          if (_scanError != null) ...[
            const SizedBox(height: 10),
            _RadarFailureCard(
              message: _scanError!,
              needsAuthentication: _needsAuthentication,
              onAuthenticate: () => context.go('/app/auth?next=%2Fapp%2Fchat'),
              onRetry: () => _scan(refreshLocation: true),
            ),
          ] else if ((snapshot?.warning ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            RadarNotice(text: snapshot!.warning!, backendMode: snapshot.backendMode),
          ],
          const SizedBox(height: 18),'''
if old_notice not in view:
    raise RuntimeError("Radar patch: Radar notice block not found.")
view = view.replace(old_notice, new_notice, 1)

if "class _RadarFailureCard" not in view:
    view += '''

class _RadarFailureCard extends StatelessWidget {
  const _RadarFailureCard({
    required this.message,
    required this.needsAuthentication,
    required this.onAuthenticate,
    required this.onRetry,
  });

  final String message;
  final bool needsAuthentication;
  final VoidCallback onAuthenticate;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7E7),
          border: Border.all(color: const Color(0xFFF0D69A)),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Row(children: [
            Icon(Icons.radar_rounded, color: Color(0xFF9B6A00)),
            SizedBox(width: 8),
            Text('Radar nécessite une action', style: TextStyle(fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 7),
          Text(message, style: const TextStyle(color: Color(0xFF6E6040), height: 1.3)),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: needsAuthentication
                ? FilledButton.icon(
                    onPressed: onAuthenticate,
                    icon: const Icon(Icons.login_rounded),
                    label: const Text('Se connecter pour scanner'),
                  )
                : OutlinedButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Réessayer le scan'),
                  ),
          ),
        ]),
      );
}
'''
VIEW.write_text(view, encoding="utf-8")
print("Radar GPS/authentication fix applied.")
