import 'dart:async';
import 'live_automatic_offers.dart';
import 'live_premium_mission.dart';
import 'live_avatar_autonomy.dart';
import 'live_essential_offers.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../main.dart' as legacy;
import 'avatar/live_avatar_controller.dart';
import 'live_controller.dart';
import 'live_nexus_service.dart';
import 'live_widgets.dart';
import 'avatar/bot_character.dart' show botAvatarAsset;
import 'live_theme.dart';
import 'live_guest_action_gate.dart';
import 'user_message.dart';
import 'live_hot_labels.dart';
import 'live_sell_photos.dart';

class LiveNexusScreen extends StatefulWidget {
  const LiveNexusScreen({
    super.key,
    this.initialQuery,
    this.initialCity,
    this.initialBudget,
    this.initialMode,
    this.initialKind,
    this.autoLaunch = false,
  });

  /// Préremplissage venant du formulaire express (parité Web `?q=&go=1`).
  final String? initialQuery;
  final String? initialCity;
  final String? initialBudget;

  /// Parité Web `?mode=` : 'find_sellers' (Acheter), 'find_buyers' (Vendre)
  /// ou 'auto' (Trouver/Demander). Ignoré si absent ou non reconnu.
  final String? initialMode;
  final String? initialKind;
  final bool autoLaunch;
  @override
  State<LiveNexusScreen> createState() => _LiveNexusScreenState();
}

class _LiveNexusScreenState extends State<LiveNexusScreen> {
  final query = TextEditingController();
  final city = TextEditingController();
  final budget = TextEditingController();
  final shareText = TextEditingController();
  final shareUrl = TextEditingController();
  final scoutTitle = TextEditingController();
  final scoutPrice = TextEditingController();
  final scoutCity = TextEditingController(text: 'Cotonou');
  final scoutPlace = TextEditingController();
  final scoutGtin = TextEditingController();

  late final LiveNexusService service;
  bool findSellers = true;
  List<String> sellPhotos = <String>[];
  String sellNotes = '';
  bool smartMode = true;
  bool busy = false;
  bool _started = false, _paused = false, _refreshing = false;
  int _searchVersion = 0;
  String? _liveError;
  String _kind = 'trouver';
  Map<String, dynamic>? _automatic;
  bool _automaticBusy = false;
  String? _automaticError;
  String _lastGoal = '', _lastCity = '', _priority = 'price';
  double? _lastBudget;
  StreamSubscription<dynamic>? _accountSubscription;
  String? _owner;
  String? _articleId;
  StateSetter? _activityUpdate;
  final List<LiveMissionActivity> _events = [];
  final Set<String> _selectedOffers = {};
  String shareOrigin = 'whatsapp';
  String? shareImageUrl;
  String? shareImageName;
  NexusSharedSignal? sharedSignal;
  NexusDiscoveryResponse? discovery;
  List<NexusSourceInfo> sources = const [];

