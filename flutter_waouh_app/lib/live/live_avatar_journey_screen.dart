import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_journey_service.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_match_navigation.dart';
import 'live_theme.dart';
import 'live_widgets.dart';

class LiveAvatarJourneyScreen extends StatefulWidget {
  const LiveAvatarJourneyScreen({super.key, required this.intent});
  final String intent;

  @override
  State<LiveAvatarJourneyScreen> createState() => _LiveAvatarJourneyScreenState();
}

class _LiveAvatarJourneyScreenState extends State<LiveAvatarJourneyScreen> {
  late final LiveAvatarJourneyService _service =
      LiveAvatarJourneyService(legacy.supabase);
  final _goal = TextEditingController();
  final _city = TextEditingController();
  final _budget = TextEditingController();

  AvatarJourneySearchResult? _result;
  bool _searching = false;
  int? _interestIndex;
  String? _error;

  String get _intent {
    final value = widget.intent.toLowerCase().trim();
    if (value == 'sell') return 'sell';
    if (value == 'ask') return 'ask';
    return 'buy';
  }

  String get _title => switch (_intent) {
        'sell' => 'Vendre avec votre Avatar',
        'ask' => 'Demander à votre Avatar',
        _ => 'Acheter avec votre Avatar',
      };

  String get _subtitle => switch (_intent) {
        'sell' => 'Votre Avatar cherche, qualifie et prépare les acheteurs.',
        'ask' => 'Décrivez votre objectif. Votre Avatar organise la suite.',
        _ => 'Votre Avatar cherche, compare et prépare le meilleur deal.',
      };

  String get _hint => switch (_intent) {
        'sell' => 'Ex. Je vends un iPhone 15 Pro en très bon état',
        'ask' => 'Ex. Je veux lancer un petit service de livraison à Calavi',
        _ => 'Ex. Je cherche une moto Bajaj fiable à moins de 700 000 FCFA',
      };

