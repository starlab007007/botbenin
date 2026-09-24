import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';
import 'live_guest_action_gate.dart';
import 'live_models.dart';
import 'live_theme.dart';
import 'live_visuals.dart';
import 'live_widgets.dart';

class LiveStatusFeed extends StatefulWidget {
  const LiveStatusFeed({super.key});
  @override
  State<LiveStatusFeed> createState() => _LiveStatusFeedState();
}

class _LiveStatusFeedState extends State<LiveStatusFeed> {
  String? filter;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: WaouhPalette.green,
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => const LiveStatusComposerScreen())),
        icon: const Icon(Icons.add_a_photo_outlined),
        label: const Text('Publier'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
              WaouhSpace.lg, WaouhSpace.sm, WaouhSpace.lg, WaouhSpace.sm),
          child: Row(children: [
            _filter('Tous', null, Icons.apps_rounded),
            const SizedBox(width: 8),
            _filter('Ventes', 'sell', Icons.sell_outlined),
            const SizedBox(width: 8),
            _filter('Recherches', 'buy', Icons.search_rounded),
            const SizedBox(width: 8),
            _filter('Annonces', 'announce', Icons.campaign_outlined),
          ]),
        ),
        Expanded(
            child: StreamBuilder<List<LiveStatus>>(
          stream: controller.statuses(type: filter),
          builder: (_, snapshot) {
            final statuses = snapshot.data ?? const <LiveStatus>[];
            if (statuses.isEmpty) {
              return Padding(
                padding: const EdgeInsets.all(WaouhSpace.lg),
                child: WaouhEmptyPanel(
                  icon: Icons.auto_awesome_outlined,
                  title: 'Aucun statut actif',
                  message:
                      'Publiez une vente urgente, une recherche ou une promo visible 24h.',
                  actionLabel: 'Publier un statut',
                  tint: WaouhPalette.amber,
                  iconColor: WaouhPalette.orange,
                  onAction: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => const LiveStatusComposerScreen())),
                ),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.fromLTRB(
                  WaouhSpace.lg, 4, WaouhSpace.lg, 110),
              itemCount: statuses.length,
              itemBuilder: (_, index) {
                final item = statuses[index];
                return _StatusCard(
                  status: item,
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => LiveStatusViewer(status: item))),
                );
              },
            );
          },
        )),
      ]),
    );
  }

  Widget _filter(String label, String? value, IconData icon) {
    final selected = filter == value;
    return GestureDetector(
      onTap: () => setState(() => filter = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? WaouhPalette.green : Colors.white,
          borderRadius: BorderRadius.circular(WaouhRadius.chip),
          border: Border.all(
              color: selected ? WaouhPalette.green : WaouhPalette.line),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon,
              size: 14, color: selected ? Colors.white : WaouhPalette.muted),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : WaouhPalette.muted,
              )),
        ]),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.status, required this.onTap});
  final LiveStatus status;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final gradient = WaouhGradients.forStatusType(status.type);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: WaouhSpace.md),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(WaouhRadius.card),
          boxShadow: WaouhShadows.card,
        ),
        child: Padding(
          padding: const EdgeInsets.all(WaouhSpace.sm + 4),
          child: Row(children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(WaouhRadius.thumb),
                  child: status.mediaUrls.isNotEmpty
                      ? Image.network(status.mediaUrls.first,
                          height: 76,
                          width: 76,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _typeBadge(gradient, status.type))
                      : _typeBadge(gradient, status.type),
                ),
                Positioned(
                  bottom: -4,
                  right: -4,
                  child: CountdownRing(
                      expiresAt: status.expiresAt, size: 30, stroke: 2.6),
                ),
              ],
            ),
            const SizedBox(width: WaouhSpace.md),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Expanded(
                          child: Text(status.title,
                              style: WaouhText.h3,
                              overflow: TextOverflow.ellipsis)),
                      WaouhPill(
                        label: _statusLabel(status.type),
                        background: status.type == 'sell'
                            ? WaouhPalette.redTint
                            : status.type == 'buy'
                                ? WaouhPalette.mint
                                : WaouhPalette.orangeTint,
                        foreground: status.type == 'sell'
                            ? const Color(0xFFB3242E)
                            : status.type == 'buy'
                                ? WaouhPalette.jade
                                : WaouhPalette.orange,
                      ),
                    ]),
                    if ((status.caption ?? '').isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(status.caption!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: WaouhText.caption),
                      ),
                    const SizedBox(height: 6),
                    Row(children: [
                      if (status.price != null) ...[
                        Text('${_formatNumber(status.price!)} F',
                            style: WaouhText.bodyStrong.copyWith(
                                color: WaouhPalette.green, fontSize: 14)),
                        const SizedBox(width: 8),
                      ],
                      if ((status.location ?? '').isNotEmpty) ...[
                        const Icon(Icons.location_on_outlined,
                            size: 12, color: WaouhPalette.muted),
                        const SizedBox(width: 2),
                        Expanded(
                            child: Text(status.location!,
                                style: WaouhText.caption,
                                overflow: TextOverflow.ellipsis)),
                      ],
                    ]),
                  ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _typeBadge(Gradient gradient, String type) => Container(
        height: 76,
        width: 76,
        decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(WaouhRadius.thumb)),
        child: Icon(
          type == 'sell'
              ? Icons.sell_outlined
              : type == 'buy'
                  ? Icons.search_rounded
                  : Icons.campaign_outlined,
          color: Colors.white,
        ),
      );
}

