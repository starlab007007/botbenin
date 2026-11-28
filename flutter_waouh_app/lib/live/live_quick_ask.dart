import 'live_smart_sale.dart';
import '../main.dart' as legacy;
import 'live_nexus_service.dart';
import 'live_guest_action_gate.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'access_policy.dart';
import 'avatar/bot_character.dart' show botAvatarAsset;
import 'live_city_field.dart';
import 'live_controller.dart';
import 'live_guided_ask.dart';
import 'live_inbox_production.dart' show LiveInboxProductionScreen;

/// Formulaire express (parité Web `WaouhQuickAsk`) : un champ, la ville et le
/// budget n'apparaissent que quand ils servent. Retourne le chemin à ouvrir.
enum LiveQuickAskKind {
  acheter,
  vendre,
  trouver,
  demander,
  opportunite,
  service,
  prestation,
}

class _Copy {
  const _Copy(
    this.title,
    this.line,
    this.field,
    this.chips,
    this.budget,
    this.route,
  );
  final String title, line, field, route;
  final List<String> chips;
  final String? budget;
}

const _copy = <LiveQuickAskKind, _Copy>{
  LiveQuickAskKind.acheter: _Copy(
    'Acheter',
    'Que cherchez-vous ?',
    'Ex. iPhone 13, moto, climatiseur…',
    ['Samsung S25', 'Moto d’occasion', 'Climatiseur 1,5 CV'],
    'Budget max (FCFA)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.vendre: _Copy(
    'Vendre',
    'Que vendez-vous ?',
    'Ex. mon téléphone, 10 tonnes de soja…',
    ['Mon téléphone', '10 tonnes de soja', 'Ma moto'],
    'Prix souhaité (FCFA)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.trouver: _Copy(
    'Trouver',
    'Bot cherche partout pour vous.',
    'Produit, service, vendeur ou acheteur…',
    [
      'Un S25 fiable à Cotonou',
      'Vendre 10 tonnes de soja',
      'Plombier à Porto-Novo',
    ],
    'Budget (FCFA, facultatif)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.opportunite: _Copy(
    'Opportunité',
    'Quelle opportunité cherchez-vous ?',
    'Ex. appel d’offres, emploi, bourse, partenariat…',
    ['Appel d’offres BTP', 'Stage en informatique', 'Subvention agricole'],
    null,
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.service: _Copy(
    'Service',
    'De quel service avez-vous besoin ?',
    'Ex. plombier, électricien, livreur…',
    ['Plombier', 'Réparation de climatiseur', 'Livreur fiable'],
    'Budget max (FCFA)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.prestation: _Copy(
    'Prestation',
    'Quelle prestation voulez-vous confier ?',
    'Ex. site web, traiteur pour 50 personnes…',
    [
      'Création d’un site vitrine',
      'Traiteur pour 50 personnes',
      'Logo et charte graphique',
    ],
    'Budget max (FCFA)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.demander: _Copy(
    'Demander',
    'Dites-le comme vous voulez.',
    'De quoi avez-vous besoin ?',
    ['Un livreur fiable', 'Traiteur pour 50 personnes', 'Un plombier'],
    null,
    '/app/chat/waouh',
  ),
};

/// Les 4 actions pilotent toutes NEXUS, chacune dans le bon mode.
const _modeFor = <LiveQuickAskKind, String>{
  LiveQuickAskKind.acheter: 'find_sellers',
  LiveQuickAskKind.vendre: 'find_buyers',
  LiveQuickAskKind.trouver: 'auto',
  LiveQuickAskKind.demander: 'auto',
  LiveQuickAskKind.opportunite: 'auto',
  LiveQuickAskKind.service: 'auto',
  LiveQuickAskKind.prestation: 'auto',
};

LiveWaouhController? _guidedController(BuildContext context) {
  try {
    return context.read<LiveWaouhController>();
  } catch (_) {
    return null;
  }
}

/// Ouvre un ancien lien de recherche guidée : toujours le Chat. Compte connecté : la demande part par
/// son moteur (même recherche, mêmes fiches, même ouverture de l'échange) ; Vendre ouvre sa fiche de vente.
void liveOpenGuidedPath(
  BuildContext context,
  String path, {
  bool replace = false,
}) {
  void open(String to) =>
      replace ? context.pushReplacement(to) : context.push(to);
  final uri = Uri.parse(path);
  final controller = _guidedController(context);
  if (controller == null || !liveGuidedIsEntryPath(uri)) {
    open(path);
    return;
  }
  if (!controller.auth.signedIn && liveGuidedAskFromUri(uri) != null) {
    // The public Nexus redirect reads the same draft after sign-in, without
    // triggering an autonomous mission.
    open(buildWaouhAuthRoute(uri.replace(path: '/app/nexus').toString()));
    return;
  }
  if (controller.auth.signedIn) {
    if (liveGuidedIsSell(uri)) {
      controller.setComposerSeed(
        '',
        meta: const <String, dynamic>{'open_sell': true},
      );
    } else {
      final ask = liveGuidedAskFromUri(uri);
      if (ask != null) {
        controller.setComposerSeed(
          ask.text,
          meta: <String, dynamic>{
            'source': 'flutter_guided_search',
            'origin_surface': 'flutter_guided_search',
            'auto_send': true,
            'guided_ask': ask.toMap(),
          },
        );
      }
    }
  }
  open('/app/chat/waouh');
}

/// Route des anciens liens (`/app/nexus`, `/app/avatar/acheter`…) : ouvre le Chat aussitôt.
class LiveGuidedRedirect extends StatefulWidget {
  const LiveGuidedRedirect({super.key, required this.uri});
  final Uri uri;
  @override
  State<LiveGuidedRedirect> createState() => _LiveGuidedRedirectState();
}

class _LiveGuidedRedirectState extends State<LiveGuidedRedirect> {
  /// Menu « Recherche guidée » sans demande : l'accueil de l'Avatar (Acheter, Vendre, Trouver…),
  /// dont les entrées lancent la recherche dans le Chat, résultats en continu.
  bool get _showHome =>
      widget.uri.path.startsWith('/app/nexus') &&
      !liveGuidedIsSell(widget.uri) &&
      liveGuidedAskFromUri(widget.uri) == null;

  @override
  void initState() {
    super.initState();
    if (_showHome) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted)
        liveOpenGuidedPath(context, widget.uri.toString(), replace: true);
    });
  }

  @override
  Widget build(BuildContext context) => _showHome
      ? const LiveInboxProductionScreen()
      : const Scaffold(body: Center(child: CircularProgressIndicator()));
}

