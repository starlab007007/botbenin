import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart' show FunctionException;
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import '../main.dart' as legacy;
import 'avatar/bot_character.dart';

const avatarPremiumBlue = Color(0xFF4464EF),
    avatarPremiumInk = Color(0xFF17233B),
    avatarPremiumMuted = Color(0xFF65738B),
    avatarPremiumLine = Color(0xFFE5EAF3),
    avatarPremiumBg = Color(0xFFF7F8FC);
const defaultAvatarAutonomy = <String, dynamic>{
  'paused': false,
  'mode': 'autonomous',
  'goal': '',
  'city': '',
  'budget_max': null,
  'price_floor': null,
  'radius_km': 25,
  'active_start': '08:00',
  'active_end': '20:00',
  'start': 'now',
  'duration_hours': 24,
  'scan_interval_minutes': 30,
  'followup_hours': 24,
  'max_followups': 1,
  'max_contacts': 5,
  'allow_contact': false,
  'allow_negotiate': false,
  'allow_whatsapp': false,
  'notify_reply': true,
  'notify_offer': true,
  'digest_only': false,
  'no_match': 'ask',
  'agreement': 'confirm',
};
Future<dynamic> _invokeAvatarPrefs(
  Map<String, dynamic> body, {
  String? expectedOwner,
}) async {
  var session = legacy.supabase.auth.currentSession;
  final owner = expectedOwner ?? session?.user.id;
  if (session == null || owner == null || session.user.id != owner)
    throw StateError('account_changed');
  try {
    return await legacy.supabase.functions.invoke(
      'waouh-avatar-briefing',
      headers: {'Authorization': 'Bearer ${session.accessToken}'},
      body: body,
    );
  } on FunctionException catch (e) {
    if (e.status != 401 || legacy.supabase.auth.currentUser?.id != owner)
      rethrow;
    final refreshed = await legacy.supabase.auth.refreshSession();
    session = refreshed.session;
    if (session == null ||
        session.user.id != owner ||
        legacy.supabase.auth.currentUser?.id != owner)
      throw StateError('account_changed');
    return legacy.supabase.functions.invoke(
      'waouh-avatar-briefing',
      headers: {'Authorization': 'Bearer ${session.accessToken}'},
      body: body,
    );
  }
}

Future<Map<String, dynamic>> loadLiveAvatarAutonomy() async {
  final response = await _invokeAvatarPrefs({'action': 'get_prefs'});
  final data = response.data;
  if (data is! Map || data['ok'] != true) throw StateError('rules_unavailable');
  final prefs = data['prefs'],
      raw = prefs is Map ? prefs['autonomy_settings'] : null;
  return {
    ...defaultAvatarAutonomy,
    if (raw is Map) ...Map<String, dynamic>.from(raw),
  };
}

Future<Map<String, dynamic>> saveLiveAvatarAutonomy(
  Map<String, dynamic> rules, {
  String? expectedOwner,
}) async {
  final session = legacy.supabase.auth.currentSession;
  if (session == null ||
      (expectedOwner != null && session.user.id != expectedOwner))
    throw StateError('account_changed');
  final response = await _invokeAvatarPrefs({
    'action': 'set_prefs',
    'prefs': {'autonomy_settings': rules},
  }, expectedOwner: session.user.id);
  final data = response.data;
  if (data is! Map ||
      data['ok'] != true ||
      data['prefs'] is! Map ||
      (data['prefs'] as Map)['autonomy_settings'] is! Map)
    throw StateError('rules_save_failed');
  return Map<String, dynamic>.from(
    (data['prefs'] as Map)['autonomy_settings'] as Map,
  );
}

String? liveAvatarAutonomyError(Map<String, dynamic> rules) {
  if ('${rules['active_start']}'.compareTo('${rules['active_end']}') >= 0)
    return 'Choisissez une heure de fin après l’heure de début.';
  if (rules['allow_negotiate'] == true && rules['allow_contact'] != true)
    return 'Autorisez le contact pour permettre la négociation.';
  return null;
}

bool liveAutonomyWindowOpen(Map<String, dynamic> mandate, {DateTime? now}) {
  final metadata = mandate['metadata'];
  if (metadata is! Map || metadata['autonomy_settings'] is! Map) return true;
  final at = (now ?? DateTime.now()).toUtc(),
      rules = metadata['autonomy_settings'] as Map;
  final starts = DateTime.tryParse('${metadata['starts_at'] ?? ''}');
  if (starts != null && starts.isAfter(at)) return false;
  final local = at.add(const Duration(hours: 1));
  final clock =
      '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  return clock.compareTo('${rules['active_start'] ?? '08:00'}') >= 0 &&
      clock.compareTo('${rules['active_end'] ?? '20:00'}') < 0;
}

