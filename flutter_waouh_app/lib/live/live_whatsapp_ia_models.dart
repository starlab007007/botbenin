class LiveWhatsAppIaException implements Exception {
  const LiveWhatsAppIaException(this.message);

  final String message;

  @override
  String toString() => message;
}

class LiveWhatsAppSession {
  const LiveWhatsAppSession({
    required this.name,
    required this.status,
    this.phone,
    this.createdAt,
  });

  final String name;
  final String status;
  final String? phone;
  final DateTime? createdAt;

  bool get isWorking =>
      status.toUpperCase() == 'WORKING' || status.toLowerCase() == 'connected';

  bool get needsQr => const {
        'SCAN_QR_CODE',
        'STARTING',
        'STOPPED',
        'DISCONNECTED',
      }.contains(status.toUpperCase());

  factory LiveWhatsAppSession.fromDatabase(Map<String, dynamic> row) =>
      LiveWhatsAppSession(
        name: '${row['session_name'] ?? ''}',
        status: '${row['status'] ?? 'STOPPED'}',
        phone: row['phone_number']?.toString(),
        createdAt: DateTime.tryParse('${row['created_at'] ?? ''}')?.toLocal(),
      );

  factory LiveWhatsAppSession.fromWaha(Map<String, dynamic> row) {
    final config = row['config'] is Map
        ? Map<String, dynamic>.from(row['config'] as Map)
        : const <String, dynamic>{};
    final metadata = config['metadata'] is Map
        ? Map<String, dynamic>.from(config['metadata'] as Map)
        : const <String, dynamic>{};
    return LiveWhatsAppSession(
      name: '${row['name'] ?? row['session_name'] ?? ''}',
      status: '${row['status'] ?? 'DISCONNECTED'}',
      phone: metadata['phone_number']?.toString() ??
          metadata['account']?.toString(),
    );
  }
}

class LiveWhatsAppDashboard {
  const LiveWhatsAppDashboard({
    required this.sessions,
    this.remoteError,
  });

  final List<LiveWhatsAppSession> sessions;
  final String? remoteError;

  int get connectedCount => sessions.where((item) => item.isWorking).length;
}

class LivePairCode {
  const LivePairCode({required this.code, required this.expiresIn});

  final String code;
  final int expiresIn;
}

class LiveWhatsAppBot {
  const LiveWhatsAppBot({
    required this.id,
    required this.name,
    this.webhookUrl,
  });

  final String id;
  final String name;
  final String? webhookUrl;

  factory LiveWhatsAppBot.fromJson(Map<String, dynamic> row) =>
      LiveWhatsAppBot(
        id: '${row['id'] ?? ''}',
        name: '${row['name'] ?? 'Bot sans nom'}',
        webhookUrl: row['webhook_url']?.toString(),
      );
}
