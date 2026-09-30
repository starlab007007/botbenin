import 'dart:async';

import 'package:flutter/material.dart';

import 'live_models.dart';

/// L'avatar guide (parité Web : `src/lib/waouh/avatarGuide.ts`) — accueil à l'ouverture, points réguliers, réglages.
/// Le texte (2 à 3 phrases) et les boutons sont composés côté serveur (`waouh-avatar-briefing`) ; ici on les met en scène.

const List<LiveAvatarCadenceOption> liveAvatarCadenceOptions = [
  LiveAvatarCadenceOption('off', 'Jamais', 'Je ne fais le point que si vous me le demandez.'),
  LiveAvatarCadenceOption('hourly', 'Toutes les heures', 'Un point court, seulement s\'il y a du nouveau.'),
  LiveAvatarCadenceOption('every_4h', 'Toutes les 4 heures', 'Un rythme calme pour suivre vos offres.'),
  LiveAvatarCadenceOption('daily', 'Chaque jour', 'Un point par jour, hors heures calmes.'),
  LiveAvatarCadenceOption('weekly', 'Chaque semaine', 'Un bilan hebdomadaire de mes activités.'),
];

class LiveAvatarCadenceOption {
  const LiveAvatarCadenceOption(this.value, this.label, this.hint);
  final String value;
  final String label;
  final String hint;
}

class LiveBriefingItem {
  const LiveBriefingItem({required this.label, required this.detail, required this.tone});
  final String label;
  final String detail;

  /// `ok` | `warn` | `info`
  final String tone;
}

class LiveBriefingSection {
  const LiveBriefingSection({required this.key, required this.title, required this.items});
  final String key;
  final String title;
  final List<LiveBriefingItem> items;
}

class LiveBriefingAction {
  const LiveBriefingAction({required this.id, required this.label});
  final String id;
  final String label;
}

class LiveAvatarBriefing {
  const LiveAvatarBriefing({
    required this.kind,
    required this.sentences,
    required this.sections,
    required this.actions,
    required this.tip,
    required this.generatedAt,
  });
  final String kind;
  final List<String> sentences;
  final List<LiveBriefingSection> sections;
  final List<LiveBriefingAction> actions;
  final String tip;
  final DateTime generatedAt;

  String get kindLabel => switch (kind) {
        'first' => 'Bienvenue',
        'welcome' => 'Bon retour',
        'digest' => 'Point régulier',
        _ => 'Point de l\'avatar',
      };
}

/// Lecture défensive : toute donnée inattendue donne `null`, jamais une exception dans la timeline.
LiveAvatarBriefing? liveParseAvatarBriefing(Object? value) {
  if (value is! Map) return null;
  final sentences = <String>[
    if (value['sentences'] is List)
      for (final s in (value['sentences'] as List))
        if ('$s'.trim().isNotEmpty) '$s'.trim(),
  ].take(3).toList();
  if (sentences.length < 2) return null;

  final sections = <LiveBriefingSection>[];
  if (value['sections'] is List) {
    for (final raw in (value['sections'] as List)) {
      if (raw is! Map) continue;
      final title = '${raw['title'] ?? ''}'.trim();
      final items = <LiveBriefingItem>[];
      if (raw['items'] is List) {
        for (final i in (raw['items'] as List)) {
          if (i is! Map) continue;
          final label = '${i['label'] ?? ''}'.trim();
          if (label.isEmpty) continue;
          final tone = '${i['tone'] ?? ''}';
          items.add(LiveBriefingItem(
            label: label,
            detail: '${i['detail'] ?? ''}'.trim(),
            tone: const {'ok', 'warn', 'info'}.contains(tone) ? tone : 'info',
          ));
        }
      }
      if (title.isNotEmpty && items.isNotEmpty) {
        sections.add(LiveBriefingSection(key: '${raw['key'] ?? ''}', title: title, items: items.take(3).toList()));
      }
    }
  }

  final actions = <LiveBriefingAction>[];
  if (value['actions'] is List) {
    for (final raw in (value['actions'] as List)) {
      if (raw is! Map) continue;
      final id = '${raw['id'] ?? ''}'.trim();
      if (id.isEmpty) continue;
      actions.add(LiveBriefingAction(id: id, label: '${raw['label'] ?? id}'.trim()));
    }
  }
  final kind = '${value['kind'] ?? ''}';
  return LiveAvatarBriefing(
    kind: const {'first', 'welcome', 'point', 'digest'}.contains(kind) ? kind : 'point',
    sentences: sentences,
    sections: sections.take(4).toList(),
    actions: actions.take(3).toList(),
    tip: '${value['tip'] ?? ''}'.trim(),
    generatedAt: DateTime.tryParse('${value['generatedAt'] ?? ''}')?.toLocal() ?? DateTime.now(),
  );
}

