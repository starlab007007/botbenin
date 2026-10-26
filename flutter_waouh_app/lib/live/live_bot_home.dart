import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'avatar/bot_character.dart';
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_quick_ask.dart';
import 'live_theme.dart';
import 'live_avatar_autonomy.dart';

/// UI V3 — Bot, cœur de WAOUH, sur l'accueil Flutter (parité avec le Web
/// `src/components/waouh/bot/*`). Purement visuel : aucune donnée serveur
/// n'est créée ni modifiée ici.

/// Taille de texte / d'icône proportionnelle à la largeur
/// (téléphone compact 0,92 → tablette 1,22).
double liveBotUiScale(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  return (width / 390).clamp(0.92, 1.22).toDouble();
}

/// Trois messages courts d'accueil, prononcés l'un après l'autre.
/// [thirdLine] remplace le troisième message quand Bot a une activité réelle.
List<String> liveBotGreetingLines(String? firstName, [String? thirdLine]) {
  final name = (firstName ?? '').trim().split(RegExp(r'\s+')).first;
  final named = name.isNotEmpty && name.toLowerCase() != 'waouhapp';
  final third = (thirdLine ?? '').trim();
  return [
    named ? 'Bonjour $name, je suis Bot.' : 'Bonjour, je suis Bot.',
    'Je cherche, compare et négocie pour vous.',
    third.isNotEmpty
        ? third
        : "Dites-moi ce qu'il vous faut, je m'occupe du reste.",
  ];
}

/// Troisième message selon l'activité réelle (missions ou Deal Rooms suivies).
String? liveBotActivityLine({int missions = 0, int deals = 0}) {
  if (missions > 0) {
    return "J'ai $missions mission${missions > 1 ? 's' : ''} en cours pour vous.";
  }
  if (deals > 0) {
    return 'Je suis $deals Deal Room${deals > 1 ? 's' : ''} pour vous.';
  }
  return null;
}

/// Question posée par Bot à la fin de l'accueil.
const liveBotQuestion = 'On commence par quoi ?';

/// Expression de Bot pendant l'accueil : salut, parole, question.
BotExpression liveBotGreetingExpression({
  required int shown,
  required int lineCount,
  required bool instant,
  int missions = 0,
  int approvals = 0,
}) {
  if (instant || shown > lineCount) {
    if (approvals > 0) return BotExpression.ask;
    if (missions > 0) return BotExpression.work;
    return instant ? BotExpression.idle : BotExpression.ask;
  }
  if (shown == 0) return BotExpression.hello;
  if (shown < lineCount) return BotExpression.talk;
  return BotExpression.ask;
}

class BotHomeHero extends StatefulWidget {
  const BotHomeHero({
    super.key,
    required this.avatarName,
    required this.firstName,
    required this.missionCount,
    required this.approvalCount,
    required this.activeDeals,
    required this.onAvatar,
    required this.onMissions,
    required this.onAsk,
    required this.onFindOpportunity,
    required this.onNegotiate,
    this.onPrompt,
  });

  final String avatarName;
  final String? firstName;
  final int missionCount;
  final int approvalCount;
  final int activeDeals;
  final VoidCallback onAvatar;
  final VoidCallback onMissions;
  final VoidCallback onAsk;
  final VoidCallback onFindOpportunity;
  final VoidCallback onNegotiate;

  /// Ouvre la conversation WAOUH avec un début de demande (choix rapides).
  final ValueChanged<String>? onPrompt;

  /// L'accueil animé n'est joué qu'une fois par lancement de l'application.
  static bool greetingPlayed = false;

  @override
  State<BotHomeHero> createState() => _BotHomeHeroState();
}

class _BotHomeHeroState extends State<BotHomeHero> {
  final _prompt = TextEditingController();
  @override
  void dispose() {
    _prompt.dispose();
    super.dispose();
  }

  void _askQuick(LiveQuickAskKind kind) {
    showLiveQuickAsk(context, kind).then((path) {
      if (path != null && mounted) context.push(path);
    });
  }

