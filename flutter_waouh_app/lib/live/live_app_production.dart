import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'access_policy.dart';
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_agent_type_picker.dart';
import 'live_auth_screens.dart';
import 'live_broadcast_screen.dart';
import 'live_avatar_banner.dart';
import 'live_avatar_screen.dart';
import 'live_avatar_commerce_screen.dart';
import 'live_controller.dart';
import 'live_controller_v2.dart';
import 'live_inbox_production.dart';
import 'live_match_chat_v2.dart';
import 'live_error_fallback.dart';
import 'live_frontend_modules.dart';
import 'live_guardian.dart';
import 'live_menu_sheet.dart';
import 'live_models.dart';
import 'live_missions_screen.dart';
import 'live_premium_journey_screen.dart';
import 'live_nexus_screen.dart';
import 'live_notifications_screen_v2.dart';
import 'live_onboarding.dart';
import 'live_partner_home.dart';
import 'live_partner_money.dart';
import 'live_offline_banner.dart';
import 'live_partner_businesses_v3.dart';
import 'live_partner_products_v2.dart';
import 'live_profile_screen_v2.dart';
import 'live_push_service.dart';
import 'live_screens.dart';
import 'live_whatsapp_auth.dart';
import 'live_whatsapp_ia_native_screen.dart';

import 'live_apresbac_ia_screen.dart';

import '../features/fa_ia/presentation/fa_ia_home_screen.dart';

import 'live_radar_map_screen.dart';

import '../business_modules/waouh_business_modules.dart'
    hide WaouhBiWorkspaceScreen;
import 'live_ia_agent_selector_screen.dart';
import 'waouh_bi_workspace_screen.dart';

import 'live_ia_final_hub_screen.dart';

LivePushService? _livePushService;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await legacy.initializeWaouhBackend();
  LiveGuardian.install(legacy.supabase);
  _livePushService = LivePushService(legacy.supabase);
  unawaited(_livePushService!.initialize());
  runApp(const LiveWaouhProductionApp());
}

class LiveWaouhProductionApp extends StatelessWidget {
  const LiveWaouhProductionApp({super.key});

  @override
  Widget build(BuildContext context) => MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => legacy.AuthController()),
      ChangeNotifierProvider(create: (_) => LiveAvatarController()..load()),
      ChangeNotifierProxyProvider<legacy.AuthController, LiveWaouhController>(
        create: (context) =>
            LiveWaouhControllerV2(context.read<legacy.AuthController>()),
        update: (_, auth, previous) => previous ?? LiveWaouhControllerV2(auth),
      ),
      ChangeNotifierProxyProvider<
        legacy.AuthController,
        legacy.WaouhChatController
      >(
        create: (context) =>
            legacy.WaouhChatController(context.read<legacy.AuthController>()),
        update: (_, auth, previous) =>
            previous ?? legacy.WaouhChatController(auth),
      ),
      ChangeNotifierProxyProvider<
        legacy.AuthController,
        legacy.StatusController
      >(
        create: (context) =>
            legacy.StatusController(context.read<legacy.AuthController>()),
        update: (_, auth, previous) =>
            previous ?? legacy.StatusController(auth),
      ),
      Provider(create: (_) => legacy.NotificationsController()),
      ChangeNotifierProxyProvider<
        legacy.AuthController,
        legacy.PartnerController
      >(
        create: (context) =>
            legacy.PartnerController(context.read<legacy.AuthController>()),
        update: (_, auth, previous) =>
            previous ?? legacy.PartnerController(auth),
      ),
      ChangeNotifierProxyProvider<
        legacy.AuthController,
        FrontendModulesController
      >(
        create: (context) =>
            FrontendModulesController(context.read<legacy.AuthController>()),
        update: (_, auth, previous) =>
            previous ?? FrontendModulesController(auth),
      ),
    ],
    child: Builder(
      builder: (context) {
        final router = _router(context.read<legacy.AuthController>());
        LivePushService.onOpenRoute = (route) => router.go(route);
        final liveController = context.read<LiveWaouhController>();
        LivePushService.onQuickReply = (text, ctx) {
          final about = '${ctx['body'] ?? ctx['title'] ?? ''}'.trim();
          return liveController.sendMain(
            text: about.isEmpty ? text : 'Réponse à « $about » : $text',
            meta: <String, dynamic>{
              'origin_surface': 'notification_quick_reply',
              if ('${ctx['notification_id'] ?? ''}'.isNotEmpty)
                'notification_id': '${ctx['notification_id']}',
              if ('${ctx['journey_id'] ?? ''}'.isNotEmpty)
                'journey_id': '${ctx['journey_id']}',
            },
          );
        };
        ErrorWidget.builder = (details) => const LiveErrorFallback();
        return MaterialApp.router(
          title: 'WaouhApp',
          debugShowCheckedModeBanner: false,
          theme: legacy.buildWaouhTheme(),
          routerConfig: router,
          builder: (context, child) => ListenableBuilder(
            listenable: router.routeInformationProvider,
            builder: (_, __) => LiveModuleAccessGate(
              path: router.routeInformationProvider.value.uri.path,
              onProfile: () => router.go('/app/profile'),
              child: LiveOnboardingGate(
                child: child ?? const SizedBox.shrink(),
              ),
            ),
          ),
        );
      },
    ),
  );
}