/// Entrée guidée de l'accueil (Acheter, Vendre, Trouver, Opportunité, Service, Prestation).
/// La vente demande le choix de délégation avant la publication.
Future<void> liveGuidedQuickAsk(
  BuildContext context,
  LiveQuickAskKind kind, {
  String initialQuery = "",
}) async {
  final path = await showLiveQuickAsk(
    context,
    kind,
    initialQuery: initialQuery,
  );
  if (path == null || !context.mounted) return;
  if (Uri.parse(path).queryParameters.containsKey('sale_draft')) {
    context.push(path);
    return;
  }
  liveOpenGuidedPath(context, path);
}

/// Ouvre le formulaire et renvoie l'URL (avec ?q=…&go=1) ou null.
Future<String?> showLiveQuickAsk(
  BuildContext context,
  LiveQuickAskKind kind, {
  String initialQuery = "",
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    constraints: BoxConstraints(
      maxHeight:
          MediaQuery.sizeOf(context).height *
          (kind == LiveQuickAskKind.vendre ? .92 : .90),
    ),
    builder: (_) => kind == LiveQuickAskKind.vendre
        ? const LiveSmartSaleSheet()
        : _QuickAskSheet(kind: kind, initialQuery: initialQuery),
  );
}

class _QuickAskSheet extends StatefulWidget {
  const _QuickAskSheet({required this.kind, required this.initialQuery});
  final LiveQuickAskKind kind;
  final String initialQuery;
  @override
  State<_QuickAskSheet> createState() => _QuickAskSheetState();
}

