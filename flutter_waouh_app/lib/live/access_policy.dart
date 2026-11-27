const defaultPublicWaouhPath = '/app/chat';

const waouhAuthRequiredPrefixes = <String>[
  '/app/chat/',
  '/app/avatar/',
  '/app/missions',
  '/app/deal-room',
  '/app/ia',
  '/app/bots',
  '/app/agents',
  '/app/whatsapp',
  '/app/stock',
  '/app/presence',
  '/app/diffusion',
  '/app/partner',
  '/app/profile',
  '/app/notifications',
];

bool requiresWaouhAuthentication(String path) {
  if (path == '/app/chat' || path == '/app/presence/checkin') return false;
  for (final prefix in waouhAuthRequiredPrefixes) {
    if (prefix.endsWith('/')) {
      if (path.startsWith(prefix)) return true;
    } else if (path == prefix || path.startsWith('$prefix/')) {
      return true;
    }
  }
  return false;
}

String normalizeWaouhNextRoute(
  String? value, {
  String fallback = defaultPublicWaouhPath,
}) {
  final raw = value?.trim() ?? '';
  if (raw.isEmpty || !raw.startsWith('/') || raw.startsWith('//')) {
    return fallback;
  }

  final uri = Uri.tryParse(raw);
  if (uri == null || uri.hasScheme || uri.host.isNotEmpty) return fallback;
  if (uri.path.startsWith('/app/auth')) return fallback;

  return canonicalWaouhRoomRoute(uri) ?? uri.toString();
}

String buildWaouhAuthRoute(String next) {
  final safe = normalizeWaouhNextRoute(next);
  return '/app/auth?next=${Uri.encodeComponent(safe)}';
}

/// Legacy server notification links and the native room route refer to the same room.
/// Preserve the query so authentication can resume the precise conversation.
String? canonicalWaouhRoomRoute(Uri uri) {
  if (uri.hasScheme || uri.hasAuthority || uri.path != '/app/chat') return null;
  final roomId = uri.queryParameters['room_id']?.trim() ?? '';
  if (roomId.isEmpty) return null;
  return uri.replace(path: '/app/chat/room').toString();
}