String _formatNumber(num value) {
  final text = value.toInt().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < text.length; i++) {
    if (i > 0 && (text.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(text[i]);
  }
  return buffer.toString();
}

String _statusLabel(String type) => type == 'sell'
    ? 'Vente'
    : type == 'buy'
        ? 'Recherche'
        : 'Annonce';

class LiveStatusComposerScreen extends StatefulWidget {
  const LiveStatusComposerScreen({super.key});
  @override
  State<LiveStatusComposerScreen> createState() =>
      _LiveStatusComposerScreenState();
}

class _LiveStatusComposerScreenState extends State<LiveStatusComposerScreen> {
  String type = 'sell';
  final title = TextEditingController();
  final price = TextEditingController();
  final city = TextEditingController();
  final caption = TextEditingController();
  final photos = <XFile>[];
  bool publishing = false;
  bool gpsLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      city.text = await context.read<LiveWaouhController>().city;
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    title.dispose();
    price.dispose();
    city.dispose();
    caption.dispose();
    super.dispose();
  }

  Future<void> _photo(ImageSource source) async {
    if (photos.length >= 2) return;
    final file =
        await ImagePicker().pickImage(source: source, imageQuality: 82);
    if (file != null && mounted) setState(() => photos.add(file));
  }

  Future<void> _gps() async {
    setState(() => gpsLoading = true);
    try {
      final controller = context.read<LiveWaouhController>();
      await controller.useDeviceLocation();
      if (!mounted) return;
      final position = controller.position;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(position.available
              ? '📍 Position GPS ajoutée. Indiquez aussi la ville ou le quartier.'
              : 'Position non disponible. Saisissez votre ville.')));
    } finally {
      if (mounted) setState(() => gpsLoading = false);
    }
  }

  Future<void> _publish() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/chat',
      actionLabel: 'publier ce statut',
    )) return;
    if (title.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Titre obligatoire.')));
      return;
    }
    setState(() => publishing = true);
    try {
      final controller = context.read<LiveWaouhController>();
      await controller.setCity(city.text);
      await controller.publishStatus(
          type: type,
          title: title.text,
          caption: caption.text,
          price: num.tryParse(price.text),
          locationText: city.text,
          photos: photos);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✅ Statut publié pour 24 heures.')),
      );
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) setState(() => publishing = false);
    }
  }

  static const _types = [
    ('sell', 'Vente', Icons.sell_outlined),
    ('buy', 'Achat', Icons.search_rounded),
    ('announce', 'Annonce', Icons.campaign_outlined),
  ];

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: WaouhPalette.pearl,
        appBar: const LiveHeader(
            title: 'Nouveau statut',
            subtitle: 'Visible pendant 24h',
            back: true),
        body: ListView(
            padding: const EdgeInsets.fromLTRB(
                WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.xxl),
            children: [
              Row(
                  children: _types.map((entry) {
                final selected = type == entry.$1;
                final gradient = WaouhGradients.forStatusType(entry.$1);
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => type = entry.$1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 160),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          gradient: selected ? gradient : null,
                          color: selected ? null : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: selected
                                  ? Colors.transparent
                                  : WaouhPalette.line),
                          boxShadow: selected ? WaouhShadows.card : null,
                        ),
                        child: Column(children: [
                          Icon(entry.$3,
                              size: 20,
                              color:
                                  selected ? Colors.white : WaouhPalette.muted),
                          const SizedBox(height: 4),
                          Text(entry.$2,
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: selected
                                    ? Colors.white
                                    : WaouhPalette.muted,
                              )),
                        ]),
                      ),
                    ),
                  ),
                );
              }).toList()),
              const SizedBox(height: WaouhSpace.xl),
              _label(type == 'sell'
                  ? 'Titre de la vente *'
                  : type == 'buy'
                      ? 'Objet recherché *'
                      : "Titre de l'annonce *"),
              TextField(
                  controller: title,
                  decoration: const InputDecoration(
                      hintText: 'Ex: Réfrigérateur Samsung 250L')),
              const SizedBox(height: WaouhSpace.md),
              _label(type == 'buy' ? 'Budget (FCFA)' : 'Prix (FCFA)'),
              TextField(
                  controller: price,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(hintText: '15 000')),
              const SizedBox(height: WaouhSpace.md),
              _label('Ville ou quartier'),
              Row(children: [
                Expanded(
                    child: TextField(
                        controller: city,
                        decoration: const InputDecoration(
                            hintText: 'Cotonou, Akpakpa...'))),
                const SizedBox(width: 8),
                SizedBox(
                  height: 52,
                  width: 52,
                  child: OutlinedButton(
                    onPressed: gpsLoading ? null : _gps,
                    style: OutlinedButton.styleFrom(padding: EdgeInsets.zero),
                    child: gpsLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.my_location_rounded, size: 19),
                  ),
                ),
              ]),
              const SizedBox(height: WaouhSpace.sm),
              Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    'Cotonou',
                    'Abomey-Calavi',
                    'Porto-Novo',
                    'Parakou',
                    'Bohicon'
                  ]
                      .map((value) => GestureDetector(
                            onTap: () => setState(() => city.text = value),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 7),
                              decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius:
                                      BorderRadius.circular(WaouhRadius.chip),
                                  border: Border.all(color: WaouhPalette.line)),
                              child: Text(value, style: WaouhText.caption),
                            ),
                          ))
                      .toList()),
              const SizedBox(height: WaouhSpace.lg),
              _label('Détails, état, quantité ou contact'),
              TextField(
                  controller: caption,
                  minLines: 3,
                  maxLines: 5,
                  decoration: const InputDecoration(
                      hintText: 'Décrivez votre offre...')),
              const SizedBox(height: WaouhSpace.lg),
              _label('Photos (2 max)'),
              Row(children: [
                for (var i = 0; i < photos.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Stack(children: [
                      ClipRRect(
                          borderRadius:
                              BorderRadius.circular(WaouhRadius.thumb),
                          child: Image.file(File(photos[i].path),
                              width: 80, height: 80, fit: BoxFit.cover)),
                      Positioned(
                          top: 2,
                          right: 2,
                          child: GestureDetector(
                            onTap: () => setState(() => photos.removeAt(i)),
                            child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                    color: WaouhPalette.red,
                                    shape: BoxShape.circle),
                                child: const Icon(Icons.close_rounded,
                                    size: 13, color: Colors.white)),
                          )),
                    ]),
                  ),
                if (photos.length < 2)
                  GestureDetector(
                    onTap: () => _showPhotoSheet(),
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                          borderRadius:
                              BorderRadius.circular(WaouhRadius.thumb),
                          border:
                              Border.all(color: WaouhPalette.line, width: 1.4)),
                      child: const Icon(Icons.add_photo_alternate_outlined,
                          color: WaouhPalette.muted),
                    ),
                  ),
              ]),
              const SizedBox(height: WaouhSpace.xl),
              SizedBox(
                height: 54,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                      backgroundColor: WaouhPalette.green),
                  onPressed: publishing ? null : _publish,
                  icon: publishing
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.publish_outlined),
                  label: Text(
                      publishing ? 'Publication...' : 'Publier · visible 24h'),
                ),
              ),
            ]),
      );

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: WaouhSpace.xs),
        child: Text(text, style: WaouhText.bodyStrong.copyWith(fontSize: 13.5)),
      );

  void _showPhotoSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(WaouhRadius.sheet))),
      builder: (context) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Prendre une photo'),
              onTap: () {
                Navigator.pop(context);
                _photo(ImageSource.camera);
              }),
          ListTile(
              leading: const Icon(Icons.photo_outlined),
              title: const Text('Choisir dans la galerie'),
              onTap: () {
                Navigator.pop(context);
                _photo(ImageSource.gallery);
              }),
        ]),
      ),
    );
  }
}