class LiveAvatarPrefs {
  const LiveAvatarPrefs({
    this.welcome = true,
    this.cadence = 'daily',
    this.quietStart = 21,
    this.quietEnd = 7,
    this.notifyEvents = true,
    this.notifyDigest = false,
    this.nextBriefingAt,
  });
  final bool welcome;
  final String cadence;
  final int quietStart;
  final int quietEnd;

  /// WhatsApp : évènements d'une offre (relance possible, voie ouverte, clôture). Actif par défaut.
  final bool notifyEvents;

  /// WhatsApp : bilans réguliers. Désactivé par défaut (le bilan reste dans le chat).
  final bool notifyDigest;
  final DateTime? nextBriefingAt;

  LiveAvatarPrefs copyWith({bool? welcome, String? cadence, int? quietStart, int? quietEnd, bool? notifyEvents, bool? notifyDigest}) => LiveAvatarPrefs(
        welcome: welcome ?? this.welcome,
        cadence: cadence ?? this.cadence,
        quietStart: quietStart ?? this.quietStart,
        quietEnd: quietEnd ?? this.quietEnd,
        notifyEvents: notifyEvents ?? this.notifyEvents,
        notifyDigest: notifyDigest ?? this.notifyDigest,
        nextBriefingAt: nextBriefingAt,
      );
}

LiveAvatarPrefs? liveParseAvatarPrefs(Object? value) {
  if (value is! Map) return null;
  int hour(Object? v, int d) {
    final n = v is num ? v.toInt() : int.tryParse('$v');
    return n != null && n >= 0 && n <= 23 ? n : d;
  }

  final cadence = '${value['cadence'] ?? ''}';
  return LiveAvatarPrefs(
    welcome: value['welcome'] is bool ? value['welcome'] as bool : true,
    cadence: liveAvatarCadenceOptions.any((o) => o.value == cadence) ? cadence : 'daily',
    quietStart: hour(value['quiet_start'], 21),
    quietEnd: hour(value['quiet_end'], 7),
    notifyEvents: value['notify_events'] is bool ? value['notify_events'] as bool : true,
    notifyDigest: value['notify_digest'] is bool ? value['notify_digest'] as bool : false,
    nextBriefingAt: DateTime.tryParse('${value['next_briefing_at'] ?? ''}')?.toLocal(),
  );
}

/// « Prochain point dans 3 h » / « demain » / « désactivés ».
String liveNextPointLabel(DateTime? at, String cadence, {DateTime? now}) {
  if (cadence == 'off') return 'Points réguliers désactivés';
  if (at == null) return 'Prochain point bientôt';
  final diff = at.difference(now ?? DateTime.now());
  if (diff.inSeconds <= 60) return 'Prochain point imminent';
  final hours = (diff.inMinutes / 60).round();
  if (hours < 1) return 'Prochain point dans moins d\'1 h';
  if (hours < 24) return 'Prochain point dans $hours h';
  final days = (hours / 24).round();
  return days == 1 ? 'Prochain point demain' : 'Prochain point dans $days jours';
}

String liveHourLabel(int h) => '${h.toString().padLeft(2, '0')} h';

