import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_nexus_service.dart';
import 'live_widgets.dart';

class LiveNexusScreen extends StatefulWidget {
  const LiveNexusScreen({super.key});
  @override
  State<LiveNexusScreen> createState() => _LiveNexusScreenState();
}

class _LiveNexusScreenState extends State<LiveNexusScreen> {
  final query = TextEditingController();
  final city = TextEditingController(text: 'Cotonou');
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
  bool busy = false;
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
    WidgetsBinding.instance.addPostFrameCallback((_) => loadSources());
  }

  @override
  void dispose() {
    for (final item in <TextEditingController>[
      query, city, budget, shareText, shareUrl,
      scoutTitle, scoutPrice, scoutCity, scoutPlace, scoutGtin,
    ]) {
      item.dispose();
    }
    super.dispose();
  }

  Future<void> loadSources() async {
    if (legacy.supabase.auth.currentUser == null) return;
    try {
      final value = await service.sources();
      if (!mounted) return;
      setState(() => sources = value);
    } catch (_) {}
  }

  Future<void> runSearch() async {
    final text = query.text.trim();
    if (text.isEmpty) {
      notice('Décrivez ce que WAOUH doit chercher.');
      return;
    }
    setState(() => busy = true);
    try {
      final maxBudget =
          double.tryParse(budget.text.replaceAll(RegExp(r'\D'), ''));
      final value = await service.search(
        query: text,
        findSellers: findSellers,
        city: city.text.trim(),
        budgetMax: maxBudget,
      );
      if (!mounted) return;
      setState(() => discovery = value);
      if (value.results.isEmpty) {
        notice(findSellers
            ? 'Aucun vendeur suffisamment proche pour le moment.'
            : 'Aucun acheteur suffisamment proche pour le moment.');
      }
      loadSources();
    } catch (error) {
      if (mounted) notice(errorText(error));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> recognizeProduct() async {
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
    final goal = query.text.trim();
    if (goal.isEmpty) {
      notice('Lancez d’abord une recherche.');
      return;
    }
    setState(() => busy = true);
    try {
      final maxBudget =
          double.tryParse(budget.text.replaceAll(RegExp(r'\D'), ''));
      await service.createBuyerAutopilot(
        goal: goal,
        city: city.text.trim(),
        budgetMax: maxBudget,
      );
      if (!mounted) return;
      notice(
        'Mission + veille créées. Muse continuera la recherche.',
        success: true,
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
    final title = scoutTitle.text.trim();
    if (title.isEmpty) {
      notice('Indiquez le produit observé.');
      return;
    }
    setState(() => busy = true);
    try {
      final price =
          double.tryParse(scoutPrice.text.replaceAll(RegExp(r'\D'), ''));
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
    setState(() => busy = true);
    try {
      final contact = await service.prepareContact(item.fabricId);
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _ContactSheet(
          service: service,
          item: item,
          contact: contact,
        ),
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
        appBar: const LiveHeader(
          title: 'WAOUH NEXUS',
          subtitle: 'Le moteur de découverte de Muse',
          back: true,
        ),
        body: auth.signedIn
            ? Column(
                children: [
                  _Hero(liveCount: sources.where((source) => source.live).length),
                  const _Tabs(),
                  Expanded(
                    child: TabBarView(
                      children: [
                        buildSearch(),
                        buildShare(),
                        buildScout(),
                        buildSources(),
                      ],
                    ),
                  ),
                ],
              )
            : Center(
                child: FilledButton.icon(
                  onPressed: () => context.go('/app/auth?next=/app/nexus'),
                  icon: const Icon(Icons.login_rounded),
                  label: const Text('Se connecter pour utiliser NEXUS'),
                ),
              ),
      ),
    );
  }

  Widget buildSearch() {
    final results = discovery?.results ?? const <NexusDiscoveryItem>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 120),
      children: [
        Row(
          children: [
            Expanded(
              child: _ModeButton(
                selected: findSellers,
                icon: Icons.storefront_outlined,
                title: 'Trouver vendeurs',
                subtitle: 'Acheteur → offre',
                onTap: () => setState(() => findSellers = true),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _ModeButton(
                selected: !findSellers,
                icon: Icons.groups_2_outlined,
                title: 'Trouver acheteurs',
                subtitle: 'Vendeur → demande',
                onTap: () => setState(() => findSellers = false),
              ),
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
            hintText: findSellers
                ? 'Ex. Samsung S25 256 Go neuf'
                : 'Ex. acheteur pour 10 tonnes de soja',
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
            if (findSellers) ...[
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
        const SizedBox(height: 8),
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
        const SizedBox(height: 8),
        FilledButton.icon(
          onPressed: busy ? null : runSearch,
          icon: Icon(
            findSellers
                ? Icons.travel_explore_rounded
                : Icons.person_search_rounded,
          ),
          label: Text(
            findSellers
                ? 'Trouver les vendeurs partout'
                : 'Trouver les acheteurs partout',
          ),
        ),
        if (findSellers && query.text.trim().isNotEmpty) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: busy ? null : startBuyerAutopilot,
            icon: const Icon(Icons.smart_toy_outlined),
            label: const Text('Muse : acheter pour moi'),
          ),
        ],
        if ((discovery?.sourceMix ?? const <String, int>{}).isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: discovery!.sourceMix.entries
                .map(
                  (entry) => Chip(
                    label: Text(
                      sourceLabel(entry.key) + ' · ' + entry.value.toString(),
                      style: const TextStyle(fontSize: 11),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
        ],
        if ((discovery?.refresh ?? const <String, dynamic>{}).isNotEmpty) ...[
          const SizedBox(height: 7),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: discovery!.refresh.entries.map((entry) {
              final raw = entry.value;
              final state = raw is Map
                  ? Map<String, dynamic>.from(raw)
                  : <String, dynamic>{};
              final configured = state['configured'] == true;
              final inserted = (state['inserted'] as num?)?.round() ?? 0;
              return Chip(
                avatar: Icon(
                  configured ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                  size: 15,
                  color: configured
                      ? const Color(0xFF08745D)
                      : Colors.blueGrey,
                ),
                label: Text(
                  configured
                      ? sourceLabel(entry.key) + ' +' + inserted.toString()
                      : sourceLabel(entry.key) + ' · non configuré',
                  style: const TextStyle(fontSize: 10.5),
                ),
              );
            }).toList(growable: false),
          ),
        ],
        if (results.isNotEmpty) ...[
          const SizedBox(height: 14),
          Text(
            findSellers ? 'Meilleurs vendeurs' : 'Acheteurs compatibles',
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
          ),
          const SizedBox(height: 8),
          for (final item in results)
            _DiscoveryCard(
              item: item,
              onContact: () => prepareContact(item),
              onSource: item.sourceUrl == null
                  ? null
                  : () => openExternal(Uri.parse(item.sourceUrl!)),
            ),
        ],
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
            onChanged: (value) =>
                setState(() => shareOrigin = value ?? 'whatsapp'),
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
              title: sharedSignal!.intent +
                  ' · ' +
                  (sharedSignal!.productName ??
                      sharedSignal!.category ??
                      'Signal'),
              text: 'Acteur ' +
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
              text:
                  'Chaque source indique son état réel. Une source non configurée n’est jamais affichée comme live.',
            ),
            const SizedBox(height: 10),
            for (final source in sources)
              Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(
                    source.live ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                    color: source.live
                        ? const Color(0xFF08745D)
                        : Colors.blueGrey,
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
                      fontSize: 10,
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
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF063D35), Color(0xFF0A7D68)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.travel_explore_rounded,
              color: Colors.white,
              size: 30,
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'NEXUS cherche partout',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 17,
                    ),
                  ),
                  Text(
                    'Offre ↔ demande · prix · confiance · contact',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
            Chip(
              backgroundColor: Colors.white,
              label: Text(
                liveCount.toString() + ' live',
                style: const TextStyle(
                  color: Color(0xFF08745D),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      );
}

class _Tabs extends StatelessWidget {
  const _Tabs();
  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 14),
        child: TabBar(
          isScrollable: true,
          tabs: [
            Tab(icon: Icon(Icons.search_rounded), text: 'Chercher'),
            Tab(icon: Icon(Icons.share_rounded), text: 'Partager'),
            Tab(icon: Icon(Icons.explore_outlined), text: 'Scout'),
            Tab(icon: Icon(Icons.hub_outlined), text: 'Sources'),
          ],
        ),
      );
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.selected,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? const Color(0xFFE6F6F1) : Colors.white,
        shape: RoundedRectangleBorder(
          side: BorderSide(
            color: selected ? const Color(0xFF08745D) : Colors.black12,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                Icon(icon),
                const SizedBox(height: 4),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 10, color: Colors.blueGrey),
                ),
              ],
            ),
          ),
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
                      color: Color(0xFF08745D),
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
                  _Pill(sourceLabel(item.sourceKey)),
                  _Pill(item.intent),
                  if (item.city != null) _Pill(item.city!),
                  _Pill(item.contactPolicy.level),
                ],
              ),
              if (item.priceMin != null || item.priceMax != null) ...[
                const SizedBox(height: 8),
                Text(
                  priceRange(item),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
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
              const SizedBox(height: 10),
              Row(
                children: [
                  if (onSource != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onSource,
                        icon: const Icon(Icons.open_in_new_rounded),
                        label: const Text('Source'),
                      ),
                    ),
                  if (onSource != null) const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onContact,
                      icon: const Icon(Icons.chat_bubble_outline_rounded),
                      label: Text(
                        item.contactPolicy.level == 'C0'
                            ? 'Voir contact'
                            : item.contactPolicy.level == 'C2'
                                ? 'Répondre via WAOUH'
                                : 'Contacter',
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
      text: 'Bonjour, je vous contacte via WAOUH au sujet de « ' +
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorText(error))),
      );
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final policy = widget.contact.policy;
    final canSend = policy.canAutoContact || policy.canBlindMessage;
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
                labelText: policy.canBlindMessage
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
      uri = Uri.parse(
        'https://wa.me/' + value.replaceAll(RegExp(r'\D'), ''),
      );
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
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
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
          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700),
        ),
      );
}

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
  String amount(double value) => value
      .round()
      .toString()
      .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ' ');
  if (item.priceMin != null &&
      item.priceMax != null &&
      item.priceMin != item.priceMax) {
    return amount(item.priceMin!) + ' – ' + amount(item.priceMax!) + ' F';
  }
  final value = item.priceMin ?? item.priceMax;
  return value == null ? '' : amount(value) + ' F';
}

String errorText(Object error) =>
    error is NexusApiException ? error.message : error.toString();

Future<void> openExternal(Uri uri) async {
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    throw NexusApiException('Impossible d’ouvrir ' + uri.scheme + '.');
  }
}