  @override
  void dispose() {
    _goal.dispose();
    _city.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final goal = _goal.text.trim();
    if (goal.isEmpty || _searching) return;
    final avatar = context.read<LiveAvatarController>();
    avatar.setPersistentState(LiveAvatarPresenceState.searching);
    setState(() {
      _searching = true;
      _error = null;
      _result = null;
    });
    try {
      final budget = num.tryParse(
        _budget.text.replaceAll(RegExp(r'[^0-9.,-]'), '').replaceAll(',', '.'),
      );
      final result = await _service.search(
        intent: _intent,
        goal: goal,
        city: _city.text.trim().isEmpty ? null : _city.text.trim(),
        budget: budget,
      );
      if (!mounted) return;
      avatar.showState(
        result.offers.isEmpty
            ? LiveAvatarPresenceState.thinking
            : LiveAvatarPresenceState.found,
        duration: const Duration(seconds: 4),
      );
      setState(() => _result = result);
    } catch (e) {
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.waiting);
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _interest(AvatarJourneyOffer offer) async {
    if (_interestIndex != null) return;
    final avatar = context.read<LiveAvatarController>();
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    setState(() {
      _interestIndex = offer.index;
      _error = null;
    });
    try {
      final match = await _service.expressInterest(offer);
      if (!mounted) return;
      avatar.showState(
        LiveAvatarPresenceState.found,
        duration: const Duration(seconds: 3),
      );
      await livePushMatchChat<void>(context, match);
    } catch (e) {
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.waiting);
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _interestIndex = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    final result = _result;
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: LiveHeader(
        title: avatar.name,
        subtitle: 'Avatar Journey · ${_intent == 'sell' ? 'Vente' : _intent == 'ask' ? 'Conseil' : 'Achat'}',
        back: true,
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 110),
          children: [
            _JourneyHero(
              avatar: avatar,
              title: _title,
              subtitle: _subtitle,
              searching: _searching,
            ),
            const SizedBox(height: 14),
            _JourneyProgress(
              searched: result != null,
              hasOffer: result?.offers.isNotEmpty == true,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _goal,
              minLines: 3,
              maxLines: 5,
              decoration: InputDecoration(
                labelText: 'Votre objectif',
                hintText: _hint,
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 9),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _city,
                    decoration: const InputDecoration(
                      labelText: 'Ville / zone',
                      hintText: 'Cotonou, Calavi…',
                      prefixIcon: Icon(Icons.location_on_outlined),
                    ),
                  ),
                ),
                if (_intent == 'buy') ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _budget,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Budget max.',
                        hintText: 'FCFA',
                        prefixIcon: Icon(Icons.payments_outlined),
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _searching ? null : _search,
              icon: _searching
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.auto_awesome_rounded),
              label: Text(
                _searching
                    ? '${avatar.name} cherche…'
                    : _intent == 'sell'
                        ? 'Trouver les acheteurs'
                        : _intent == 'ask'
                            ? 'Laisser ${avatar.name} organiser'
                            : 'Trouver les meilleures offres',
              ),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              _JourneyNotice(
                icon: Icons.error_outline_rounded,
                text: _error!,
                accent: const Color(0xFFD95E69),
              ),
            ],
            if (result != null) ...[
              const SizedBox(height: 18),
              _JourneyInsight(avatarName: avatar.name, result: result),
              const SizedBox(height: 14),
              if (result.offers.isEmpty)
                const _JourneyNotice(
                  icon: Icons.search_off_rounded,
                  text:
                      'Aucune opportunité suffisamment qualifiée pour le moment. Votre Avatar peut créer une mission/veille depuis Missions.',
                  accent: WaouhPalette.blue,
                )
              else ...[
                Text(
                  _intent == 'sell'
                      ? 'Acheteurs qualifiés'
                      : 'Opportunités recommandées',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 9),
                for (final offer in result.offers.take(8)) ...[
                  _AvatarOfferCard(
                    offer: offer,
                    busy: _interestIndex == offer.index,
                    onInterest: _intent == 'ask'
                        ? null
                        : () => _interest(offer),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _JourneyHero extends StatelessWidget {
  const _JourneyHero({
    required this.avatar,
    required this.title,
    required this.subtitle,
    required this.searching,
  });

  final LiveAvatarController avatar;
  final String title;
  final String subtitle;
  final bool searching;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: WaouhGradients.airHero,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFDCE7F8)),
          boxShadow: WaouhShadows.card,
        ),
        child: Row(
          children: [
            LiveAvatarVisual(
              preset: avatar.profile.preset,
              state: searching
                  ? LiveAvatarPresenceState.searching
                  : avatar.state,
              size: 84,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: WaouhPalette.muted,
                      fontSize: 11.5,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 7),
                  const Wrap(
                    spacing: 5,
                    runSpacing: 5,
                    children: [
                      _JourneyChip('NEXUS'),
                      _JourneyChip('Signal Fabric'),
                      _JourneyChip('Deal Graph'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      );

}

class _JourneyChip extends StatelessWidget {
  const _JourneyChip(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white70,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Text(label,
            style: const TextStyle(
                color: WaouhPalette.blue,
                fontSize: 8.5,
                fontWeight: FontWeight.w800)),
      );
}

class _JourneyProgress extends StatelessWidget {
  const _JourneyProgress({required this.searched, required this.hasOffer});
  final bool searched;
  final bool hasOffer;

  @override
  Widget build(BuildContext context) {
    const steps = ['Objectif', 'Recherche', 'Sélection', 'Deal Room'];
    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          Expanded(
            child: _JourneyStep(
              label: steps[i],
              active: i == 0 || (i == 1 && searched) || (i == 2 && hasOffer),
            ),
          ),
          if (i != steps.length - 1)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 3),
              child: Icon(Icons.chevron_right_rounded,
                  size: 14, color: Color(0xFFA6B3C8)),
            ),
        ],
      ],
    );
  }
}

class _JourneyStep extends StatelessWidget {
  const _JourneyStep({required this.label, required this.active});
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 4),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFEAF2FF) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: active ? const Color(0xFFC7D7FF) : WaouhPalette.line,
          ),
        ),
        child: Text(label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                color: active ? WaouhPalette.blue : WaouhPalette.muted,
                fontSize: 8.5,
                fontWeight: FontWeight.w800)),
      );
}