/// Bulle de l'avatar dans le chat : seq (0…of-1) et of ; null pour tout autre message.
({int seq, int of})? liveAvatarBubbleInfo(Map<String, dynamic> meta) {
  if ('${meta['intent'] ?? ''}' != 'avatar_briefing') return null;
  final b = meta['avatar_bubble'];
  if (b is! Map) return null;
  final seq = b['seq'] is num ? (b['seq'] as num).toInt() : int.tryParse('${b['seq']}');
  final of = b['of'] is num ? (b['of'] as num).toInt() : int.tryParse('${b['of']}');
  if (seq == null || of == null || seq < 0 || of < 1 || seq >= of) return null;
  return (seq: seq, of: of);
}

/// Fenêtre « en direct » : au-delà, la bulle est de l'historique et s'affiche d'un coup.
const Duration liveAvatarLiveWindow = Duration(seconds: 15);

/// Délai avant d'afficher une bulle : l'avatar « écrit » (700 ms, puis 1,1 s de plus par bulle suivante).
Duration liveAvatarRevealDelay(Map<String, dynamic> meta, DateTime createdAt, DateTime now) {
  final info = liveAvatarBubbleInfo(meta);
  if (info == null || now.difference(createdAt) > liveAvatarLiveWindow) return Duration.zero;
  return Duration(milliseconds: 700 + info.seq * 1100);
}

/// Affichage séquencé des bulles de l'avatar (état conservé par l'écran de chat).
class LiveAvatarReveal {
  final Map<String, DateTime> _revealAt = {};

  /// Messages visibles à `now` ; `nextAt` : prochain instant où une bulle apparaît (null si rien n'attend).
  ({List<LiveMessage> visible, DateTime? nextAt}) filter(List<LiveMessage> messages, DateTime now) {
    final visible = <LiveMessage>[];
    DateTime? next;
    for (final m in messages) {
      final at = _revealAt.putIfAbsent(m.id, () => now.add(liveAvatarRevealDelay(m.meta, m.createdAt, now)));
      if (!at.isAfter(now)) {
        visible.add(m);
      } else if (next == null || at.isBefore(next)) {
        next = at;
      }
    }
    return (visible: visible, nextAt: next);
  }
}

/// « L'avatar écrit… » : trois points, sous la conversation, pendant que les bulles arrivent.
class LiveAvatarTypingRow extends StatelessWidget {
  const LiveAvatarTypingRow({super.key});
  @override
  Widget build(BuildContext context) => Padding(
        key: const ValueKey('avatar-typing'),
        padding: const EdgeInsets.fromLTRB(14, 2, 14, 6),
        child: Row(children: [
          const LiveAvatarOrb(size: 20),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE4EBF5))),
            child: const Text('L\'avatar écrit…', semanticsLabel: 'L\'avatar écrit', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ),
        ]),
      );
}

/// Tableau de mission : ce que l'avatar fait MAINTENANT (parité Web : `MissionBoard`).
class LiveMissionBoard {
  const LiveMissionBoard({
    this.searches = 0,
    this.missions = 0,
    this.contacted = 0,
    this.negotiations = 0,
    this.watching = 0,
    this.deals = 0,
    this.toAnswer = 0,
    this.needsYou = 0,
  });
  final int searches;
  final int missions;
  final int contacted;
  final int negotiations;
  final int watching;
  final int deals;
  final int toAnswer;
  final int needsYou;
}

/// Lecture défensive : compteurs entiers ≥ 0 (plafonnés), tout le reste ignoré.
LiveMissionBoard? liveParseMissionBoard(Object? value) {
  if (value is! Map) return null;
  int n(Object? v) {
    final x = v is num ? v : null;
    if (x == null || !x.isFinite || x <= 0) return 0;
    return x.floor().clamp(0, 9999);
  }

  return LiveMissionBoard(
    searches: n(value['searches']),
    missions: n(value['missions']),
    contacted: n(value['contacted']),
    negotiations: n(value['negotiations']),
    watching: n(value['watching']),
    deals: n(value['deals']),
    toAnswer: n(value['toAnswer']),
    needsYou: n(value['needsYou']),
  );
}

class LiveBoardChip {
  const LiveBoardChip(this.key, this.icon, this.label, this.count);
  final String key;
  final String icon;
  final String label;
  final int count;
}