  void _submit() {
    final value = _prompt.text.trim();
    if (value.isEmpty) return;
    context.push(
      Uri(
        path: '/app/nexus',
        queryParameters: {
          'q': value,
          'go': '1',
          'mode': 'auto',
          'kind': 'trouver',
        },
      ).toString(),
    );
    _prompt.clear();
  }

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    final first = (widget.firstName ?? '').trim().split(RegExp(r'\s+')).first;
    final named = first.isNotEmpty && first.toLowerCase() != 'waouhapp';
    final count = widget.missionCount;
    return Container(
      key: const ValueKey('avatar-premium-home'),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: avatarPremiumBg,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Votre Avatar',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: avatarPremiumInk,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'WAOUH, à vos côtés.',
                      style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Paramétrer mon avatar',
                onPressed: widget.onAvatar,
                icon: const Icon(Icons.tune_rounded, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Center(
            child: Semantics(
              label: 'Ouvrir mon avatar',
              button: true,
              child: GestureDetector(
                onTap: widget.onAvatar,
                child: LiveAvatarVisual(
                  preset: avatar.profile.preset,
                  expression: widget.approvalCount > 0
                      ? BotExpression.ask
                      : count > 0
                      ? BotExpression.work
                      : BotExpression.idle,
                  size: 84,
                  showStatusBadge: true,
                ),
              ),
            ),
          ),
          const SizedBox(height: 11),
          Text(
            '${avatar.name} · À vos côtés',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: avatarPremiumMuted,
            ),
          ),
          const SizedBox(height: 18),
          Container(
            key: const ValueKey('avatar-greeting-below'),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: avatarPremiumLine),
              boxShadow: [
                BoxShadow(
                  color: avatarPremiumInk.withValues(alpha: .04),
                  blurRadius: 14,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Column(
              children: [
                Text(
                  named ? 'Bonjour $first' : 'Bonjour',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w700,
                    color: avatarPremiumInk,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Que puis-je faire pour vous ?',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: avatarPremiumMuted),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: avatarPremiumLine),
              borderRadius: BorderRadius.circular(19),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _prompt,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(
                      hintText: 'Décrivez votre besoin…',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.all(7),
                    ),
                    style: const TextStyle(fontSize: 15),
                  ),
                ),
                const SizedBox(width: 7),
                IconButton.filled(
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF008B87),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(13),
                    ),
                  ),
                  tooltip: 'Démarrer ma demande',
                  onPressed: _submit,
                  icon: const Icon(Icons.arrow_upward, size: 20),
                ),
              ],
            ),
          ),
          const SizedBox(height: 13),
          for (final row in [
            [
              (
                LiveQuickAskKind.acheter,
                'Acheter',
                Icons.shopping_bag_outlined,
              ),
              (LiveQuickAskKind.vendre, 'Vendre', Icons.sell_outlined),
            ],
            [
              (LiveQuickAskKind.trouver, 'Trouver', Icons.travel_explore),
              (
                LiveQuickAskKind.demander,
                'Demander',
                Icons.chat_bubble_outline,
              ),
            ],
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  for (var i = 0; i < row.length; i++) ...[
                    if (i > 0) const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: avatarPremiumInk,
                          side: const BorderSide(color: avatarPremiumLine),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 14,
                          ),
                        ),
                        onPressed: () => _askQuick(row[i].$1),
                        child: Row(
                          children: [
                            Container(
                              width: 30,
                              height: 35,
                              decoration: BoxDecoration(
                                color: const Color(0xFFEDF1FF),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                row[i].$3,
                                size: 19,
                                color: avatarPremiumBlue,
                              ),
                            ),
                            const SizedBox(width: 7),
                            Expanded(
                              child: Text(
                                row[i].$2,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          if (count > 0 || widget.approvalCount > 0)
            Container(
              margin: const EdgeInsets.only(top: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFEDF1FF),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Material(
                type: MaterialType.transparency,
                child: ListTile(
                  dense: true,
                  onTap: widget.onMissions,
                  leading: const Icon(
                    Icons.circle,
                    size: 8,
                    color: Color(0xFF008B87),
                  ),
                  title: Text(
                    widget.approvalCount > 0
                        ? '${widget.approvalCount} décision(s) à valider'
                        : '$count mission${count > 1 ? 's' : ''} en cours',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  subtitle: const Text(
                    'Voir l’activité et la prochaine action',
                    style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
                  ),
                  trailing: const Icon(Icons.north_east, size: 18),
                ),
              ),
            ),
          TextButton.icon(
            onPressed: widget.onAvatar,
            icon: const Icon(Icons.verified_user_outlined, size: 15),
            label: const Text(
              'Mon Avatar, mes règles',
              style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
            ),
          ),
        ],
      ),
    );
  }
}

class BotWorkingStrip extends StatefulWidget {
  const BotWorkingStrip({super.key, required this.activeDeals});
  final int activeDeals;

  @override
  State<BotWorkingStrip> createState() => _BotWorkingStripState();
}

class _BotWorkingStripState extends State<BotWorkingStrip> {
  Timer? _timer;
  int _index = 0;

  List<(IconData, String)> get _signals => [
    (Icons.radar_rounded, 'NEXUS explore les annonces près de vous'),
    (Icons.auto_awesome_rounded, 'Signal Fabric classe les meilleures offres'),
    (
      Icons.verified_user_outlined,
      'Contact protégé : vos numéros restent privés',
    ),
    if (widget.activeDeals > 0)
      (
        Icons.handshake_outlined,
        '${widget.activeDeals} Deal Room${widget.activeDeals > 1 ? 's' : ''} '
            'suivie${widget.activeDeals > 1 ? 's' : ''} en direct',
      ),
  ];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 3200), (_) {
      if (mounted) setState(() => _index++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final k = liveBotUiScale(context);
    final signals = _signals;
    final current = signals[_index % signals.length];
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12 * k, vertical: 9 * k),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD1FAE5)),
      ),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: const BoxDecoration(
              color: Color(0xFF10B981),
              shape: BoxShape.circle,
            ),
          ),
          SizedBox(width: 8 * k),
          Text(
            'BOT TRAVAILLE',
            style: TextStyle(
              color: const Color(0xFF047857),
              fontSize: 11 * k,
              letterSpacing: .8,
              fontWeight: FontWeight.w900,
            ),
          ),
          SizedBox(width: 10 * k),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 420),
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(-.06, 0),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              ),
              child: Row(
                key: ValueKey(current.$2),
                children: [
                  Icon(
                    current.$1,
                    size: 16 * k,
                    color: const Color(0xFF0891B2),
                  ),
                  SizedBox(width: 6 * k),
                  Expanded(
                    child: Text(
                      current.$2,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: const Color(0xFF475569),
                        fontSize: 12.5 * k,
                        fontWeight: FontWeight.w600,
                      ),
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

/// WAOUH One — le moteur commerce, en accès direct sous Bot.
class WaouhOneQuickCard extends StatelessWidget {
  const WaouhOneQuickCard({
    super.key,
    required this.onOpen,
    required this.onIntent,
  });

  final VoidCallback onOpen;
  final ValueChanged<String> onIntent;

  @override
  Widget build(BuildContext context) {
    final k = liveBotUiScale(context);
    const tiles = [
      (
        Icons.shopping_cart_outlined,
        'Acheter',
        'Je veux acheter ',
        Color(0xFF059669),
      ),
      (Icons.sell_outlined, 'Vendre', 'Je vends : ', Color(0xFF2563EB)),
      (Icons.search_rounded, 'Chercher', 'Je cherche ', Color(0xFF7C3AED)),
      (
        Icons.compare_arrows_rounded,
        'Comparer',
        'Compare les meilleures options pour ',
        Color(0xFFD97706),
      ),
    ];
    return Container(
      padding: EdgeInsets.all(14 * k),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFECFDF5), Colors.white, Color(0xFFECFEFF)],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD1FAE5)),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: onOpen,
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                Container(
                  width: 44 * k,
                  height: 44 * k,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    Icons.shopping_bag_outlined,
                    color: Colors.white,
                    size: 23 * k,
                  ),
                ),
                SizedBox(width: 11 * k),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WAOUH One',
                        style: TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 18 * k,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -.3,
                        ),
                      ),
                      Text(
                        'Achetez, vendez, comparez et négociez en confiance.',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 11.5 * k,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: WaouhPalette.muted,
                ),
              ],
            ),
          ),
          SizedBox(height: 12 * k),
          Row(
            children: [
              for (var i = 0; i < tiles.length; i++) ...[
                if (i > 0) SizedBox(width: 7 * k),
                Expanded(
                  child: Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      onTap: () => onIntent(tiles[i].$3),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 10 * k),
                        child: Column(
                          children: [
                            Container(
                              width: 34 * k,
                              height: 34 * k,
                              decoration: BoxDecoration(
                                color: tiles[i].$4.withValues(alpha: .10),
                                borderRadius: BorderRadius.circular(11),
                              ),
                              child: Icon(
                                tiles[i].$1,
                                size: 19 * k,
                                color: tiles[i].$4,
                              ),
                            ),
                            SizedBox(height: 5 * k),
                            Text(
                              tiles[i].$2,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: WaouhPalette.ink,
                                fontSize: 11.5 * k,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
