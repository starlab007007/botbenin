import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_auth_screens.dart';
import 'live_broadcast_screen.dart';
import 'live_controller.dart';
import 'live_controller_v2.dart';
import 'live_inbox_production.dart';
import 'live_legacy_screens.dart';
import 'live_match_chat_v2.dart';
import 'live_models.dart';
import 'live_notifications_screen_v2.dart';
import 'live_offline_banner.dart';
import 'live_partner_businesses_v3.dart';
import 'live_partner_products_v2.dart';
import 'live_profile_screen_v2.dart';
import 'live_screens.dart';
import 'live_ia_hub_screen.dart';
import 'live_whatsapp_auth.dart';
import 'live_whatsapp_ia_native_screen.dart';

import 'live_apresbac_ia_screen.dart';

import '../features/fa_ia/presentation/fa_ia_home_screen.dart';

import 'live_radar_map_screen.dart';

import '../business_modules/waouh_business_modules.dart'
    hide WaouhBiWorkspaceScreen;
import 'live_ia_agent_selector_screen.dart';
import 'live_bots_modules_hub_screen.dart';
import 'live_module_flow_navigation.dart';
import 'waouh_bi_workspace_screen.dart';

import 'live_ia_final_hub_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await legacy.initializeWaouhBackend();
  runApp(const LiveWaouhProductionApp());
}

class LiveWaouhProductionApp extends StatelessWidget {
  const LiveWaouhProductionApp({super.key});

  @override
  Widget build(BuildContext context) => MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => legacy.AuthController()),
          ChangeNotifierProxyProvider<legacy.AuthController,
              LiveWaouhController>(
            create: (context) =>
                LiveWaouhControllerV2(context.read<legacy.AuthController>()),
            update: (_, auth, previous) =>
                previous ?? LiveWaouhControllerV2(auth),
          ),
          ChangeNotifierProxyProvider<legacy.AuthController,
              legacy.WaouhChatController>(
            create: (context) => legacy.WaouhChatController(
                context.read<legacy.AuthController>()),
            update: (_, auth, previous) =>
                previous ?? legacy.WaouhChatController(auth),
          ),
          ChangeNotifierProxyProvider<legacy.AuthController,
              legacy.StatusController>(
            create: (context) =>
                legacy.StatusController(context.read<legacy.AuthController>()),
            update: (_, auth, previous) =>
                previous ?? legacy.StatusController(auth),
          ),
          Provider(create: (_) => legacy.NotificationsController()),
          ChangeNotifierProxyProvider<legacy.AuthController,
              legacy.PartnerController>(
            create: (context) =>
                legacy.PartnerController(context.read<legacy.AuthController>()),
            update: (_, auth, previous) =>
                previous ?? legacy.PartnerController(auth),
          ),
        ],
        child: Builder(
          builder: (context) => MaterialApp.router(
            title: 'WaouhApp',
            debugShowCheckedModeBanner: false,
            theme: legacy.buildWaouhTheme(),
            routerConfig: _router(context.read<legacy.AuthController>()),
          ),
        ),
      );
}