/// Pastilles affichables : seulement ce qui est non nul, « à vous » d'abord.
List<LiveBoardChip> liveBoardChips(LiveMissionBoard b) {
  String plural(int n, String one, String many) => n > 1 ? many : one;
  final searches = b.searches + b.missions;
  return [
    LiveBoardChip('needsYou', '⚡', 'à vous', b.needsYou),
    LiveBoardChip('searches', '🔎', plural(searches, 'recherche', 'recherches'), searches),
    LiveBoardChip('contacted', '📨', plural(b.contacted, 'contact', 'contacts'), b.contacted),
    LiveBoardChip('negotiations', '🤝', plural(b.negotiations, 'négociation', 'négociations'), b.negotiations),
    LiveBoardChip('watching', '👁', plural(b.watching, 'veille', 'veilles'), b.watching),
    LiveBoardChip('deals', '📦', plural(b.deals, 'commande', 'commandes'), b.deals),
  ].where((c) => c.count > 0).toList();
}

/// Ouverture du briefing : au plus une fois par fenêtre de 30 min dans ce processus (le serveur limite aussi).
DateTime? _lastAutoOpen;
bool liveShouldAutoOpenAvatar({DateTime? now}) {
  final t = now ?? DateTime.now();
  final last = _lastAutoOpen;
  if (last != null && t.difference(last) < const Duration(minutes: 30)) return false;
  _lastAutoOpen = t;
  return true;
}

/// Tests uniquement.
void liveResetAvatarAutoOpen() => _lastAutoOpen = null;

typedef LiveAvatarInvoke = Future<Map<String, dynamic>?> Function(Map<String, dynamic> body);

class LiveAvatarBriefResult {
  const LiveAvatarBriefResult({required this.sent, required this.reason, this.briefing, this.prefs});
  final bool sent;
  final String reason;
  final LiveAvatarBriefing? briefing;
  final LiveAvatarPrefs? prefs;
}

/// Appels à `waouh-avatar-briefing` (jeton de l'utilisateur ; jamais d'identifiant dans le corps).
class LiveAvatarGuideService {
  LiveAvatarGuideService(this._invoke);
  final LiveAvatarInvoke _invoke;

  Future<Map<String, dynamic>?> _safe(Map<String, dynamic> body) async {
    try {
      final data = await _invoke(body);
      return data != null && data['ok'] == true ? data : null;
    } catch (_) {
      return null;
    }
  }

  Future<LiveAvatarBriefResult?> brief(String action, {String? sessionId}) async {
    final data = await _safe({'action': action, if (sessionId != null) 'session_id': sessionId});
    if (data == null) return null;
    return LiveAvatarBriefResult(
      sent: data['sent'] == true,
      reason: '${data['reason'] ?? ''}',
      briefing: liveParseAvatarBriefing(data['briefing']),
      prefs: liveParseAvatarPrefs(data['prefs']),
    );
  }

  Future<LiveMissionBoard?> status() async => liveParseMissionBoard((await _safe({'action': 'status'}))?['board']);

  Future<LiveAvatarPrefs?> getPrefs() async => liveParseAvatarPrefs((await _safe({'action': 'get_prefs'}))?['prefs']);

  Future<LiveAvatarPrefs?> savePrefs(Map<String, dynamic> patch) async =>
      liveParseAvatarPrefs((await _safe({'action': 'set_prefs', 'prefs': patch}))?['prefs']);
}

// ---------------------------------------------------------------------------
// Présentation
// ---------------------------------------------------------------------------
class LiveAvatarOrb extends StatefulWidget {
  const LiveAvatarOrb({super.key, this.size = 30, this.active = true});
  final double size;
  final bool active;
  @override
  State<LiveAvatarOrb> createState() => _LiveAvatarOrbState();
}