String liveAutomaticMissionMessage(Map<String, dynamic> mandate) {
  if (mandate['status'] == 'paused')
    return 'Le suivi de cette mission est en pause.';
  if (!liveAutonomyWindowOpen(mandate)) return 'Bot reprendra à l’ouverture.';
  final meta = mandate['metadata'];
  if (meta is Map && meta['discovery_kind'] == 'opportunity')
    return 'Votre avatar surveille les publications et les échéances. Toute candidature reste à valider.';
  if (meta is Map &&
      meta['autonomy_settings'] is Map &&
      (meta['autonomy_settings'] as Map)['allow_contact'] != true)
    return 'Bot compare. Les contacts attendent votre accord.';
  return 'Bot poursuit la mission selon vos règles.';
}

class LiveAvatarAutonomyScreen extends StatefulWidget {
  const LiveAvatarAutonomyScreen({
    super.key,
    this.onAppearance,
    this.name = 'Bot',
  });
  final VoidCallback? onAppearance;
  final String name;
  @override
  State<LiveAvatarAutonomyScreen> createState() =>
      _LiveAvatarAutonomyScreenState();
}

class _LiveAvatarAutonomyScreenState extends State<LiveAvatarAutonomyScreen> {
  StreamSubscription<dynamic>? _authSub;
  String? _accountId;
  Map<String, dynamic> rules = {...defaultAvatarAutonomy};
  Map<String, dynamic>? _draft;
  StateSetter? _sheetState;
  bool loading = true, saving = false, loadFailed = false;
  String? error, notice;
  Map<String, dynamic> get values => _draft ?? rules;
  @override
  void initState() {
    super.initState();
    _accountId = legacy.supabase.auth.currentUser?.id;
    _authSub = legacy.supabase.auth.onAuthStateChange.listen((event) {
      final next = legacy.supabase.auth.currentUser?.id;
      if (next != _accountId && mounted) {
        _accountId = next;
        setState(() {
          rules = {...defaultAvatarAutonomy};
          _draft = null;
          notice = null;
        });
        _load();
      }
    });
    _load();
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final account = legacy.supabase.auth.currentUser?.id;
    if (account == null) {
      setState(() {
        loading = false;
        loadFailed = false;
        error = null;
      });
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final value = await loadLiveAvatarAutonomy();
      if (mounted && account == legacy.supabase.auth.currentUser?.id)
        setState(() {
          rules = value;
          loadFailed = false;
        });
    } catch (_) {
      if (mounted && account == legacy.supabase.auth.currentUser?.id)
        setState(() {
          error = 'Chargement impossible. Réessayez.';
          loadFailed = true;
        });
    } finally {
      if (mounted && account == legacy.supabase.auth.currentUser?.id)
        setState(() => loading = false);
    }
  }

  void patch(String key, dynamic value) {
    _draft = {...values, key: value};
    if (key == 'allow_contact' && value == false)
      _draft!['allow_negotiate'] = false;
    _sheetState?.call(() {});
  }

  Future<bool> _save(Map<String, dynamic> value) async {
    final account = legacy.supabase.auth.currentUser?.id;
    final message = liveAvatarAutonomyError(value);
    if (message != null) {
      setState(() => error = message);
      _sheetState?.call(() {});
      return false;
    }
    setState(() {
      saving = true;
      error = null;
    });
    _sheetState?.call(() {});
    try {
      final next = await saveLiveAvatarAutonomy(value, expectedOwner: account);
      if (!mounted || account != legacy.supabase.auth.currentUser?.id)
        return false;
      setState(() {
        rules = next;
        notice = value['paused'] == true
            ? 'Bot est en pause.'
            : 'Règles enregistrées.';
      });
      return true;
    } catch (_) {
      if (mounted && account == legacy.supabase.auth.currentUser?.id)
        setState(() => error = 'Enregistrement impossible. Réessayez.');
      return false;
    } finally {
      if (mounted && account == legacy.supabase.auth.currentUser?.id) {
        setState(() => saving = false);
        _sheetState?.call(() {});
      }
    }
  }