class LiveStatusViewer extends StatelessWidget {
  const LiveStatusViewer({super.key, required this.status});
  final LiveStatus status;

  @override
  Widget build(BuildContext context) {
    final remaining = status.expiresAt.difference(DateTime.now());
    final hoursLeft = remaining.isNegative ? 0 : remaining.inHours;
    return Scaffold(
      backgroundColor: WaouhPalette.ink,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (status.mediaUrls.isNotEmpty)
            Image.network(status.mediaUrls.first,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                    decoration:
                        const BoxDecoration(gradient: WaouhGradients.brand)))
          else
            Container(
                decoration: BoxDecoration(
                    gradient: WaouhGradients.forStatusType(status.type))),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withOpacity(0.55),
                  Colors.black.withOpacity(0.05),
                  Colors.black.withOpacity(0.15),
                  Colors.black.withOpacity(0.78),
                ],
                stops: const [0, 0.28, 0.55, 1],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                  WaouhSpace.lg, WaouhSpace.sm, WaouhSpace.lg, WaouhSpace.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: (24 - hoursLeft) / 24,
                      minHeight: 3,
                      backgroundColor: Colors.white.withOpacity(0.25),
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: WaouhSpace.md),
                  Row(children: [
                    CircleAvatar(
                        radius: 19,
                        backgroundColor: WaouhPalette.jade,
                        child: const Icon(Icons.storefront,
                            color: Colors.white, size: 18)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(status.authorName ?? 'WAOUH',
                                style: WaouhText.onDark(WaouhText.bodyStrong)),
                            Text(
                                hoursLeft > 0
                                    ? 'Expire dans ${hoursLeft}h'
                                    : 'Expire bientôt',
                                style:
                                    WaouhText.onDarkMuted(WaouhText.caption)),
                          ]),
                    ),
                    IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded,
                            color: Colors.white)),
                  ]),
                  const Spacer(),
                  WaouhPill(
                    label: status.type == 'sell'
                        ? '🏷️ Vente'
                        : status.type == 'buy'
                            ? '🔍 Recherche'
                            : '📢 Annonce',
                    background: Colors.white.withOpacity(0.16),
                    foreground: Colors.white,
                  ),
                  const SizedBox(height: WaouhSpace.sm),
                  Text(status.title,
                      style: WaouhText.onDark(
                          WaouhText.display.copyWith(fontSize: 28))),
                  if ((status.caption ?? '').isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: WaouhSpace.sm),
                      child: Text(status.caption!,
                          style: WaouhText.onDarkMuted(
                              WaouhText.body.copyWith(fontSize: 15.5))),
                    ),
                  if (status.price != null ||
                      (status.location ?? '').isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: WaouhSpace.md),
                      child: Row(children: [
                        if (status.price != null)
                          Text('${_formatNumber(status.price!)} FCFA',
                              style: WaouhText.onDark(WaouhText.h2
                                  .copyWith(color: WaouhPalette.neon))),
                        if (status.price != null &&
                            (status.location ?? '').isNotEmpty)
                          const SizedBox(width: 10),
                        if ((status.location ?? '').isNotEmpty) ...[
                          const Icon(Icons.location_on_outlined,
                              size: 15, color: Colors.white70),
                          const SizedBox(width: 3),
                          Text(status.location!,
                              style: WaouhText.onDarkMuted(WaouhText.caption)),
                        ],
                      ]),
                    ),
                  const SizedBox(height: WaouhSpace.lg),
                  SizedBox(
                    height: 54,
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                          backgroundColor: WaouhPalette.neon,
                          foregroundColor: WaouhPalette.ink),
                      onPressed: () async {
                        if (!await requireLiveAuthentication(
                          context,
                          next: '/app/chat/waouh',
                          actionLabel: 'répondre à ce statut',
                        )) {
                          return;
                        }
                        if (!context.mounted) return;
                        final router = GoRouter.of(context);
                        await context
                            .read<LiveWaouhController>()
                            .openStatusReply(status);
                        if (!context.mounted) return;
                        Navigator.of(context).pop();
                        router.go('/app/chat/waouh');
                      },
                      icon: const Icon(Icons.chat_bubble_outline_rounded),
                      label: const Text('Répondre dans WAOUH'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