class _QuickAskSheetState extends State<_QuickAskSheet> {
  late final _q = TextEditingController(text: widget.initialQuery);
  final _city = TextEditingController();
  final _budget = TextEditingController();

  var _busy = false;
  String? _error;

  bool get _needsBudget => const {
    LiveQuickAskKind.acheter,
    LiveQuickAskKind.service,
    LiveQuickAskKind.prestation,
  }.contains(widget.kind);

  String get _botSummary => switch (widget.kind) {
    LiveQuickAskKind.acheter =>
      'Bot compare et négocie dans votre budget. Vous validez l’accord.',
    LiveQuickAskKind.service =>
      'Bot demande des devis comparables. Vous validez le prestataire.',
    LiveQuickAskKind.prestation =>
      'Bot compare les conditions et le coût. Vous validez les modalités.',
    LiveQuickAskKind.opportunite => 'Bot surveille les annonces et les échéances. Vous choisissez où déposer votre dossier.',
    LiveQuickAskKind.demander => 'Bot cherche et compare les réponses à votre besoin. Vous choisissez la suite.',
    _ => 'Bot élargit la recherche et vous prévient. Vous choisissez la piste.',
  };

  Future<void> _delegate() async {
    if (_busy || _q.text.trim().length < 3) return;
    final owner = legacy.supabase.auth.currentUser?.id;
    if (owner == null) {
      await requireLiveAuthentication(
        context,
        next: '/app/chat/waouh',
        actionLabel: 'confier une mission à Bot',
      );
      return;
    }
    final budget = liveGuidedBudget(_budget.text);
    if (_needsBudget && budget == null) {
      setState(
        () => _error = 'Indiquez votre budget maximal pour confier la mission.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await LiveNexusService(legacy.supabase).startGuidedMission(
        goal: _q.text.trim(),
        city: _city.text.trim(),
        budgetMax: budget?.toDouble(),
        expectedOwner: owner,
        mode: widget.kind == LiveQuickAskKind.acheter ? 'buy' : 'ask',
        discoveryKind: switch (widget.kind) {
          LiveQuickAskKind.acheter => 'purchase',
          LiveQuickAskKind.service => 'service',
          LiveQuickAskKind.prestation => 'project',
          LiveQuickAskKind.opportunite => 'opportunity',
          _ => null,
        },
        completionGoal: _needsBudget ? 'agreement' : 'recommendations',
      );
      if (mounted)
        Navigator.pop(
          context,
          Uri(
            path: '/app/missions',
            queryParameters: {'mandate': id},
          ).toString(),
        );
    } catch (error) {
      if (mounted)
        setState(
          () => _error = error is NexusApiException
              ? error.message
              : 'La mission n’a pas pu être démarrée. Réessayez.',
        );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  _Copy get c => _copy[widget.kind]!;

  @override
  void dispose() {
    _q.dispose();
    _city.dispose();
    _budget.dispose();
    super.dispose();
  }

  void _go() {
    final text = _q.text.trim();
    if (text.isEmpty || _busy) return;
    final params = <String, String>{
      'q': text,
      'go': '1',
      'mode': _modeFor[widget.kind]!,
      'kind': widget.kind.name,
    };
    if (_city.text.trim().isNotEmpty) params['city'] = _city.text.trim();
    final b = _budget.text.replaceAll(RegExp(r'\D'), '');
    if (b.isNotEmpty) params['budget'] = b;
    final uri = Uri(path: c.route, queryParameters: params);
    Navigator.of(context).pop(uri.toString());
  }

  static const _line = Color(0xFFDBEAFE);
  static const _ink = Color(0xFF0F172A);
  static const _muted = Color(0xFF334155);
  static const _blue = Color(0xFF2563EB);

  InputDecoration _field(String hint) => InputDecoration(
    hintText: hint,
    hintMaxLines: 1,
    hintStyle: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
    filled: true,
    fillColor: Colors.white,
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: _line),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: _blue, width: 2),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    final hasText = _q.text.trim().isNotEmpty;
    final connected = _guidedController(context)?.auth.signedIn ?? false;
    return PopScope(
      canPop: !_busy,
      child: Padding(
        padding: EdgeInsets.only(bottom: inset),
        child: DecoratedBox(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            border: Border.fromBorderSide(BorderSide(color: Color(0xFFE2E8F0))),
          ),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 512),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Image.asset(
                            botAvatarAsset,
                            width: 56,
                            height: 56,
                            fit: BoxFit.contain,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  c.title,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w900,
                                    color: _ink,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    border: Border.all(color: _line),
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(4),
                                      topRight: Radius.circular(16),
                                      bottomLeft: Radius.circular(16),
                                      bottomRight: Radius.circular(16),
                                    ),
                                  ),
                                  child: Text(
                                    c.line,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF1E3A8A),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          IconButton.outlined(
                            tooltip: 'Fermer',
                            style: IconButton.styleFrom(
                              minimumSize: const Size.square(36),
                              side: const BorderSide(color: _line),
                              foregroundColor: const Color(0xFF64748B),
                            ),
                            onPressed: _busy
                                ? null
                                : () => Navigator.pop(context),
                            icon: const Icon(Icons.close_rounded, size: 16),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _q,
                        autofocus: true,
                        textInputAction: TextInputAction.search,
                        onChanged: (_) => setState(() {}),
                        onSubmitted: (_) => _go(),
                        style: const TextStyle(fontSize: 14, color: _ink),
                        decoration: _field(c.field).copyWith(
                          constraints: const BoxConstraints(minHeight: 48),
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (!hasText)
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            for (final chip in c.chips)
                              OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(0, 34),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  side: const BorderSide(color: _line),
                                  foregroundColor: const Color(0xFF1D4ED8),
                                  textStyle: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                onPressed: () => setState(() => _q.text = chip),
                                child: Text(chip),
                              ),
                          ],
                        )
                      else
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: LiveCityField(
                                controller: _city,
                                decoration: _field('Ville ou quartier'),
                              ),
                            ),
                            if (c.budget != null) ...[
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: _budget,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                  ],
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: _ink,
                                  ),
                                  decoration: _field(c.budget!).copyWith(
                                    constraints: const BoxConstraints(
                                      minHeight: 44,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                              ),
                              child: Text(
                                _botSummary,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: _muted,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            FilledButton.icon(
                              onPressed: _q.text.trim().length >= 3 && !_busy
                                  ? _delegate
                                  : null,
                              style: FilledButton.styleFrom(
                                minimumSize: const Size(0, 48),
                                backgroundColor: _blue,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                textStyle: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              icon: const Icon(
                                Icons.auto_awesome_rounded,
                                size: 16,
                              ),
                              label: Text(
                                _busy
                                    ? 'Activation du mandat…'
                                    : connected
                                    ? 'Confier à Bot'
                                    : 'Se connecter pour confier à Bot',
                                textAlign: TextAlign.center,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton.icon(
                              onPressed: hasText && !_busy ? _go : null,
                              style: TextButton.styleFrom(
                                minimumSize: const Size(0, 44),
                                foregroundColor: _muted,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              icon: const Icon(Icons.search_rounded, size: 16),
                              label: const Text('Voir les résultats moi-même'),
                            ),
                            if (_error != null)
                              Text(
                                _error!,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFFBE123C),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