  Widget field(String key, String label, {bool money = false}) => Padding(
    padding: const EdgeInsets.only(top: 14),
    child: TextFormField(
      initialValue: '${values[key] ?? ''}',
      keyboardType: money ? TextInputType.number : TextInputType.text,
      onChanged: (v) => patch(key, money ? num.tryParse(v) : v),
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: avatarPremiumBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: avatarPremiumLine),
        ),
      ),
      style: const TextStyle(fontSize: 16),
    ),
  );
  Widget select(String key, String label, List<(dynamic, String)> options) =>
      Padding(
        padding: const EdgeInsets.only(top: 14),
        child: DropdownButtonFormField<dynamic>(
          initialValue: options.any((o) => o.$1 == values[key])
              ? values[key]
              : options.first.$1,
          isExpanded: true,
          items: options
              .map(
                (o) => DropdownMenuItem<dynamic>(
                  value: o.$1,
                  child: Text(o.$2, overflow: TextOverflow.ellipsis),
                ),
              )
              .toList(),
          onChanged: (v) => patch(key, v),
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: avatarPremiumBg,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: avatarPremiumLine),
            ),
          ),
          style: const TextStyle(fontSize: 14, color: avatarPremiumInk),
        ),
      );
  Widget toggle(String key, String label) => SwitchListTile.adaptive(
    contentPadding: EdgeInsets.zero,
    title: Text(label, style: const TextStyle(fontSize: 13)),
    value: values[key] == true,
    activeTrackColor: avatarPremiumBlue,
    onChanged: (v) => patch(key, v),
  );
  Widget time(String key, String label) => Expanded(
    child: Padding(
      padding: const EdgeInsets.only(top: 14),
      child: OutlinedButton(
        onPressed: () async {
          final p = '${values[key]}'.split(':');
          final picked = await showTimePicker(
            context: context,
            initialTime: TimeOfDay(
              hour: int.tryParse(p.first) ?? 8,
              minute: int.tryParse(p.last) ?? 0,
            ),
          );
          if (picked != null)
            patch(
              key,
              '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}',
            );
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11, color: avatarPremiumMuted),
              ),
              const SizedBox(height: 6),
              Text('${values[key]}'),
            ],
          ),
        ),
      ),
    ),
  );
  Widget hint(String text) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 14),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        height: 1.5,
        color: avatarPremiumMuted,
      ),
    ),
  );
  Widget extra(String label, List<Widget> children) => ExpansionTile(
    tilePadding: EdgeInsets.zero,
    title: Text(
      label,
      style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
    ),
    children: children,
  );
  Future<void> _open(String section) async {
    _draft = {...rules};
    setState(() => error = null);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (ctx, update) {
          _sheetState = update;
          final titles = {
            'mode': 'Comment Bot agit',
            'timing': 'Disponibilité',
            'limits': 'Mes limites',
            'permissions': 'Autorisations',
          };
          return Padding(
            padding: EdgeInsets.fromLTRB(
              22,
              0,
              22,
              24 + MediaQuery.viewInsetsOf(ctx).bottom,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.sizeOf(ctx).height * .82,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            titles[section] ?? 'Mon avatar',
                            style: const TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -.5,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: saving ? null : () => Navigator.pop(ctx),
                          tooltip: 'Fermer',
                          icon: const Icon(Icons.close, size: 19),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (section == 'mode') ...[
                      for (final o in [
                        (
                          'assisted',
                          'Assisté',
                          'Bot propose, vous faites.',
                          Icons.pan_tool_outlined,
                        ),
                        (
                          'semi_autonomous',
                          'Délégué',
                          'Bot prépare, vous approuvez.',
                          Icons.check_circle_outline,
                        ),
                        (
                          'autonomous',
                          'Automatique',
                          'Bot agit dans vos limites.',
                          Icons.auto_awesome_outlined,
                        ),
                      ])
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Material(
                            color: values['mode'] == o.$1
                                ? const Color(0xFFEDF1FF)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(15),
                            child: ListTile(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(15),
                                side: BorderSide(
                                  color: values['mode'] == o.$1
                                      ? avatarPremiumBlue
                                      : avatarPremiumLine,
                                ),
                              ),
                              leading: Icon(
                                o.$4,
                                color: avatarPremiumBlue,
                                size: 20,
                              ),
                              title: Text(
                                o.$2,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              subtitle: Text(
                                o.$3,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: avatarPremiumMuted,
                                ),
                              ),
                              trailing: values['mode'] == o.$1
                                  ? const Icon(
                                      Icons.check,
                                      color: avatarPremiumBlue,
                                      size: 19,
                                    )
                                  : null,
                              onTap: () => patch('mode', o.$1),
                            ),
                          ),
                        ),
                      hint('Accords et paiements : toujours votre validation.'),
                    ],
                    if (section == 'timing') ...[
                      Row(
                        children: [
                          time('active_start', 'À partir de'),
                          const SizedBox(width: 10),
                          time('active_end', 'Jusqu’à'),
                        ],
                      ),
                      select('duration_hours', 'Durée d’une mission', [
                        (24, '24 heures'),
                        (48, '48 heures'),
                        (168, '7 jours'),
                      ]),
                      select('followup_hours', 'Relancer sans réponse', [
                        (6, 'Après 6 heures'),
                        (24, 'Après 24 heures'),
                      ]),
                      extra('Autres horaires', [
                        select('start', 'Démarrage', [
                          ('now', 'Dès maintenant'),
                          ('tomorrow', 'Demain à l’ouverture'),
                        ]),
                        select(
                          'scan_interval_minutes',
                          'Vérifier les nouveautés',
                          [
                            (30, 'Toutes les 30 minutes'),
                            (60, 'Toutes les heures'),
                            (360, 'Toutes les 6 heures'),
                          ],
                        ),
                        select('max_followups', 'Relances par contact', [
                          (0, 'Aucune'),
                          (1, '1'),
                          (2, '2'),
                        ]),
                      ]),
                      hint('Heure du Bénin. Reprise à la prochaine ouverture.'),
                    ],
                    if (section == 'limits') ...[
                      field('goal', 'Besoin habituel'),
                      field('city', 'Zone'),
                      field(
                        'budget_max',
                        'Budget maximum · F CFA',
                        money: true,
                      ),
                      extra('Autres limites', [
                        field(
                          'price_floor',
                          'Prix plancher de vente · F CFA',
                          money: true,
                        ),
                        select('radius_km', 'Rayon autorisé', [
                          (10, '10 km'),
                          (25, '25 km'),
                          (50, '50 km'),
                          (0, 'Tout le Bénin'),
                        ]),
                        hint(
                          'Sans position précise, Bot reste dans la ville choisie.',
                        ),
                        select('max_contacts', 'Contacts maximum', [
                          (3, '3'),
                          (5, '5'),
                          (10, '10'),
                        ]),
                        select('no_match', 'Si aucune offre ne convient', [
                          ('ask', 'Me demander avant d’élargir'),
                          ('stop', 'Arrêter et me faire le point'),
                        ]),
                      ]),
                      hint('Pour les prochaines missions.'),
                    ],
                    if (section == 'permissions') ...[
                      toggle('allow_contact', 'Contacter en mon nom'),
                      toggle('allow_negotiate', 'Négocier dans mes limites'),
                      toggle('allow_whatsapp', 'Autoriser WhatsApp'),
                      extra('Suivi et alertes', [
                        toggle('notify_reply', 'Une réponse arrive'),
                        toggle('notify_offer', 'Une meilleure offre apparaît'),
                        toggle('digest_only', 'Un récapitulatif quotidien'),
                      ]),
                      hint(
                        'Un canal indisponible reste signalé. Tout engagement attend votre accord.',
                      ),
                    ],
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          error!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.red,
                          ),
                        ),
                      ),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: avatarPremiumBlue,
                        minimumSize: const Size.fromHeight(49),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                        ),
                      ),
                      onPressed: saving
                          ? null
                          : () async {
                              final ok = await _save({...values});
                              if (ok && ctx.mounted) Navigator.pop(ctx);
                            },
                      child: Text(saving ? 'Enregistrement…' : 'Enregistrer'),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
    _sheetState = null;
    _draft = null;
  }

  Widget row(String title, String summary, IconData icon, String section) =>
      Material(
        type: MaterialType.transparency,
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          minVerticalPadding: 13,
          leading: Icon(icon, size: 19, color: avatarPremiumMuted),
          title: Text(
            title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              summary,
              style: const TextStyle(fontSize: 11, color: avatarPremiumMuted),
            ),
          ),
          trailing: const Icon(
            Icons.chevron_right,
            size: 17,
            color: avatarPremiumMuted,
          ),
          onTap: () => _open(section),
        ),
      );
  @override
  Widget build(BuildContext context) {
    final mode =
        {
          'assisted': 'Assisté',
          'semi_autonomous': 'Délégué',
          'autonomous': 'Automatique',
        }[rules['mode']] ??
        'Assisté';
    final paused = rules['paused'] == true;
    final amount = rules['budget_max'];
    return Scaffold(
      backgroundColor: avatarPremiumBg,
      appBar: AppBar(
        backgroundColor: avatarPremiumBg,
        title: const Text(
          'Mon avatar',
          style: TextStyle(
            fontSize: 23,
            fontWeight: FontWeight.w700,
            letterSpacing: -.7,
          ),
        ),
        automaticallyImplyLeading: false,
      ),
      body: _accountId == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const BotCharacter(size: 64, animated: false),
                    const SizedBox(height: 18),
                    const Text(
                      'Votre avatar vous accompagne.',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 9),
                    const Text(
                      'Connectez-vous pour enregistrer vos règles et suivre vos missions.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: avatarPremiumMuted),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: () =>
                          context.push('/app/auth?next=%2Fapp%2Favatar'),
                      child: const Text('Configurer mon avatar'),
                    ),
                  ],
                ),
              ),
            )
          : loading
          ? const Center(child: CircularProgressIndicator())
          : loadFailed
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(error ?? 'Chargement impossible.'),
                  TextButton(onPressed: _load, child: const Text('Réessayer')),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(22, 12, 22, 32),
              children: [
                Center(
                  child: Column(
                    children: [
                      InkWell(
                        borderRadius: BorderRadius.circular(40),
                        onTap: widget.onAppearance,
                        child: const BotCharacter(size: 64, animated: false),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        widget.name,
                        style: const TextStyle(
                          fontSize: 21,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -.5,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        '● ${paused ? 'En pause' : 'Actif'}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF087C68),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 30),
                Material(
                  color: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: avatarPremiumLine),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 15,
                      vertical: 6,
                    ),
                    leading: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEDF1FF),
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: const Icon(
                        Icons.auto_awesome_outlined,
                        size: 20,
                        color: avatarPremiumBlue,
                      ),
                    ),
                    title: Text(
                      mode,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    subtitle: Text(
                      rules['mode'] == 'autonomous'
                          ? 'Recherche, compare et suit'
                          : rules['mode'] == 'assisted'
                          ? 'Vous propose, vous décidez'
                          : 'Prépare les actions pour vous',
                      style: const TextStyle(
                        fontSize: 11,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    trailing: const Icon(
                      Icons.chevron_right,
                      size: 17,
                      color: avatarPremiumMuted,
                    ),
                    onTap: () => _open('mode'),
                  ),
                ),
                const SizedBox(height: 23),
                row(
                  'Disponibilité',
                  '${rules['active_start']}–${rules['active_end']} · ${rules['duration_hours'] == 168 ? '7 jours' : '${rules['duration_hours']} h'}',
                  Icons.schedule,
                  'timing',
                ),
                const Divider(height: 1, color: avatarPremiumLine),
                row(
                  'Limites',
                  '${amount is num ? '${amount.round()} F' : 'Budget à définir'}${'${rules['city']}'.isNotEmpty ? ' · ${rules['city']}' : ''}',
                  Icons.tune,
                  'limits',
                ),
                const Divider(height: 1, color: avatarPremiumLine),
                row(
                  'Autorisations',
                  rules['allow_contact'] == true
                      ? 'Contacts autorisés${rules['allow_negotiate'] == true ? ' · Négociation' : ''}'
                      : 'Contacts à valider',
                  Icons.verified_user_outlined,
                  'permissions',
                ),
                const Divider(height: 1, color: avatarPremiumLine),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 23),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.lock_outline,
                        size: 13,
                        color: avatarPremiumMuted,
                      ),
                      SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Accords et paiements à valider',
                          style: TextStyle(
                            fontSize: 11,
                            color: avatarPremiumMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(46),
                    foregroundColor: avatarPremiumMuted,
                    side: const BorderSide(color: avatarPremiumLine),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: saving
                      ? null
                      : () => _save({...rules, 'paused': !paused}),
                  icon: Icon(
                    paused ? Icons.play_arrow_outlined : Icons.pause,
                    size: 15,
                  ),
                  label: Text(
                    saving
                        ? 'Enregistrement…'
                        : paused
                        ? 'Réactiver Bot'
                        : 'Mettre Bot en pause',
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
                if (notice != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(
                      notice!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF087C68),
                      ),
                    ),
                  ),
                if (error != null)
                  Text(
                    error!,
                    style: const TextStyle(fontSize: 12, color: Colors.red),
                  ),
              ],
            ),
    );
  }
}