GoRouter _router(legacy.AuthController auth) => GoRouter(
      initialLocation: '/app/chat',
      refreshListenable: auth,
      redirect: (_, state) {
        const guarded = [
          '/app/notifications',
          '/app/bots',
          '/app/whatsapp',
          '/app/diffusion',
          '/app/partner',
          '/app/profile',
        ];
        final path = state.uri.path;
        if (!auth.signedIn && guarded.any(path.startsWith))
          return '/app/auth?next=${Uri.encodeComponent(path)}';
        if (auth.signedIn && path.startsWith('/app/auth'))
          return state.uri.queryParameters['next'] ?? '/app/chat';
        return null;
      },
      routes: [
        GoRoute(path: '/', redirect: (_, __) => '/app/chat'),
        GoRoute(
          path: '/app/auth',
          builder: (_, __) => const LiveOnboardingScreen(),
        ),
        GoRoute(
          path: '/app/auth/email',
          builder: (_, __) => const LiveEmailAuthScreen(),
        ),
        GoRoute(
          path: '/app/auth/whatsapp',
          builder: (_, __) => const LiveWhatsAppOtpScreenV2(),
        ),
        ShellRoute(
          builder: (_, state, child) =>
              LiveProductionShell(path: state.uri.path, child: child),
          routes: [
            GoRoute(
              path: '/app/chat',
              builder: (_, __) => const LiveInboxProductionScreen(),
            ),
            GoRoute(
              path: '/app/chat/waouh',
              builder: (_, __) => const LiveMainChatScreen(),
            ),
            GoRoute(
              path: '/app/chat/match/:key',
              builder: (_, state) => LiveMatchChatV2(
                matchKey: state.pathParameters['key']!,
                initial: state.extra as LiveMatch?,
              ),
            ),
            GoRoute(
              path: '/app/chat/:id',
              builder: (_, state) => LiveConversationScreen(
                conversationId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/app/notifications',
              builder: (_, __) => const LiveNotificationsScreenV2(),
            ),
            GoRoute(
              path: '/app/ia',
              builder: (_, __) => const LiveIaFinalHubScreen(),
            ),
            GoRoute(
              path: '/app/bots',
              builder: (_, __) => const LiveBotsModulesHubScreen(),
            ),
            GoRoute(
              path: '/app/apresbac',
              builder: (_, __) => LiveApresBacIaScreen(client: legacy.supabase),
            ),
            GoRoute(
                path: '/app/fa-ia', builder: (_, __) => const FaIaHomeScreen()),
            GoRoute(
              path: '/app/radar-map',
              builder: (_, __) => const LiveRadarMapScreen(),
            ),
            // WAOUH_V9_COMPATIBILITY_ROUTES
            GoRoute(
              path: '/app/whatsapp/conversationnel',
              builder: (_, __) => const LiveWhatsAppIaNativeScreen(),
            ),
            GoRoute(
              path: '/app/whatsapp/bi',
              builder: (_, __) => const WaouhBiWorkspaceScreen(),
            ),
            GoRoute(
              path: '/app/whatsapp/select-agent',
              builder: (_, state) => LiveIaAgentSelectorScreen(
                client: legacy.supabase,
                purpose: LiveIaAgentSelectionPurpose.fromRouteParameter(
                  state.uri.queryParameters['purpose'],
                ),
              ),
            ),
            GoRoute(
              path: '/app/whatsapp/agent/:agentId/insights',
              builder: (_, state) => WaouhAgentInsightsScreen(
                client: legacy.supabase,
                agentId: state.pathParameters['agentId']!,
                agentName: state.uri.queryParameters['name'] ?? 'Agent IA',
              ),
            ),
            GoRoute(
              path: '/app/whatsapp/agent/:agentId/catalogue',
              builder: (_, state) => WaouhAgentCatalogScreen(
                client: legacy.supabase,
                agentId: state.pathParameters['agentId']!,
              ),
            ),
            GoRoute(
              path: '/app/stock',
              builder: (_, __) =>
                  WaouhStockDashboardScreen(client: legacy.supabase),
            ),
            GoRoute(
              path: '/app/presence',
              builder: (_, __) =>
                  WaouhPresenceDashboardScreen(client: legacy.supabase),
            ),
            GoRoute(
              path: '/app/whatsapp',
              builder: (_, __) => const LiveWhatsAppIaNativeScreen(),
            ),
            GoRoute(
              path: '/app/presence/checkin',
              builder: (_, state) => WaouhPresenceCheckInScreen(
                client: legacy.supabase,
                initialAction:
                    state.uri.queryParameters['action'] == 'check_out'
                        ? WaouhPresenceAction.departure
                        : WaouhPresenceAction.arrival,
              ),
            ),
            GoRoute(
              path: '/app/diffusion',
              builder: (_, __) => const LiveBroadcastScreen(),
            ),
            GoRoute(
              path: '/app/partner',
              redirect: (_, __) => '/app/partner/businesses',
            ),
            GoRoute(
              path: '/app/partner/businesses',
              builder: (_, __) => const LivePartnerBusinessesScreenV3(),
            ),
            GoRoute(
              path: '/app/partner/businesses/:businessId/products',
              builder: (_, state) => LivePartnerProductsScreenV2(
                businessId: state.pathParameters['businessId']!,
              ),
            ),
            GoRoute(
              path: '/app/profile',
              builder: (_, __) => const LiveProfileScreenV2(),
            ),
          ],
        ),
      ],
    );

class LiveProductionShell extends StatelessWidget {
  const LiveProductionShell({
    super.key,
    required this.path,
    required this.child,
  });
  final String path;
  final Widget child;

  int get _index {
    // WAOUH_CONVERSATIONNEL_IA_INDEX_START

    if (path.startsWith('/app/whatsapp/conversationnel')) {
      return 2;
    }

    // WAOUH_CONVERSATIONNEL_IA_INDEX_END

    if (path.startsWith('/app/ia')) return 1;
    if (path.startsWith('/app/ia') ||
        path.startsWith('/app/whatsapp') ||
        path.startsWith('/app/apresbac') ||
        path.startsWith('/app/fa-ia') ||
        path.startsWith('/app/radar-map') ||
        path.startsWith('/app/stock') ||
        path.startsWith('/app/presence')) {
      return 2;
    }
    if (path.startsWith('/app/diffusion')) return 3;
    if (path.startsWith('/app/partner')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    if (path == '/app/chat/waouh' && controller is LiveWaouhControllerV2) {
      final immediate = controller.takeImmediateMatch();
      if (immediate != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!context.mounted) return;
          context.go(
            '/app/chat/match/${Uri.encodeComponent(immediate.key)}',
            extra: immediate,
          );
        });
      }
    }
    final focused = path.startsWith('/app/chat/') ||
        path.startsWith('/app/profile') ||
        path.startsWith('/app/partner/businesses/');
    return Scaffold(
      body: Column(
        children: [
          const LiveOfflineBanner(),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: focused
          ? null
          : NavigationBar(
              selectedIndex: _index,
              onDestinationSelected: (index) => context.go(switch (index) {
                1 => '/app/ia',
                2 => '/app/whatsapp/conversationnel',
                3 => '/app/diffusion',
                4 => '/app/partner',
                _ => '/app/chat',
              }),
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.chat_bubble_outline),
                  label: 'Chat',
                ),
                NavigationDestination(
                  icon: Icon(Icons.smart_toy_outlined),
                  label: 'Bots',
                ),
                NavigationDestination(
                  icon: Icon(Icons.auto_awesome_outlined),
                  label: 'IA',
                ),
                NavigationDestination(
                  icon: Icon(Icons.campaign_outlined),
                  label: 'Diffusion',
                ),
                NavigationDestination(
                  icon: Icon(Icons.storefront_outlined),
                  label: 'Partenaire',
                ),
              ],
            ),
    );
  }
}