class _LiveAvatarOrbState extends State<LiveAvatarOrb> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400));

  @override
  void initState() {
    super.initState();
    if (widget.active) _pulse.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(LiveAvatarOrb old) {
    super.didUpdateWidget(old);
    if (widget.active && !_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    } else if (!widget.active && _pulse.isAnimating) {
      _pulse.stop();
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: AnimatedBuilder(
          animation: _pulse,
          builder: (_, __) => Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const RadialGradient(
                center: Alignment(-.4, -.4),
                colors: [Color(0xFFA7F3D0), Color(0xFF10B981), Color(0xFF0F766E)],
                stops: [0, .45, 1],
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: widget.active ? .25 + .3 * _pulse.value : .2),
                  blurRadius: 8 + 10 * (widget.active ? _pulse.value : 0),
                  spreadRadius: widget.active ? 2 * _pulse.value : 0,
                ),
              ],
            ),
          ),
        ),
      );
}

const _toneColor = {'ok': Color(0xFF10B981), 'warn': Color(0xFFF59E0B), 'info': Color(0xFF0EA5E9)};

String _clock(DateTime t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

/// Carte du point de l'avatar : accueil, 2 à 3 phrases, sections repliables, boutons, aide.
class LiveAvatarBriefingCard extends StatelessWidget {
  const LiveAvatarBriefingCard({super.key, required this.briefing, this.collapsed = false, this.onAction});
  final LiveAvatarBriefing briefing;
  final bool collapsed;
  final ValueChanged<String>? onAction;

  @override
  Widget build(BuildContext context) {
    if (collapsed) {
      return Container(
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF7),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFD1FAE5)),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Padding(padding: EdgeInsets.only(top: 2), child: LiveAvatarOrb(size: 14, active: false)),
          const SizedBox(width: 8),
          Expanded(
            child: Text.rich(
              TextSpan(children: [
                TextSpan(text: briefing.kindLabel, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF065F46))),
                TextSpan(text: ' · ${_clock(briefing.generatedAt)} · ', style: const TextStyle(color: Color(0xFF94A3B8))),
                TextSpan(text: briefing.sentences.skip(1).join(' ')),
              ]),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.3),
            ),
          ),
        ]),
      );
    }
    final rest = briefing.sentences.skip(1).toList();
    return Container(
      key: const ValueKey('avatar-briefing'),
      margin: const EdgeInsets.only(bottom: 10),
      constraints: const BoxConstraints(maxWidth: 560),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFA7F3D0)),
        boxShadow: [BoxShadow(color: const Color(0xFF10B981).withValues(alpha: .18), blurRadius: 26, offset: const Offset(0, 10), spreadRadius: -10)],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF059669), Color(0xFF0D9488), Color(0xFF0891B2)])),
          child: Row(children: [
            const LiveAvatarOrb(size: 28),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Votre avatar', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900)),
                Text('${briefing.kindLabel} · ${_clock(briefing.generatedAt)}',
                    style: const TextStyle(color: Color(0xCCFFFFFF), fontSize: 10, fontWeight: FontWeight.w500)),
              ]),
            ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(briefing.sentences.first,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, height: 1.3, color: Color(0xFF0F172A))),
            for (var i = 0; i < rest.length; i++) ...[
              const SizedBox(height: 6),
              Text(rest[i],
                  style: TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      fontWeight: i == rest.length - 1 ? FontWeight.w400 : FontWeight.w500,
                      color: i == rest.length - 1 ? const Color(0xFF334155) : const Color(0xFF1E293B))),
            ],
          ]),
        ),
        for (final section in briefing.sections)
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 6, 10, 0),
            // Material (et non un Container décoré) : le ListTile de l'ExpansionTile peint son fond sur le Material le plus proche.
            child: Material(
              color: const Color(0xFFF8FAFC),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFF1F5F9))),
              clipBehavior: Clip.antiAlias,
              child: Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  key: PageStorageKey('avatar-section-${section.key}-${briefing.generatedAt.microsecondsSinceEpoch}'),
                  initiallyExpanded: section.key == 'next',
                  dense: true,
                  tilePadding: const EdgeInsets.symmetric(horizontal: 12),
                  childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                  title: Row(children: [
                    Expanded(child: Text(section.title.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: .3, color: Color(0xFF475569)))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(10)),
                      child: Text('${section.items.length}', style: const TextStyle(fontSize: 10, color: Color(0xFF065F46), fontWeight: FontWeight.w700)),
                    ),
                  ]),
                  children: [
                    for (final item in section.items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Padding(
                            padding: const EdgeInsets.only(top: 5),
                            child: Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: _toneColor[item.tone])),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text.rich(TextSpan(children: [
                              TextSpan(text: item.label, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
                              if (item.detail.isNotEmpty) TextSpan(text: ' · ${item.detail}', style: const TextStyle(color: Color(0xFF64748B))),
                            ]), style: const TextStyle(fontSize: 12, height: 1.3)),
                          ),
                        ]),
                      ),
                  ],
                ),
              ),
            ),
          ),
        if (briefing.actions.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Wrap(spacing: 7, runSpacing: 7, children: [
              for (var i = 0; i < briefing.actions.length; i++)
                i == 0
                    ? FilledButton(
                        onPressed: onAction == null ? null : () => onAction!(briefing.actions[i].id),
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFF059669), minimumSize: const Size(0, 38), shape: const StadiumBorder()),
                        child: Text(briefing.actions[i].label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      )
                    : OutlinedButton(
                        onPressed: onAction == null ? null : () => onAction!(briefing.actions[i].id),
                        style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF065F46), side: const BorderSide(color: Color(0xFFA7F3D0)), minimumSize: const Size(0, 38), shape: const StadiumBorder()),
                        child: Text(briefing.actions[i].label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      ),
            ]),
          ),
        if (briefing.tip.isNotEmpty)
          Container(
            width: double.infinity,
            color: const Color(0xFFECFDF5),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            child: Text.rich(TextSpan(children: [
              const TextSpan(text: 'Je peux aussi : ', style: TextStyle(fontWeight: FontWeight.w900)),
              TextSpan(text: briefing.tip),
            ]), style: const TextStyle(fontSize: 11, height: 1.35, color: Color(0xFF064E3B))),
          ),
      ]),
    );
  }
}

