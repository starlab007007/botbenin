import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

const nativeOAuthRedirect = 'bj.bot.waouhapp://login-callback/app/auth';

/// Never send OAuth credentials to the router. supabase_flutter owns their
/// PKCE exchange through its app_links subscription, including cold starts.
String? nativeRouteForLink(Uri uri) {
  if (uri.scheme != 'https' ||
      !const {'bot.bj', 'www.bot.bj'}.contains(uri.host) ||
      uri.userInfo.isNotEmpty ||
      (uri.hasPort && uri.port != 443) ||
      !(uri.path == '/app' || uri.path.startsWith('/app/'))) {
    return null;
  }
  const credentials = {
    'code', 'access_token', 'refresh_token', 'id_token', 'error_description',
  };
  if (uri.queryParameters.keys.any(credentials.contains) ||
      uri.fragment.isNotEmpty) {
    return null;
  }
  return uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path;
}

/// Preserve ordinary BOT.BJ deep links while disabling Flutter's built-in
/// callback handler, which competes with Supabase's app_links handler.
class NativeAuthLinks extends StatefulWidget {
  const NativeAuthLinks({
    super.key,
    required this.onRoute,
    required this.child,
  });

  final void Function(String) onRoute;
  final Widget child;

  @override
  State<NativeAuthLinks> createState() => _NativeAuthLinksState();
}

class _NativeAuthLinksState extends State<NativeAuthLinks> {
  StreamSubscription<Uri>? _subscription;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      final links = AppLinks();
      _subscription = links.uriLinkStream.listen(_open, onError: (_) {});
      unawaited(links.getInitialLink().then((uri) {
        if (uri != null) _open(uri);
      }).catchError((Object _) {}));
    }
  }

  void _open(Uri uri) {
    final route = nativeRouteForLink(uri);
    if (route == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.onRoute(route);
    });
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
