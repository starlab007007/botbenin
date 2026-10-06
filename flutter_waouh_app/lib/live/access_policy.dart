const defaultPublicWaouhPath = '/app/chat';

const waouhAuthRequiredPrefixes = <String>[
  '/app/chat/',
  '/app/avatar/',
  '/app/missions',
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
  if (path == '/app/chat') return false;
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

  return uri.toString();
}

String buildWaouhAuthRoute(String next) {
  final safe = normalizeWaouhNextRoute(next);
  return '/app/auth?next=${Uri.encodeComponent(safe)}';
}