GoRouter _router(legacy.AuthController auth) => GoRouter(
  errorBuilder: (context, state) => LiveErrorFallback(
    onRetry: () => context.go(state.uri.toString()),
    onHome: () => context.go('/app/avatar'),
  ),
  initialLocation: '/app/avatar',
  refreshListenable: auth,
  redirect: (_, state) {
    final path = state.uri.path;
    final isAuthRoute = path.startsWith('/app/auth');
    if (!auth.signedIn && requiresWaouhAuthentication(path)) {
      return buildWaouhAuthRoute(state.uri.toString());
    }
    if (auth.signedIn && isAuthRoute) {
      return normalizeWaouhNextRoute(state.uri.queryParameters['next']);
    }
    return null;
  },
  routes: [
    GoRoute(path: '/', redirect: (_, __) => '/app/avatar'),
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
          path: '/app/avatar',
          builder: (_, __) => const LiveAvatarScreen(),
        ),
        GoRoute(
          path: '/app/avatar/acheter',
          builder: (_, state) => LiveAvatarCommerceScreen(
            mode: LiveAvatarCommerceMode.buy,
            initialQuery: state.uri.queryParameters['q'],
            initialCity: state.uri.queryParameters['city'],
            initialBudget: state.uri.queryParameters['budget'],
            autoLaunch: state.uri.queryParameters['go'] == '1',
          ),
        ),
        GoRoute(
          path: '/app/avatar/vendre',
          builder: (_, state) => LiveAvatarCommerceScreen(
            mode: LiveAvatarCommerceMode.sell,
            initialQuery: state.uri.queryParameters['q'],
            initialCity: state.uri.queryParameters['city'],
            initialBudget: state.uri.queryParameters['budget'],
            autoLaunch: state.uri.queryParameters['go'] == '1',
          ),
        ),
        GoRoute(
          path: '/app/avatar/demander',
          builder: (_, state) => LiveAvatarCommerceScreen(
            mode: LiveAvatarCommerceMode.ask,
            initialQuery: state.uri.queryParameters['q'],
            initialCity: state.uri.queryParameters['city'],
            initialBudget: state.uri.queryParameters['budget'],
            autoLaunch: state.uri.queryParameters['go'] == '1',
          ),
        ),
        GoRoute(path: '/app/muse', redirect: (_, __) => '/app/avatar'),
        GoRoute(path: '/app/premium', builder: (_, state) => LivePremiumJourneyScreen(missionId:state.uri.queryParameters['mission_id'],componentId:state.uri.queryParameters['component_id'])),
        GoRoute(
          path: '/app/missions',
          builder: (_, state) => LiveMissionsScreen(
            initialMandate: state.uri.queryParameters['mandate'],
            showAdvanced:
                state.uri.queryParameters['view'] == 'suivi' ||
                state.uri.queryParameters.containsKey('focus'),
          ),
        ),
        GoRoute(
          path: '/app/nexus',
          builder: (_, state) => LiveNexusScreen(
            initialQuery: state.uri.queryParameters['q'],
            initialCity: state.uri.queryParameters['city'],
            initialBudget: state.uri.queryParameters['budget'],
            initialMode: state.uri.queryParameters['mode'],
            initialKind: state.uri.queryParameters['kind'],
            initialArticleId: state.uri.queryParameters['article_id'],
            initialSaleDraft: state.uri.queryParameters['sale_draft'],
            autoLaunch: state.uri.queryParameters['go'] == '1',
          ),
        ),
        GoRoute(
          path: '/app/bots',
          builder: (_, __) => const LiveIaFinalHubScreen(bots: true),
        ),
        GoRoute(
          path: '/app/apresbac',
          builder: (_, __) => LiveApresBacIaScreen(client: legacy.supabase),
        ),
        GoRoute(path: '/app/fa-ia', builder: (_, __) => const FaIaHomeScreen()),
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
            initialAction: state.uri.queryParameters['action'] == 'check_out'
                ? WaouhPresenceAction.departure
                : WaouhPresenceAction.arrival,
          ),
        ),
        GoRoute(path: '/app/command', redirect: (_, __) => '/app/avatar'),
        GoRoute(
          path: '/app/diffusion',
          builder: (_, __) => const LiveBroadcastScreen(),
        ),
        GoRoute(
          path: '/app/agents',
          builder: (_, __) => const LiveIaFinalHubScreen(bots: true),
        ),
        GoRoute(
          path: '/app/agents/new',
          builder: (_, __) => const LiveAgentTypePickerScreen(),
        ),
        GoRoute(path: '/app/conversations', redirect: (_, __) => '/app/chat'),
        GoRoute(path: '/app/apres-bac', redirect: (_, __) => '/app/apresbac'),
        GoRoute(path: '/app/fa', redirect: (_, __) => '/app/fa-ia'),
        GoRoute(
          path: '/app/partner',
          builder: (_, __) => const LivePartnerHomeScreen(),
        ),
        GoRoute(
          path: '/app/partner/sales',
          builder: (_, __) =>
              const LivePartnerMoneyScreen(kind: LiveMoneyKind.sales),
        ),
        GoRoute(
          path: '/app/partner/payouts',
          builder: (_, __) =>
              const LivePartnerMoneyScreen(kind: LiveMoneyKind.payouts),
        ),
        GoRoute(
          path: '/app/partner/payments',
          builder: (_, __) =>
              const LivePartnerMoneyScreen(kind: LiveMoneyKind.payments),
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
    if (path.startsWith('/app/missions')) return 1;
    if (path.startsWith('/app/ia') ||
        path.startsWith('/app/bots') ||
        path.startsWith('/app/agents') ||
        path.startsWith('/app/whatsapp') ||
        path.startsWith('/app/apresbac') ||
        path.startsWith('/app/fa-ia') ||
        path.startsWith('/app/radar-map') ||
        path.startsWith('/app/stock') ||
        path.startsWith('/app/presence') ||
        path.startsWith('/app/diffusion')) {
      return 2;
    }
    if (path.startsWith('/app/avatar') ||
        path.startsWith('/app/command') ||
        path.startsWith('/app/muse') ||
        path.startsWith('/app/nexus')) {
      return 3;
    }
    if (path.startsWith('/app/partner')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final focused =
        path.startsWith('/app/chat/') ||
        path.startsWith('/app/profile') ||
        path.startsWith('/app/partner/businesses/');
    final waouh = context.watch<LiveWaouhController>();
    final showAvatarDock =
        !path.startsWith('/app/avatar') && !path.startsWith('/app/chat');
    return LiveAvatarBannerHost(
      events: liveAvatarNoticeFeed(legacy.supabase),
      // Sur le chat de l'avatar les bulles sont déjà visibles : pas de bannière en double.
      enabled: !path.startsWith('/app/chat/waouh'),
      onOpen: () => context.go('/app/chat/waouh'),
      child: Scaffold(
        body: Column(
          children: [
            const LiveOfflineBanner(),
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(child: child),
                  if (showAvatarDock)
                    Positioned(
                      right: 12,
                      bottom: focused ? 86 : 12,
                      child: LiveAvatarDock(
                        compact: focused,
                        missionCount: waouh.agentic.activeMissionCount,
                        watchCount: waouh.agentic.activeWatchCount,
                        approvalCount: waouh.agentic.pendingApprovalCount,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        bottomNavigationBar: focused
            ? null
            : SafeArea(
                top: false,
                minimum: const EdgeInsets.fromLTRB(10, 0, 10, 8),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFE3EAF5)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF42618F).withValues(alpha: .10),
                        blurRadius: 28,
                        offset: const Offset(0, 12),
                        spreadRadius: -8,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: StreamBuilder<List<LiveMatch>>(
                      stream: waouh.matches(),
                      builder: (context, snap) {
                        final unread = (snap.data ?? const <LiveMatch>[])
                            .fold<int>(0, (sum, m) => sum + m.unreadCount);
                        final signedIn = context
                            .read<legacy.AuthController>()
                            .signedIn;
                        Widget lockable(Widget icon, String route) =>
                            !signedIn && requiresWaouhAuthentication(route)
                            ? Badge(
                                backgroundColor: Colors.white,
                                label: const Icon(
                                  Icons.lock_rounded,
                                  size: 9,
                                  color: Color(0xFF475569),
                                ),
                                child: icon,
                              )
                            : icon;
                        final keys = context
                            .watch<FrontendModulesController>()
                            .visibleKeys;
                        final entries =
                            <
                                  ({
                                    String key,
                                    String route,
                                    String label,
                                    IconData icon,
                                  })
                                >[
                                  (
                                    key: 'chat',
                                    route: '/app/chat',
                                    label: 'Chat',
                                    icon: Icons.chat_bubble_outline_rounded,
                                  ),
                                  (
                                    key: 'missions',
                                    route: '/app/missions',
                                    label: 'Missions',
                                    icon: Icons.account_tree_outlined,
                                  ),
                                  (
                                    key: 'ia',
                                    route: '/app/ia',
                                    label: 'IA',
                                    icon: Icons.auto_awesome_outlined,
                                  ),
                                  (
                                    key: 'avatar',
                                    route: '/app/avatar',
                                    label: 'Avatar',
                                    icon: Icons.account_circle_outlined,
                                  ),
                                ]
                                .where((e) => keys.contains(e.key))
                                .toList();
                        void menu() => showLiveMenuSheet(
                          context,
                          signedIn: signedIn,
                          currentPath: path,
                          unreadChat: unread,
                        );
                        if (entries.isEmpty)
                          return TextButton.icon(
                            onPressed: menu,
                            icon: const Icon(Icons.menu_rounded),
                            label: const Text('Menu'),
                          );
                        final selected = entries.indexWhere(
                          (e) => e.key == moduleForPath(path),
                        );
                        return NavigationBar(
                          selectedIndex: selected < 0
                              ? entries.length
                              : selected,
                          onDestinationSelected: (i) {
                            if (i == entries.length) {
                              menu();
                              return;
                            }
                            context.go(entries[i].route);
                          },
                          destinations: [
                            for (final e in entries)
                              NavigationDestination(
                                icon: lockable(
                                  e.key == 'chat' && unread > 0
                                      ? Badge(
                                          label: Text(
                                            unread > 99 ? '99+' : '$unread',
                                          ),
                                          child: Icon(e.icon),
                                        )
                                      : Icon(e.icon),
                                  e.route,
                                ),
                                label: e.label,
                              ),
                            const NavigationDestination(
                              icon: Icon(Icons.menu_rounded),
                              label: 'Menu',
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}