  @override
  void initState() {
    super.initState();
    service = LiveNexusService(legacy.supabase);
    _owner = legacy.supabase.auth.currentUser?.id;
    _accountSubscription = legacy.supabase.auth.onAuthStateChange.listen((
      event,
    ) {
      final next = legacy.supabase.auth.currentUser?.id;
      if (next != _owner && mounted) {
        _owner = next;
        _searchVersion++;
        setState(() {
          discovery = null;
          _automatic = null;
          _automaticBusy = false;
          _automaticError = null;
          busy = false;
          _started = false;
        });
      }
    });
    _kind =
        widget.initialKind ??
        (widget.initialMode == 'find_buyers'
            ? 'vendre'
            : widget.initialMode == 'find_sellers'
            ? 'acheter'
            : 'trouver');
    query.text = widget.initialQuery ?? '';
    city.text = widget.initialCity ?? '';
    budget.text = widget.initialBudget ?? '';
    if (widget.initialMode == 'find_sellers') {
      smartMode = false;
      findSellers = true;
    } else if (widget.initialMode == 'find_buyers') {
      smartMode = false;
      findSellers = false;
    } else if (widget.initialMode == 'auto') {
      smartMode = true;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      loadSources();
      if (widget.autoLaunch && query.text.trim().isNotEmpty) runSearch();
    });
  }

  @override
  void dispose() {
    _searchVersion++;
    _accountSubscription?.cancel();
    for (final item in <TextEditingController>[
      query,
      city,
      budget,
      shareText,
      shareUrl,
      scoutTitle,
      scoutPrice,
      scoutCity,
      scoutPlace,
      scoutGtin,
    ]) {
      item.dispose();
    }
    super.dispose();
  }

  Future<void> loadSources() async {
    try {
      final value = await service.sources();
      if (!mounted) return;
      setState(() => sources = value);
    } catch (_) {}
  }

  Future<void> runSearch() async {
    final text = query.text.trim();
    if (text.isEmpty || busy) {
      if (text.isEmpty) notice('Décrivez votre besoin.');
      return;
    }
    final version = ++_searchVersion;
    final account = legacy.supabase.auth.currentUser?.id;
    setState(() {
      busy = true;
      _started = true;
      _paused = false;
      _refreshing = false;
      _liveError = null;
      discovery = null;
      _automatic = null;
      _automaticError = null;
      _automaticBusy = false;
      _articleId = null;
      _lastGoal = text;
      _lastCity = city.text.trim();
      _lastBudget = double.tryParse(budget.text.replaceAll(RegExp(r'\D'), ''));
      _events
        ..clear()
        ..add(LiveMissionActivity('Recherche lancée selon votre besoin.'));
    });
    Map<String, dynamic>? rules;
    try {
      if (account != null) {
        try {
          rules = await loadLiveAvatarAutonomy();
        } catch (_) {}
      }
      if (!mounted ||
          version != _searchVersion ||
          account != legacy.supabase.auth.currentUser?.id)
        return;
      final cap = rules?['budget_max'];
      if (cap is num)
        _lastBudget = _lastBudget == null
            ? cap.toDouble()
            : (_lastBudget! < cap ? _lastBudget : cap.toDouble());
      if (_lastCity.isEmpty) _lastCity = '${rules?['city'] ?? ''}';
      final value = await service.searchProgressive(
        query: text,
        findSellers: findSellers,
        smartMode: smartMode,
        city: _lastCity,
        budgetMax: findSellers ? _lastBudget : null,
        refreshExternal: account != null,
        onIndexed: (indexed) {
          if (!mounted ||
              version != _searchVersion ||
              account != legacy.supabase.auth.currentUser?.id)
            return;
          setState(() {
            discovery = indexed;
            findSellers = indexed.findSellers;
            _refreshing = account != null;
            _events.add(
              LiveMissionActivity(
                indexed.results.isEmpty
                    ? 'Recherche de nouvelles pistes.'
                    : '${indexed.results.length} premières offres reçues.',
              ),
            );
          });
          _activityUpdate?.call(() {});
        },
      );
      if (!mounted ||
          version != _searchVersion ||
          account != legacy.supabase.auth.currentUser?.id)
        return;
      setState(() {
        discovery = value;
        findSellers = value.findSellers;
        _lastCity = _lastCity.isNotEmpty
            ? _lastCity
            : value.intelligence?.city ?? '';
        _lastBudget = _lastBudget ?? value.intelligence?.budgetMax;
        if (cap is num && _lastBudget != null && _lastBudget! > cap)
          _lastBudget = cap.toDouble();
        if (!findSellers) _lastBudget = null;
        _events.add(
          LiveMissionActivity(
            value.results.isEmpty
                ? 'Aucune piste compatible pour le moment.'
                : '${value.results.length} offres reçues. Comparaison mise à jour.',
          ),
        );
      });
      _activityUpdate?.call(() {});
      if (account != null) unawaited(_follow(version));
    } catch (_) {
      if (mounted && version == _searchVersion)
        setState(() {
          _liveError = 'Recherche interrompue. Réessayez.';
          _events.add(
            LiveMissionActivity(
              'Recherche interrompue. Les premières pistes restent accessibles.',
            ),
          );
        });
    } finally {
      if (mounted && version == _searchVersion) setState(() => busy = false);
      _activityUpdate?.call(() {});
    }
  }

  Future<void> _follow(int version) async {
    final account = legacy.supabase.auth.currentUser?.id;
    if (account == null || _automaticBusy || _lastGoal.isEmpty) return;
    final sentPriority = _priority;
    setState(() {
      _automaticBusy = true;
      _automaticError = null;
    });
    try {
      final data = await service.followSearch(
        goal: _lastGoal,
        mode: findSellers ? (_kind == 'demander' ? 'ask' : 'buy') : 'sell',
        city: _lastCity,
        budgetMax: _lastBudget,
        priority: _priority,
        articleId: _articleId,
      );
      if (!mounted ||
          version != _searchVersion ||
          account != legacy.supabase.auth.currentUser?.id)
        return;
      setState(() {
        _automatic = data;
        final m = data['mandate'];
        if (m is Map) {
          if (m['budget_max'] is num)
            _lastBudget = (m['budget_max'] as num).toDouble();
          _events.add(
            LiveMissionActivity(
              m['status'] == 'paused'
                  ? 'Le suivi de cette mission est en pause.'
                  : 'Le suivi de Bot est enregistré.',
            ),
          );
        }
      });
    } catch (_) {
      if (mounted &&
          version == _searchVersion &&
          account == legacy.supabase.auth.currentUser?.id)
        setState(() => _automaticError = 'Suivi indisponible. Réessayez.');
    } finally {
      if (mounted &&
          version == _searchVersion &&
          account == legacy.supabase.auth.currentUser?.id)
        setState(() => _automaticBusy = false);
      _activityUpdate?.call(() {});
      if (mounted && version == _searchVersion && sentPriority != _priority)
        unawaited(_follow(version));
    }
  }

  String get _automaticLabel => busy
      ? 'Recherche en cours…'
      : _automaticBusy
      ? 'Préparation du suivi…'
      : _automatic?['mandate'] is Map
      ? 'Suivre Bot'
      : _automaticError != null
      ? 'Réessayer le suivi'
      : _automatic?['skipped'] == 'paused'
      ? 'Réactiver Bot'
      : _automatic?['skipped'] == 'approval_required'
      ? 'Choisir cette piste'
      : _automatic?['skipped'] == 'article_required'
      ? 'Choisir mon article'
      : legacy.supabase.auth.currentUser == null
      ? 'Connexion pour le suivi'
      : 'Confier cette recherche';
  String? get _tracking =>
      _automaticError ??
      (_automatic?['skipped'] == 'paused'
          ? 'Bot est en pause.'
          : _automatic?['skipped'] == 'article_required'
          ? 'Sélectionnez l’article à vendre pour activer le suivi.'
          : _automatic?['skipped'] == 'approval_required'
          ? 'Votre mode actuel demande une validation des actions.'
          : _automatic?['mandate'] is Map
          ? 'Bot poursuit la mission selon vos règles.'
          : null);
  Future<void> _automaticAction() async {
    if (busy || _automaticBusy) return;
    final m = _automatic?['mandate'];
    if (m is Map) {
      context.push('/app/missions?mandate=${m['id']}');
      return;
    }
    if (legacy.supabase.auth.currentUser == null) {
      await requireLiveAuthentication(
        context,
        next:
            '/app/nexus?${Uri(queryParameters: {'q': _lastGoal, 'go': '1', 'mode': findSellers ? 'find_sellers' : 'find_buyers'}).query}',
        actionLabel: 'suivre cette recherche',
      );
      return;
    }
    if (_automatic?['skipped'] == 'paused') {
      context.push('/app/avatar');
      return;
    }
    if (_automatic?['skipped'] == 'article_required') {
      await _chooseArticle();
      return;
    }
    if (_automatic?['skipped'] == 'approval_required') {
      context.push('/app/missions?view=suivi');
      return;
    }
    await _follow(_searchVersion);
  }

  Future<void> _chooseArticle() async {
    try {
      final data = await service.ownedArticles();
      if (!mounted) return;
      final raw = data['articles'];
      final rows = raw is List ? raw.whereType<Map>().toList() : <Map>[];
      final id = await showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        showDragHandle: true,
        backgroundColor: Colors.white,
        builder: (ctx) => SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 0, 22, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Mon article à vendre',
                style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 16),
              if (rows.isEmpty)
                const Text(
                  'Publiez d’abord votre article dans votre espace de vente.',
                  style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
                ),
              for (final a in rows)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    '${a['title'] ?? 'Article'}',
                    style: const TextStyle(fontSize: 14),
                  ),
                  trailing: const Icon(Icons.chevron_right, size: 17),
                  onTap: () => Navigator.pop(ctx, '${a['id']}'),
                ),
            ],
          ),
        ),
      );
      if (id != null && mounted) {
        setState(() => _articleId = id);
        await _follow(_searchVersion);
      }
    } catch (_) {
      if (mounted) notice('Chargement impossible. Réessayez.');
    }
  }

  Future<void> _activity() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, update) {
          _activityUpdate = update;
          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(22, 0, 22, 24),
            child: LivePremiumMission(
              busy: busy,
              paused: _paused,
              refreshing: _refreshing,
              error: _liveError,
              count: discovery?.results.length ?? 0,
              events: List.of(_events),
              onPause: () {
                _searchVersion++;
                setState(() {
                  busy = false;
                  _paused = true;
                  _events.add(LiveMissionActivity('Recherche mise en pause.'));
                });
                Navigator.pop(ctx);
              },
              onResume: () {
                Navigator.pop(ctx);
                runSearch();
              },
            ),
          );
        },
      ),
    );
    _activityUpdate = null;
  }

  Future<void> recognizeProduct() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/nexus',
      actionLabel: 'analyser une photo avec NEXUS',
    ))
      return;
    final file = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 82,
      maxWidth: 1800,
    );
    if (file == null) return;
    setState(() => busy = true);
    try {
      final url = await service.uploadSharedImage(file);
      final recognized = await service.identifyVisual(imageUrl: url);
      if (!mounted) return;
      setState(() {
        findSellers = true;
        query.text = recognized;
      });
      await runSearch();
    } catch (error) {
      if (mounted) notice(errorText(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> scanBarcode() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/nexus',
      actionLabel: 'analyser un code-barres avec NEXUS',
    ))
      return;
    final code = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _BarcodeScannerSheet(),
    );
    if (code == null || code.trim().isEmpty) return;
    setState(() => busy = true);
    try {
      final recognized = await service.lookupBarcode(code);
      if (!mounted) return;
      setState(() {
        findSellers = true;
        query.text = recognized;
      });
      await runSearch();
    } catch (error) {
      if (mounted) notice(errorText(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> startBuyerAutopilot() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/missions',
      actionLabel: 'confier la recherche à votre Avatar',
    ))
      return;
    final goal = query.text.trim();
    if (goal.isEmpty) {
      notice('Lancez d’abord une recherche.');
      return;
    }
    setState(() => busy = true);
    try {
      final maxBudget = double.tryParse(
        budget.text.replaceAll(RegExp(r'\D'), ''),
      );
      final rules = await loadLiveAvatarAutonomy();
      await service.createMandate(
        mode: findSellers ? 'buy' : 'sell',
        goal: goal,
        autonomyMode: '${rules['mode']}',
        city: city.text.trim(),
        budgetMax: maxBudget,
        maxContacts: (rules['max_contacts'] as num).toInt(),
        maxFollowups: (rules['max_followups'] as num).toInt(),
        durationHours: (rules['duration_hours'] as num).toInt(),
        scanIntervalMinutes: (rules['scan_interval_minutes'] as num).toInt(),
        allowWhatsapp: rules['allow_whatsapp'] == true,
        photos: findSellers ? const <String>[] : sellPhotos,
        articleNotes: findSellers ? '' : sellNotes,
      );
      if (!mounted) return;
      notice('Votre mission est enregistrée selon vos règles.', success: true);
      context.read<LiveAvatarController>().showState(
        LiveAvatarPresenceState.watching,
        duration: const Duration(seconds: 4),
      );
      final userId = legacy.supabase.auth.currentUser?.id;
      if (userId != null && mounted) {
        await context.read<LiveWaouhController>().agentic.initialize(userId);
      }
    } catch (error) {
      if (mounted) notice(errorText(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> pickShareImage() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/nexus',
      actionLabel: 'ajouter une capture à NEXUS',
    ))
      return;
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 84,
      maxWidth: 1800,
    );
    if (file == null) return;
    setState(() {
      busy = true;
      shareImageName = file.name;
    });
    try {
      final url = await service.uploadSharedImage(file);
      if (!mounted) return;
      setState(() => shareImageUrl = url);
      notice('Capture prête pour WAOUH Vision.', success: true);
    } catch (error) {
      if (mounted) notice(errorText(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> ingestShared() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/nexus',
      actionLabel: 'ajouter un signal au réseau NEXUS',
    ))
      return;
    if (shareText.text.trim().isEmpty &&
        shareUrl.text.trim().isEmpty &&
        (shareImageUrl?.isEmpty ?? true)) {
      notice('Ajoutez un message, un lien ou une image.');
      return;
    }
    setState(() => busy = true);
    try {
      final signal = await service.ingestShared(
        text: shareText.text,
        sourceUrl: shareUrl.text,
        imageUrl: shareImageUrl,
        originSurface: shareOrigin,
        b2b: shareOrigin == 'b2b',
      );
      if (!mounted) return;
      setState(() {
        sharedSignal = signal;
        shareText.clear();
        shareUrl.clear();
        shareImageUrl = null;
        shareImageName = null;
      });
      notice('Signal compris et ajouté au réseau WAOUH.', success: true);
      loadSources();
    } catch (error) {
      if (mounted) notice(errorText(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> submitScout() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/nexus',
      actionLabel: 'contribuer au réseau de prix NEXUS',
    ))
      return;
    final title = scoutTitle.text.trim();
    if (title.isEmpty) {
      notice('Indiquez le produit observé.');
      return;
    }
    setState(() => busy = true);
    try {
      final price = double.tryParse(
        scoutPrice.text.replaceAll(RegExp(r'\D'), ''),
      );
      await service.submitScout(
        title: title,
        observedPrice: price,
        city: scoutCity.text.trim(),
        placeName: scoutPlace.text.trim(),
        gtin: scoutGtin.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        scoutTitle.clear();
        scoutPrice.clear();
        scoutPlace.clear();
        scoutGtin.clear();
      });
      notice('Observation terrain enregistrée.', success: true);
    } catch (error) {
      if (mounted) notice(errorText(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> prepareContact(NexusDiscoveryItem item) async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/nexus',
      actionLabel: 'contacter cette opportunité',
    ))
      return;
    setState(() => busy = true);
    try {
      final contact = await service.prepareContact(item.fabricId);
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (_) =>
            _ContactSheet(service: service, item: item, contact: contact),
      );
    } catch (error) {
      if (mounted) notice(errorText(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void notice(String text, {bool success = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: success ? const Color(0xFF08745D) : null,
        content: Text(text),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        backgroundColor: WaouhPalette.pearl,
        appBar: AppBar(
          backgroundColor: avatarPremiumBg,
          leading: IconButton(
            tooltip: 'Retour aux missions',
            onPressed: () =>
                context.canPop() ? context.pop() : context.go('/app/missions'),
            icon: const Icon(Icons.arrow_back, size: 20),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _started ? _lastGoal : 'Ma recherche',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -.5,
                ),
              ),
              if (_started)
                Text(
                  '${_lastCity.isEmpty ? 'Zone à préciser' : _lastCity}${_lastBudget != null ? ' · ${_lastBudget!.round()} F max' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    color: avatarPremiumMuted,
                  ),
                ),
            ],
          ),
          actions: [
            Builder(
              builder: (tabs) => PopupMenuButton<int>(
                tooltip: 'Mes outils de recherche',
                onSelected: (index) {
                  if (index == 4) {
                    context.push('/app/avatar');
                    return;
                  }
                  DefaultTabController.of(tabs).animateTo(index);
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 0, child: Text('Ma recherche')),
                  PopupMenuItem(value: 1, child: Text('Partager')),
                  PopupMenuItem(value: 2, child: Text('Terrain')),
                  PopupMenuItem(value: 3, child: Text('Sources')),
                  PopupMenuItem(value: 4, child: Text('Mon avatar')),
                ],
              ),
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: TabBarView(
                children: [
                  buildSearch(),
                  auth.signedIn
                      ? buildShare()
                      : const _GuestLockedNexusPane(
                          title: 'Partager à WAOUH',
                          description:
                              'Connectez-vous pour analyser et ajouter un signal personnel à votre réseau.',
                        ),
                  auth.signedIn
                      ? buildScout()
                      : const _GuestLockedNexusPane(
                          title: 'Scout terrain',
                          description:
                              'Connectez-vous pour contribuer au réseau de prix et publier une observation.',
                        ),
                  buildSources(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _searchEditor() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Wrap(
        spacing: 8,
        children: [
          ChoiceChip(
            avatar: const Icon(Icons.auto_awesome_rounded, size: 16),
            label: const Text('IA'),
            selected: smartMode,
            onSelected: busy
                ? null
                : (_) => setState(() {
                    smartMode = true;
                    discovery = null;
                  }),
          ),
          ChoiceChip(
            avatar: const Icon(Icons.storefront_outlined, size: 16),
            label: const Text('Acheter'),
            selected: !smartMode && findSellers,
            onSelected: busy
                ? null
                : (_) => setState(() {
                    smartMode = false;
                    findSellers = true;
                    discovery = null;
                  }),
          ),
          ChoiceChip(
            avatar: const Icon(Icons.groups_2_outlined, size: 16),
            label: const Text('Vendre'),
            selected: !smartMode && !findSellers,
            onSelected: busy
                ? null
                : (_) => setState(() {
                    smartMode = false;
                    findSellers = false;
                    discovery = null;
                  }),
          ),
        ],
      ),
      const SizedBox(height: 10),
      TextField(
        controller: query,
        maxLines: 3,
        minLines: 1,
        textInputAction: TextInputAction.search,
        onSubmitted: (_) => runSearch(),
        decoration: InputDecoration(
          hintText: smartMode
              ? 'Décrivez simplement votre besoin'
              : findSellers
              ? 'Que voulez-vous acheter ?'
              : 'Que voulez-vous vendre ?',
          prefixIcon: const Icon(Icons.auto_awesome_rounded),
        ),
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          Expanded(
            child: TextField(
              controller: city,
              decoration: const InputDecoration(
                labelText: 'Ville / zone',
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
            ),
          ),
          if (findSellers || smartMode) ...[
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: budget,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Budget max',
                  suffixText: 'F',
                ),
              ),
            ),
          ],
        ],
      ),
      if (!smartMode && !findSellers) ...[
        LiveSellPhotos(
          service: service,
          photos: sellPhotos,
          onChanged: (v) => setState(() => sellPhotos = v),
          onNotes: (v) => sellNotes = v,
        ),
        if (sellPhotos.isNotEmpty)
          LiveMyArticleCard(
            title: query.text.trim(),
            photos: sellPhotos,
            notes: sellNotes,
            city: city.text,
          ),
      ],
      const SizedBox(height: 8),
      ExpansionTile(
        tilePadding: EdgeInsets.zero,
        title: const Text(
          'Photo ou code-barres',
          style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
        ),
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: busy ? null : recognizeProduct,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Photo'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: busy ? null : scanBarcode,
                  icon: const Icon(Icons.qr_code_scanner_rounded),
                  label: const Text('Code-barres'),
                ),
              ),
            ],
          ),
        ],
      ),
      const SizedBox(height: 8),
      FilledButton.icon(
        onPressed: busy ? null : runSearch,
        icon: Icon(
          smartMode
              ? Icons.auto_awesome_rounded
              : findSellers
              ? Icons.travel_explore_rounded
              : Icons.person_search_rounded,
        ),
        label: Text(
          smartMode
              ? 'Confier à Bot'
              : findSellers
              ? 'Confier à Bot'
              : 'Confier à Bot',
        ),
      ),
    ],
  );
  Future<void> _delegateOne(NexusDiscoveryItem item) async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/nexus',
      actionLabel: 'confier cette piste à Bot',
    ))
      return;
    if (!mounted) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confier à Bot'),
        content: const Text(
          'Bot prépare le contact avec ce profil. Vous validez l’accord final.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      String? article;
      if (!findSellers) {
        final data = await service.ownedArticles();
        final raw = data['articles'];
        final rows = raw is List ? raw.whereType<Map>().toList() : <Map>[];
        if (rows.length != 1) {
          notice(
            rows.isEmpty
                ? 'Publiez d’abord votre article.'
                : 'Choisissez l’article dans votre parcours de vente.',
          );
          return;
        }
        article = '${rows.first['id']}';
      }
      final data = await service.createMandate(
        mode: findSellers ? 'buy' : 'sell',
        goal: item.title,
        articleId: article,
        maxContacts: 1,
        allowWhatsapp: item.bestChannel == 'whatsapp',
      );
      final mandate = data['mandate'];
      await service.startOpportunity(
        fabricId: item.fabricId,
        mode: findSellers ? 'buy' : 'sell',
        mandateId: mandate is Map ? '${mandate['id']}' : null,
      );
      if (mounted) {
        notice(
          'Bot s’en occupe. Retrouvez le suivi dans Missions.',
          success: true,
        );
        context.push('/app/missions');
      }
    } catch (_) {
      if (mounted) notice('Enregistrement impossible. Réessayez.');
    }
  }

  Future<void> _watchOne(NexusDiscoveryItem item) async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/nexus',
      actionLabel: 'suivre cette offre',
    ))
      return;
    try {
      await service.createWatch(
        query: item.title,
        sourceUrl: item.sourceUrl,
        targetAmount: item.priceMin ?? item.priceMax,
      );
      if (mounted) notice('Suivi enregistré.', success: true);
    } catch (_) {
      if (mounted) notice('Enregistrement impossible. Réessayez.');
    }
  }

  Widget buildSearch() {
    final results = discovery?.results ?? const <NexusDiscoveryItem>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(22, 8, 22, 32),
      children: [
        if (!_started) ...[
          Row(
            children: [
              for (final k in [
                ('acheter', 'Acheter'),
                ('vendre', 'Vendre'),
                ('trouver', 'Trouver'),
                ('demander', 'Demander'),
              ])
                Expanded(
                  child: TextButton(
                    onPressed: busy
                        ? null
                        : () => setState(() {
                            _kind = k.$1;
                            smartMode = ['trouver', 'demander'].contains(_kind);
                            findSellers = _kind != 'vendre';
                            discovery = null;
                          }),
                    child: Text(
                      k.$2,
                      style: TextStyle(
                        fontSize: 12,
                        color: _kind == k.$1
                            ? avatarPremiumBlue
                            : avatarPremiumMuted,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          _searchEditor(),
        ] else ...[
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: const Text(
              'Modifier mon besoin',
              style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
            ),
            children: [_searchEditor()],
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _activity,
              icon: const Icon(Icons.checklist, size: 15),
              label: Text(
                busy ? 'Recherche en cours…' : 'Activité de Bot',
                style: const TextStyle(fontSize: 12),
              ),
            ),
          ),
        ],
        if (_liveError != null)
          Text(
            _liveError!,
            style: const TextStyle(fontSize: 12, color: Colors.red),
          ),
        if (_started && results.isEmpty && !busy)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 25),
            child: Column(
              children: [
                Text(
                  _paused
                      ? 'Recherche en pause'
                      : 'Aucune piste pour le moment',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _tracking ?? 'Ajustez votre besoin ou relancez la recherche.',
                  style: const TextStyle(
                    fontSize: 12,
                    color: avatarPremiumMuted,
                  ),
                ),
                TextButton(
                  onPressed: _automatic?['mandate'] is Map
                      ? _automaticAction
                      : runSearch,
                  child: Text(
                    _automatic?['mandate'] is Map ? 'Suivre Bot' : 'Réessayer',
                  ),
                ),
              ],
            ),
          ),
        if (results.isNotEmpty)
          LiveAutomaticOffers(
            items: results,
            query: _lastGoal,
            city: _lastCity,
            budget: _lastBudget,
            mode: findSellers ? 'buy' : 'sell',
            actionLabel: _automaticLabel,
            tracking: _tracking,
            actionBusy: busy || _automaticBusy,
            onAction: _automaticAction,
            onContact: prepareContact,
            onDelegate: _delegateOne,
            onFollow: _watchOne,
            onPriorityChanged: (v) {
              setState(() => _priority = v);
              if (!busy) unawaited(_follow(_searchVersion));
            },
          ),
      ],
    );
  }

  Widget buildShare() => ListView(
    padding: const EdgeInsets.fromLTRB(14, 8, 14, 120),
    children: [
      const _InfoCard(
        icon: Icons.share_rounded,
        title: 'Partager vers WAOUH',
        text:
            'Collez un message WhatsApp, une annonce sociale, un lien Web ou une RFQ. Ajoutez une capture si besoin.',
      ),
      const SizedBox(height: 10),
      DropdownButtonFormField<String>(
        value: shareOrigin,
        decoration: const InputDecoration(labelText: 'Origine'),
        items: const [
          DropdownMenuItem(value: 'whatsapp', child: Text('WhatsApp')),
          DropdownMenuItem(value: 'facebook', child: Text('Facebook')),
          DropdownMenuItem(value: 'instagram', child: Text('Instagram')),
          DropdownMenuItem(value: 'tiktok', child: Text('TikTok')),
          DropdownMenuItem(value: 'telegram', child: Text('Telegram')),
          DropdownMenuItem(value: 'web', child: Text('Site / annonce Web')),
          DropdownMenuItem(value: 'b2b', child: Text('B2B / RFQ')),
          DropdownMenuItem(value: 'other', child: Text('Autre')),
        ],
        onChanged: (value) => setState(() => shareOrigin = value ?? 'whatsapp'),
      ),
      const SizedBox(height: 8),
      TextField(
        controller: shareUrl,
        decoration: const InputDecoration(
          labelText: 'Lien source',
          hintText: 'Optionnel',
          prefixIcon: Icon(Icons.link_rounded),
        ),
      ),
      const SizedBox(height: 8),
      TextField(
        controller: shareText,
        minLines: 4,
        maxLines: 8,
        decoration: const InputDecoration(labelText: 'Message / annonce'),
      ),
      const SizedBox(height: 8),
      OutlinedButton.icon(
        onPressed: busy ? null : pickShareImage,
        icon: const Icon(Icons.image_search_rounded),
        label: Text(
          shareImageName == null
              ? 'Ajouter une capture'
              : 'Capture : ' + shareImageName!,
        ),
      ),
      const SizedBox(height: 8),
      FilledButton.icon(
        onPressed: busy ? null : ingestShared,
        icon: const Icon(Icons.auto_awesome_rounded),
        label: const Text('Comprendre et ajouter au réseau'),
      ),
      if (sharedSignal != null) ...[
        const SizedBox(height: 12),
        _InfoCard(
          icon: Icons.check_circle_outline,
          title:
              sharedSignal!.intent +
              ' · ' +
              (sharedSignal!.productName ?? sharedSignal!.category ?? 'Signal'),
          text:
              'Acteur ' +
              sharedSignal!.actorType +
              ' · confiance ' +
              (sharedSignal!.confidence * 100).round().toString() +
              '% · contact ' +
              sharedSignal!.contactability,
        ),
      ],
    ],
  );

  Widget buildScout() => ListView(
    padding: const EdgeInsets.fromLTRB(14, 8, 14, 120),
    children: [
      const _InfoCard(
        icon: Icons.explore_outlined,
        title: 'WAOUH Scout',
        text:
            'Ajoutez un prix réellement observé dans une boutique ou un marché.',
      ),
      const SizedBox(height: 10),
      TextField(
        controller: scoutTitle,
        decoration: const InputDecoration(labelText: 'Produit observé'),
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          Expanded(
            child: TextField(
              controller: scoutPrice,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Prix',
                suffixText: 'F',
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: scoutCity,
              decoration: const InputDecoration(labelText: 'Ville'),
            ),
          ),
        ],
      ),
      const SizedBox(height: 8),
      TextField(
        controller: scoutPlace,
        decoration: const InputDecoration(labelText: 'Boutique / marché'),
      ),
      const SizedBox(height: 8),
      TextField(
        controller: scoutGtin,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(labelText: 'GTIN / code-barres'),
      ),
      const SizedBox(height: 8),
      FilledButton.icon(
        onPressed: busy ? null : submitScout,
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Ajouter au réseau de prix'),
      ),
    ],
  );

  Widget buildSources() => RefreshIndicator(
    onRefresh: loadSources,
    child: ListView(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 120),
      children: [
        const _InfoCard(
          icon: Icons.hub_outlined,
          title: 'Signal Fabric',
          text: 'Chaque canal affiche son état réel.',
        ),
        const SizedBox(height: 10),
        for (final source in sources)
          Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(
                source.live ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                color: source.live ? const Color(0xFF08745D) : Colors.blueGrey,
              ),
              title: Text(
                source.label,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text(
                source.family +
                    ' · ' +
                    source.mode +
                    ' · ' +
                    source.contactability,
              ),
              trailing: Text(
                source.live ? 'LIVE' : source.state.toUpperCase(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: source.live
                      ? const Color(0xFF08745D)
                      : Colors.blueGrey,
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

class _Hero extends StatelessWidget {
  const _Hero({required this.liveCount});
  final int liveCount;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: const EdgeInsets.fromLTRB(14, 12, 14, 8),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      gradient: WaouhGradients.airHero,
      borderRadius: BorderRadius.circular(26),
      border: Border.all(color: const Color(0xFFDDE7F7)),
      boxShadow: WaouhShadows.card,
    ),
    child: Row(
      children: [
        Container(
          width: 58,
          height: 58,
          padding: const EdgeInsets.all(2.5),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [Color(0xFF55DDF2), Color(0xFF4F7FFF), Color(0xFF8B7CFF)],
            ),
          ),
          child: ClipOval(
            child: Image.asset(botAvatarAsset, fit: BoxFit.cover),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'WAOUH NEXUS',
                style: TextStyle(
                  color: WaouhPalette.ink,
                  fontWeight: FontWeight.w900,
                  fontSize: 19,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(.92),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    topRight: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                  border: Border.all(color: const Color(0xFFD9E6FF)),
                ),
                child: const Text(
                  'Je trouve, je compare, je contacte.',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.signedIn});
  final bool signedIn;

  @override
  Widget build(BuildContext context) => Container(
    height: 44,
    margin: const EdgeInsets.symmetric(horizontal: 14),
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: const Color(0xFFF0F4FB),
      borderRadius: BorderRadius.circular(16),
    ),
    child: TabBar(
      isScrollable: true,
      tabAlignment: TabAlignment.start,
      dividerColor: Colors.transparent,
      indicatorSize: TabBarIndicatorSize.tab,
      indicator: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.all(Radius.circular(12)),
        boxShadow: [
          BoxShadow(
            color: Color(0x1552709F),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      labelColor: WaouhPalette.blue,
      unselectedLabelColor: WaouhPalette.muted,
      labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
      unselectedLabelStyle: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
      tabs: [
        const Tab(
          icon: Icon(Icons.search_rounded, size: 17),
          text: 'Découvrir',
        ),
        Tab(
          icon: Icon(
            signedIn ? Icons.share_rounded : Icons.lock_outline_rounded,
            size: 17,
          ),
          text: 'Partager',
        ),
        Tab(
          icon: Icon(
            signedIn ? Icons.explore_outlined : Icons.lock_outline_rounded,
            size: 17,
          ),
          text: 'Scout',
        ),
        const Tab(icon: Icon(Icons.hub_outlined, size: 17), text: 'Sources'),
      ],
    ),
  );
}

class _GuestLockedNexusPane extends StatelessWidget {
  const _GuestLockedNexusPane({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: WaouhPalette.line),
            boxShadow: WaouhShadows.card,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.lock_person_outlined,
                size: 42,
                color: WaouhPalette.blue,
              ),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: WaouhPalette.ink,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                description,
                textAlign: TextAlign.center,
                style: const TextStyle(color: WaouhPalette.muted, height: 1.35),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => context.go('/app/auth?next=/app/nexus'),
                icon: const Icon(Icons.login_rounded),
                label: const Text('Se connecter'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _SmartPlanCard extends StatelessWidget {
  const _SmartPlanCard({required this.plan, required this.findSellers});

  final NexusSmartDiscoveryPlan plan;
  final bool findSellers;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: const Color(0xFFF4F7FF),
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: WaouhPalette.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(
              Icons.psychology_alt_outlined,
              color: WaouhPalette.blue,
              size: 19,
            ),
            const SizedBox(width: 7),
            const Expanded(
              child: Text(
                'Lecture NEXUS',
                style: TextStyle(
                  color: WaouhPalette.ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            _Pill('IA ' + (plan.confidence * 100).round().toString() + '%'),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          findSellers ? 'Acheter → vendeurs' : 'Vendre → acheteurs',
          style: const TextStyle(
            color: WaouhPalette.blue,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
        if (plan.normalizedQuery.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            plan.normalizedQuery,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11.5),
          ),
        ],
        if (plan.priorities.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 5,
            runSpacing: 5,
            children: plan.priorities
                .take(4)
                .map((item) => _Pill(item.replaceAll('_', ' ')))
                .toList(growable: false),
          ),
        ],
      ],
    ),
  );
}

class _DiscoveryCard extends StatelessWidget {
  const _DiscoveryCard({
    required this.item,
    required this.onContact,
    this.onSource,
  });

  final NexusDiscoveryItem item;
  final VoidCallback onContact;
  final VoidCallback? onSource;

  @override
  Widget build(BuildContext context) => Card(
    elevation: 0,
    margin: const EdgeInsets.only(bottom: 9),
    child: Padding(
      padding: const EdgeInsets.all(13),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              Text(
                item.scores.total.round().toString() + '%',
                style: const TextStyle(
                  color: WaouhPalette.blue,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Wrap(
            spacing: 5,
            runSpacing: 5,
            children: [
              if (item.city != null) _Pill(item.city!),
              _Pill(item.contactPolicy.level),
              if ((item.readinessLevel ?? item.contactPack?.readiness)
                      ?.isNotEmpty ==
                  true)
                _Pill(item.readinessLevel ?? item.contactPack!.readiness),
              if (item.actionabilityScore != null || item.contactPack != null)
                _Pill(
                  'Action ' +
                      (item.actionabilityScore ??
                              item.contactPack!.actionabilityScore)
                          .round()
                          .toString() +
                      '%',
                ),
            ],
          ),
          if (item.priceMin != null || item.priceMax != null) ...[
            const SizedBox(height: 8),
            Text(
              priceRange(item),
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
            ),
          ],
          const SizedBox(height: 7),
          Text(
            'Confiance ' +
                item.scores.trust.round().toString() +
                '% · pertinence ' +
                item.scores.relevance.round().toString() +
                '%',
            style: const TextStyle(fontSize: 11, color: Colors.blueGrey),
          ),
          if (item.nextBestAction != null || item.contactPack != null) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F2FF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Bot recommande : ' +
                    nexusActionLabel(
                      item.nextBestAction ?? item.contactPack!.nextBestAction,
                    ) +
                    ((item.bestChannel ?? item.contactPack?.bestChannel)
                                ?.isNotEmpty ==
                            true
                        ? ' · ' +
                              (item.bestChannel ??
                                  item.contactPack!.bestChannel!)
                        : ''),
                style: const TextStyle(
                  color: Color(0xFF5A36A8),
                  fontWeight: FontWeight.w800,
                  fontSize: 10.5,
                ),
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              if (onSource != null)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onSource,
                    icon: const Icon(Icons.open_in_new_rounded),
                    label: const Text('Voir'),
                  ),
                ),
              if (onSource != null) const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed: onContact,
                  icon: const Icon(Icons.chat_bubble_outline_rounded),
                  label: Text(
                    liveContactabilityActionLabel(item.contactPolicy.level),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class _ContactSheet extends StatefulWidget {
  const _ContactSheet({
    required this.service,
    required this.item,
    required this.contact,
  });

  final LiveNexusService service;
  final NexusDiscoveryItem item;
  final NexusPreparedContact contact;

  @override
  State<_ContactSheet> createState() => _ContactSheetState();
}

class _ContactSheetState extends State<_ContactSheet> {
  late final TextEditingController message;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    message = TextEditingController(
      text:
          'Bonjour, je vous contacte via WAOUH au sujet de « ' +
          widget.item.title +
          ' ». Est-ce toujours disponible / pertinent ?',
    );
  }

  @override
  void dispose() {
    message.dispose();
    super.dispose();
  }

  Future<void> send() async {
    setState(() => busy = true);
    try {
      await widget.service.sendContact(
        fabricId: widget.contact.fabricId,
        message: message.text,
      );
      if (!mounted) return;
      Navigator.pop(context);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(errorText(error))));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final policy = widget.contact.policy;
    final canSend =
        policy.canAutoContact ||
        policy.canBlindMessage ||
        policy.canUserConfirmContact;
    return Container(
      margin: const EdgeInsets.only(top: 60),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      child: ListView(
        shrinkWrap: true,
        children: [
          Text(
            widget.contact.actorName ?? widget.item.title,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
          ),
          const SizedBox(height: 4),
          Text(policy.level + ' · ' + policy.label),
          if ((widget.contact.note ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(widget.contact.note!),
          ],
          for (final contact in widget.contact.contacts)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.contact_phone_outlined),
              title: Text(
                contact.last4 == null
                    ? contact.channel
                    : contact.channel + ' · …' + contact.last4!,
              ),
              onTap: () => openContact(contact),
            ),
          if (canSend) ...[
            const SizedBox(height: 8),
            TextField(
              controller: message,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: policy.level == 'C1'
                    ? 'Message vers le contact professionnel public'
                    : policy.canBlindMessage
                    ? 'Message privé via WAOUH'
                    : 'Message à transmettre',
              ),
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: busy ? null : send,
              icon: const Icon(Icons.send_rounded),
              label: Text(
                policy.canBlindMessage
                    ? 'Envoyer sans révéler les contacts'
                    : 'WAOUH contacte maintenant',
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> openContact(NexusContactItem contact) async {
    final value = contact.value.trim();
    Uri? uri;
    if (contact.channel == 'whatsapp') {
      uri = Uri.parse('https://wa.me/' + value.replaceAll(RegExp(r'\D'), ''));
    } else if (contact.channel == 'phone') {
      uri = Uri.parse('tel:' + value);
    } else if (contact.channel == 'email') {
      uri = Uri.parse('mailto:' + value);
    }
    if (uri != null) await openExternal(uri);
  }
}

class _BarcodeScannerSheet extends StatefulWidget {
  const _BarcodeScannerSheet();
  @override
  State<_BarcodeScannerSheet> createState() => _BarcodeScannerSheetState();
}

class _BarcodeScannerSheetState extends State<_BarcodeScannerSheet> {
  bool done = false;

  @override
  Widget build(BuildContext context) => Container(
    height: MediaQuery.sizeOf(context).height * .72,
    decoration: const BoxDecoration(
      color: Colors.black,
      borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
    ),
    clipBehavior: Clip.antiAlias,
    child: MobileScanner(
      onDetect: (capture) {
        if (done) return;
        for (final barcode in capture.barcodes) {
          final value = barcode.rawValue?.trim();
          if (value == null || value.length < 6) continue;
          done = true;
          Navigator.of(context).pop(value);
          break;
        }
      },
    ),
  );
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.icon,
    required this.title,
    required this.text,
  });

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: const Color(0xFFF4FBF7),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFCBE4D9)),
    ),
    child: Row(
      children: [
        Icon(icon, color: const Color(0xFF08745D)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              Text(text, style: const TextStyle(fontSize: 12)),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Pill extends StatelessWidget {
  const _Pill(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: const Color(0xFFF0F4F3),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(
      text,
      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
    ),
  );
}

String nexusActionLabel(String? value) => switch ((value ?? '').toUpperCase()) {
  'CONTACT_NOW' => 'contacter maintenant',
  'OPEN_DEAL_ROOM' => 'ouvrir le Deal Room',
  'REQUEST_APPROVAL' => 'valider le contact',
  'WAIT_REPLY' => 'attendre la réponse',
  'FOLLOW_UP' => 'relancer',
  'NEGOTIATE' => 'négocier',
  'EXECUTE' => 'exécuter',
  'COMPLETE' => 'terminé',
  'DROP_LOW_QUALITY' => 'priorité faible',
  _ => 'enrichir le contact',
};

String sourceLabel(String key) => switch (key) {
  'waouh_app' => 'WAOUH',
  'partner' => 'Partenaire',
  'whatsapp' => 'WhatsApp',
  'share_to_waouh' => 'Partagé',
  'radar_ia' => 'Radar IA',
  'serpapi' => 'Web public',
  'apify' => 'Web social',
  'google_places' => 'Google Maps',
  'facebook_business' => 'Facebook',
  'instagram_business' => 'Instagram',
  'tiktok_connected' => 'TikTok',
  'telegram_public' => 'Telegram',
  'benin_directory' => 'Annuaire Bénin',
  'b2b_rfq' => 'B2B / RFQ',
  'scout' => 'Scout',
  _ => key,
};

String priceRange(NexusDiscoveryItem item) {
  String amount(double value) => value.round().toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ' ',
  );
  if (item.priceMin != null &&
      item.priceMax != null &&
      item.priceMin != item.priceMax) {
    return amount(item.priceMin!) + ' – ' + amount(item.priceMax!) + ' F';
  }
  final value = item.priceMin ?? item.priceMax;
  return value == null ? '' : amount(value) + ' F';
}

String errorText(Object error) => error is NexusApiException
    ? error.message
    : waouhUserMessage(error, action: 'load');

Future<void> openExternal(Uri uri) async {
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    throw NexusApiException('Impossible d’ouvrir ' + uri.scheme + '.');
  }
}
