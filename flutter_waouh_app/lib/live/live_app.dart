import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_auth_screens.dart';
import 'live_broadcast_screen.dart';
import 'live_controller.dart';
import 'live_controller_v2.dart';
import 'live_inbox_screen_v2.dart';
import 'live_legacy_screens.dart';
import 'live_match_chat_v2.dart';
import 'live_models.dart';
import 'live_notifications_screen_v2.dart';
import 'live_offline_banner.dart';
import 'live_partner_businesses_v3.dart';
import 'live_partner_products_v2.dart';
import 'live_profile_screen_v2.dart';
import 'live_screens.dart';
import 'live_whatsapp_auth.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await legacy.initializeWaouhBackend();
  runApp(const LiveWaouhApp());
}

class LiveWaouhApp extends StatelessWidget {
  const LiveWaouhApp({super.key});

  @override
  Widget build(BuildContext context) => MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => legacy.AuthController()),
      ChangeNotifierProxyProvider<legacy.AuthController, LiveWaouhController>(
        create: (context) => LiveWaouhControllerV2(context.read<legacy.AuthController>()),
        update: (_, auth, previous) => previous ?? LiveWaouhControllerV2(auth),
      ),
      ChangeNotifierProxyProvider<legacy.AuthController, legacy.WaouhChatController>(
        create: (context) => legacy.WaouhChatController(context.read<legacy.AuthController>()),
        update: (_, auth, previous) => previous ?? legacy.WaouhChatController(auth),
      ),
      ChangeNotifierProxyProvider<legacy.AuthController, legacy.StatusController>(
        create: (context) => legacy.StatusController(context.read<legacy.AuthController>()),
        update: (_, auth, previous) => previous ?? legacy.StatusController(auth),
      ),
      Provider(create: (_) => legacy.NotificationsController()),
      ChangeNotifierProxyProvider<legacy.AuthController, legacy.PartnerController>(
        create: (context) => legacy.PartnerController(context.read<legacy.AuthController>()),
        update: (_, auth, previous) => previous ?? legacy.PartnerController(auth),
      ),
    ],
    child: Builder(builder: (context) => MaterialApp.router(
      title: 'WaouhApp',
      debugShowCheckedModeBanner: false,
      theme: legacy.buildWaouhTheme(),
      routerConfig: _router(context.read<legacy.AuthController>()),
    )),
  );
}

GoRouter _router(legacy.AuthController auth) => GoRouter(
  initialLocation: '/app/chat',
  refreshListenable: auth,
  redirect: (_, state) {
    const guarded = ['/app/notifications', '/app/bots', '/app/whatsapp', '/app/diffusion', '/app/partner', '/app/profile'];
    final path = state.uri.path;
    if (!auth.signedIn && guarded.any(path.startsWith)) return '/app/auth?next=${Uri.encodeComponent(path)}';
    if (auth.signedIn && path.startsWith('/app/auth')) return state.uri.queryParameters['next'] ?? '/app/chat';
    return null;
  },
  routes: [
    GoRoute(path: '/', redirect: (_, __) => '/app/chat'),
    GoRoute(path: '/app/auth', builder: (_, __) => const LiveOnboardingScreen()),
    GoRoute(path: '/app/auth/email', builder: (_, __) => const LiveEmailAuthScreen()),
    GoRoute(path: '/app/auth/whatsapp', builder: (_, __) => const LiveWhatsAppOtpScreenV2()),
    ShellRoute(
      builder: (_, state, child) => LiveShell(path: state.uri.path, child: child),
      routes: [
        GoRoute(path: '/app/chat', builder: (_, __) => const LiveInboxScreenV2()),
        GoRoute(path: '/app/chat/waouh', builder: (_, __) => const LiveMainChatScreen()),
        GoRoute(path: '/app/chat/match/:key', builder: (_, state) => LiveMatchChatV2(matchKey: state.pathParameters['key']!, initial: state.extra as LiveMatch?)),
        GoRoute(path: '/app/chat/:id', builder: (_, state) => LiveConversationScreen(conversationId: state.pathParameters['id']!)),
        GoRoute(path: '/app/notifications', builder: (_, __) => const LiveNotificationsScreenV2()),
        GoRoute(path: '/app/bots', builder: (_, __) => const LiveBotsScreen()),
        GoRoute(path: '/app/whatsapp', builder: (_, __) => const LiveWhatsAppIaScreen()),
        GoRoute(path: '/app/diffusion', builder: (_, __) => const LiveBroadcastScreen()),
        GoRoute(path: '/app/partner', redirect: (_, __) => '/app/partner/businesses'),
        GoRoute(path: '/app/partner/businesses', builder: (_, __) => const LivePartnerBusinessesScreenV3()),
        GoRoute(path: '/app/partner/businesses/:businessId/products', builder: (_, state) => LivePartnerProductsScreenV2(businessId: state.pathParameters['businessId']!)),
        GoRoute(path: '/app/profile', builder: (_, __) => const LiveProfileScreenV2()),
      ],
    ),
  ],
);

class LiveShell extends StatelessWidget {
  const LiveShell({super.key, required this.path, required this.child});
  final String path;
  final Widget child;

  int get _index {
    if (path.startsWith('/app/bots')) return 1;
    if (path.startsWith('/app/whatsapp')) return 2;
    if (path.startsWith('/app/diffusion')) return 3;
    if (path.startsWith('/app/partner')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final focused = path.startsWith('/app/chat/') || path.startsWith('/app/profile') || path.startsWith('/app/partner/businesses/');
    return Scaffold(
      body: Column(children: [const LiveOfflineBanner(), Expanded(child: child)]),
      bottomNavigationBar: focused ? null : NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (index) => context.go(switch (index) {
          1 => '/app/bots', 2 => '/app/whatsapp', 3 => '/app/diffusion', 4 => '/app/partner', _ => '/app/chat',
        }),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline), label: 'Chat'),
          NavigationDestination(icon: Icon(Icons.smart_toy_outlined), label: 'Bots'),
          NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), label: 'IA'),
          NavigationDestination(icon: Icon(Icons.campaign_outlined), label: 'Diffusion'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), label: 'Partenaire'),
        ],
      ),
    );
  }
}