class _JourneyInsight extends StatelessWidget {
  const _JourneyInsight({required this.avatarName, required this.result});
  final String avatarName;
  final AvatarJourneySearchResult result;

  @override
  Widget build(BuildContext context) {
    final sourceLine = result.sourceMix.isEmpty
        ? 'Sources WAOUH actives'
        : result.sourceMix.entries
            .take(5)
            .map((entry) => '${entry.key} ${entry.value}')
            .join(' · ');
    final rationale =
        result.intelligence?['rationale']?.toString().trim() ?? '';
    final reply = result.reply.trim();

    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: WaouhPalette.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.insights_rounded,
              color: WaouhPalette.blue, size: 22),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${avatarName} a analysé le marché',
                    style: const TextStyle(
                        color: WaouhPalette.ink,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                if (reply.isNotEmpty)
                  Text(reply,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 10.5,
                          height: 1.3)),
                if (rationale.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(rationale,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w600)),
                ],
                const SizedBox(height: 5),
                Text(sourceLine,
                    style: const TextStyle(
                        color: WaouhPalette.blue,
                        fontSize: 8.5,
                        fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AvatarOfferCard extends StatelessWidget {
  const _AvatarOfferCard({
    required this.offer,
    required this.busy,
    required this.onInterest,
  });
  final AvatarJourneyOffer offer;
  final bool busy;
  final VoidCallback? onInterest;

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: WaouhPalette.line),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (offer.photo != null)
              ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(22)),
                child: Image.network(
                  offer.photo!,
                  width: double.infinity,
                  height: 180,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(13),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(offer.title,
                      style: const TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 16,
                          fontWeight: FontWeight.w800)),
                  const SizedBox(height: 5),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      if (offer.price != null)
                        _OfferBadge(
                          '${offer.price!.round()} FCFA',
                          const Color(0xFFEAF8F2),
                          const Color(0xFF16856A),
                        ),
                      if (offer.city != null)
                        _OfferBadge(offer.city!, const Color(0xFFF1F5FF),
                            WaouhPalette.blue),
                      if (offer.source != null)
                        _OfferBadge(offer.source!, const Color(0xFFF6F3FF),
                            const Color(0xFF7965D7)),
                    ],
                  ),
                  if (offer.marketLine != null) ...[
                    const SizedBox(height: 8),
                    Text(offer.marketLine!,
                        style: const TextStyle(
                            color: WaouhPalette.muted,
                            fontSize: 10.5,
                            height: 1.3)),
                  ],
                  if (offer.recommendation != null) ...[
                    const SizedBox(height: 6),
                    Text(offer.recommendation!,
                        style: const TextStyle(
                            color: WaouhPalette.ink,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            height: 1.3)),
                  ],
                  if (onInterest != null) ...[
                    const SizedBox(height: 11),
                    FilledButton.icon(
                      onPressed: busy || offer.articleId == null
                          ? null
                          : onInterest,
                      icon: busy
                          ? const SizedBox.square(
                              dimension: 16,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.handshake_outlined, size: 18),
                      label: Text(
                        busy
                            ? 'Création du Deal Room…'
                            : offer.articleId == null
                                ? 'Contact Layer requis'
                                : 'Intéressé · ouvrir le Deal Room',
                      ),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(46),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
}

class _OfferBadge extends StatelessWidget {
  const _OfferBadge(this.text, this.background, this.foreground);
  final String text;
  final Color background;
  final Color foreground;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
            color: background, borderRadius: BorderRadius.circular(99)),
        child: Text(text,
            style: TextStyle(
                color: foreground,
                fontSize: 9.5,
                fontWeight: FontWeight.w800)),
      );
}

class _JourneyNotice extends StatelessWidget {
  const _JourneyNotice({
    required this.icon,
    required this.text,
    required this.accent,
  });
  final IconData icon;
  final String text;
  final Color accent;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: .07),
          borderRadius: BorderRadius.circular(17),
          border: Border.all(color: accent.withValues(alpha: .18)),
        ),
        child: Row(
          children: [
            Icon(icon, color: accent, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(text,
                  style: const TextStyle(
                      color: WaouhPalette.ink,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
}