/// Barre du guide : état, « Faire le point », réglages (accueil, cadence, heures calmes).
class LiveAvatarGuideBar extends StatefulWidget {
  const LiveAvatarGuideBar({super.key, required this.service, this.sessionId, this.autoOpen = true});
  final LiveAvatarGuideService service;
  final Future<String?> Function()? sessionId;
  final bool autoOpen;
  @override
  State<LiveAvatarGuideBar> createState() => LiveAvatarGuideBarState();
}

class LiveAvatarGuideBarState extends State<LiveAvatarGuideBar> {
  LiveAvatarPrefs? prefs;
  bool busy = false;
  LiveMissionBoard? board;
  bool boardLoaded = false;
  Timer? _boardTimer;

  /// Tableau de mission vivant : à l'ouverture, après chaque point, puis toutes les 60 s.
  Future<void> refreshBoard() async {
    final b = await widget.service.status();
    if (!mounted) return;
    setState(() {
      boardLoaded = true;
      if (b != null) board = b;
    });
  }

  @override
  void dispose() {
    _boardTimer?.cancel();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _boardTimer = Timer.periodic(const Duration(seconds: 60), (_) => unawaited(refreshBoard()));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.autoOpen && liveShouldAutoOpenAvatar()) {
        unawaited(runPoint('open'));
      } else {
        unawaited(_loadPrefs());
        unawaited(refreshBoard());
      }
    });
  }

  Future<void> _loadPrefs() async {
    final p = await widget.service.getPrefs();
    if (mounted && p != null) setState(() => prefs = p);
  }

  /// `open` (accueil) ou `now` (« Faire le point »). Le message arrive dans le chat par le flux temps réel.
  Future<void> runPoint(String action) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      final result = await widget.service.brief(action, sessionId: await widget.sessionId?.call());
      if (!mounted) return;
      if (result == null && action == 'now') {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('L\'avatar est momentanément indisponible. Réessayez.')));
      }
      if (result?.prefs != null) setState(() => prefs = result!.prefs);
    } finally {
      if (mounted) setState(() => busy = false);
    }
    unawaited(refreshBoard());
  }

  Future<void> openSettings() async {
    if (prefs == null) await _loadPrefs();
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(26))),
      builder: (_) => LiveAvatarSettingsSheet(
        initial: prefs ?? const LiveAvatarPrefs(),
        service: widget.service,
        onSaved: (p) {
          if (mounted) setState(() => prefs = p);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = prefs;
    final chips = board == null ? const <LiveBoardChip>[] : liveBoardChips(board!);
    return Container(
      key: const ValueKey('avatar-guide-bar'),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFFECFDF5), Colors.white, Color(0xFFECFEFF)]),
        border: Border(bottom: BorderSide(color: Color(0xFFD1FAE5))),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
      Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      child: Row(children: [
        LiveAvatarOrb(size: 22, active: !busy),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            const Text('Votre avatar', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF064E3B))),
            Text(
              busy ? 'Je fais le point…' : (p == null ? 'Prêt à vous guider' : liveNextPointLabel(p.nextBriefingAt, p.cadence)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
            ),
          ]),
        ),
        FilledButton(
          onPressed: busy ? null : () => runPoint('now'),
          style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF059669), minimumSize: const Size(0, 32), padding: const EdgeInsets.symmetric(horizontal: 14), shape: const StadiumBorder()),
          child: busy
              ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Faire le point', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
        ),
        IconButton(
          tooltip: 'Régler les points de l\'avatar',
          onPressed: openSettings,
          icon: const Icon(Icons.tune_rounded, size: 20, color: Color(0xFF64748B)),
        ),
      ]),
      ),
      SizedBox(
        key: const ValueKey('avatar-mission-board'),
        height: 30,
        child: chips.isEmpty
            ? Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    boardLoaded ? 'Aucune mission active — dites « Je cherche… » ou « Je vends… » et je m\'en occupe.' : 'Je regarde où j\'en suis…',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                  ),
                ),
              )
            : ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 6),
                itemCount: chips.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (_, i) {
                  final c = chips[i];
                  final urgent = c.key == 'needsYou';
                  return ActionChip(
                    key: ValueKey('avatar-chip-${c.key}'),
                    visualDensity: VisualDensity.compact,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    padding: EdgeInsets.zero,
                    backgroundColor: urgent ? const Color(0xFFFFFBEB) : Colors.white,
                    side: BorderSide(color: urgent ? const Color(0xFFFCD34D) : const Color(0xFFA7F3D0)),
                    label: Text('${c.icon} ${c.count} ${c.label}', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: urgent ? const Color(0xFF78350F) : const Color(0xFF064E3B))),
                    onPressed: busy ? null : () => runPoint('now'),
                  );
                },
              ),
      ),
      ]),
    );
  }
}

class LiveAvatarSettingsSheet extends StatefulWidget {
  const LiveAvatarSettingsSheet({super.key, required this.initial, required this.service, this.onSaved});
  final LiveAvatarPrefs initial;
  final LiveAvatarGuideService service;
  final ValueChanged<LiveAvatarPrefs>? onSaved;
  @override
  State<LiveAvatarSettingsSheet> createState() => _LiveAvatarSettingsSheetState();
}

class _LiveAvatarSettingsSheetState extends State<LiveAvatarSettingsSheet> {
  late LiveAvatarPrefs prefs = widget.initial;
  bool saving = false;
  bool saved = false;
  bool failed = false;

  Future<void> _update(LiveAvatarPrefs next, Map<String, dynamic> patch) async {
    final previous = prefs;
    setState(() {
      prefs = next;
      saving = true;
      saved = false;
      failed = false;
    });
    final result = await widget.service.savePrefs(patch);
    if (!mounted) return;
    setState(() {
      saving = false;
      if (result != null) {
        prefs = result;
        saved = true;
      } else {
        prefs = previous;
        failed = true;
      }
    });
    if (result != null) widget.onSaved?.call(result);
  }

  @override
  Widget build(BuildContext context) {
    final hours = List<int>.generate(24, (h) => h);
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(20, 18, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: const [
            LiveAvatarOrb(size: 26),
            SizedBox(width: 10),
            Text('Régler mon avatar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 4),
          const Text('Vous choisissez quand je fais le point. Je ne contacte jamais un vendeur sans votre tap.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.35)),
          const SizedBox(height: 10),
          SwitchListTile(
            key: const ValueKey('avatar-welcome-switch'),
            contentPadding: EdgeInsets.zero,
            value: prefs.welcome,
            onChanged: (v) => _update(prefs.copyWith(welcome: v), {'welcome': v}),
            title: const Text('Accueil à chaque ouverture', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            subtitle: const Text('Un mot de bienvenue et le point du moment.', style: TextStyle(fontSize: 11.5)),
          ),
          const SizedBox(height: 6),
          const Text('Me joindre sur WhatsApp', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const Text('Tout ce que j\'écris arrive d\'abord dans ce chat. WhatsApp double seulement ce que vous choisissez.',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3)),
          SwitchListTile(
            key: const ValueKey('avatar-notify-events-switch'),
            contentPadding: EdgeInsets.zero,
            dense: true,
            value: prefs.notifyEvents,
            onChanged: (v) => _update(prefs.copyWith(notifyEvents: v), {'notify_events': v}),
            title: const Text('Évènements de mes offres', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            subtitle: const Text('Relance possible, vendeur joignable, offre clôturée.', style: TextStyle(fontSize: 11)),
          ),
          SwitchListTile(
            key: const ValueKey('avatar-notify-digest-switch'),
            contentPadding: EdgeInsets.zero,
            dense: true,
            value: prefs.notifyDigest,
            onChanged: (v) => _update(prefs.copyWith(notifyDigest: v), {'notify_digest': v}),
            title: const Text('Bilans réguliers', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            subtitle: const Text('Le point de l\'avatar, sans ouvrir l\'app.', style: TextStyle(fontSize: 11)),
          ),
          const SizedBox(height: 6),
          const Text('Points réguliers', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 4),
          for (final option in liveAvatarCadenceOptions)
            InkWell(
              key: ValueKey('avatar-cadence-${option.value}'),
              borderRadius: BorderRadius.circular(14),
              onTap: () => _update(prefs.copyWith(cadence: option.value), {'cadence': option.value}),
              child: Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: prefs.cadence == option.value ? const Color(0xFFECFDF5) : Colors.white,
                  border: Border.all(color: prefs.cadence == option.value ? const Color(0xFF10B981) : const Color(0xFFE2E8F0)),
                ),
                child: Row(children: [
                  Icon(prefs.cadence == option.value ? Icons.radio_button_checked : Icons.radio_button_off, size: 18, color: prefs.cadence == option.value ? const Color(0xFF059669) : const Color(0xFF94A3B8)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(option.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      Text(option.hint, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    ]),
                  ),
                ]),
              ),
            ),
          if (prefs.cadence != 'off') ...[
            const SizedBox(height: 6),
            const Text('Heures calmes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 4),
            Row(children: [
              const Text('de '),
              DropdownButton<int>(
                key: const ValueKey('avatar-quiet-start'),
                value: prefs.quietStart,
                items: [for (final h in hours) DropdownMenuItem(value: h, child: Text(liveHourLabel(h)))],
                onChanged: (h) => h == null ? null : _update(prefs.copyWith(quietStart: h), {'quiet_start': h}),
              ),
              const Text('  à '),
              DropdownButton<int>(
                key: const ValueKey('avatar-quiet-end'),
                value: prefs.quietEnd,
                items: [for (final h in hours) DropdownMenuItem(value: h, child: Text(liveHourLabel(h)))],
                onChanged: (h) => h == null ? null : _update(prefs.copyWith(quietEnd: h), {'quiet_end': h}),
              ),
            ]),
            const Text('Pas de point régulier pendant ces heures (heure du Bénin).', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
          ],
          const SizedBox(height: 8),
          SizedBox(
            height: 18,
            child: Text(
              saving ? 'Enregistrement…' : failed ? 'Réglage non enregistré, réessayez.' : saved ? 'Réglages enregistrés' : '',
              style: TextStyle(fontSize: 11.5, color: failed ? const Color(0xFFDC2626) : const Color(0xFF047857)),
            ),
          ),
        ]),
      ),
    );
  }
}
