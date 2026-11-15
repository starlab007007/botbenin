import 'live_smart_sale.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'avatar/bot_character.dart' show botAvatarAsset;
import 'live_city_field.dart';
import 'live_controller.dart';
import 'live_guided_ask.dart';
import 'live_theme.dart';

/// Formulaire express (parité Web `WaouhQuickAsk`) : un champ, la ville et le
/// budget n'apparaissent que quand ils servent. Retourne le chemin à ouvrir.
enum LiveQuickAskKind { acheter, vendre, trouver, demander, opportunite, service, prestation }

class _Copy {
  const _Copy(
    this.title,
    this.line,
    this.field,
    this.chips,
    this.cta,
    this.budget,
    this.route,
  );
  final String title, line, field, cta, route;
  final List<String> chips;
  final String? budget;
}

const _copy = <LiveQuickAskKind, _Copy>{
  LiveQuickAskKind.acheter: _Copy(
    'Acheter',
    'Que cherchez-vous ?',
    'Ex. iPhone 13, moto, climatiseur…',
    ['Samsung S25', 'Moto d’occasion', 'Climatiseur 1,5 CV'],
    'Chercher pour moi',
    'Budget max (FCFA)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.vendre: _Copy(
    'Vendre',
    'Que vendez-vous ?',
    'Ex. mon téléphone, 10 tonnes de soja…',
    ['Mon téléphone', '10 tonnes de soja', 'Ma moto'],
    'Trouver des acheteurs',
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
    'Lancer la recherche',
    'Budget (FCFA, facultatif)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.opportunite: _Copy(
    'Opportunité',
    'Quelle opportunité cherchez-vous ?',
    'Ex. appel d’offres, emploi, bourse, partenariat…',
    ['Appel d’offres BTP', 'Stage en informatique', 'Subvention agricole'],
    'Chercher des opportunités',
    null,
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.service: _Copy(
    'Service',
    'De quel service avez-vous besoin ?',
    'Ex. plombier, électricien, livreur…',
    ['Plombier', 'Réparation de climatiseur', 'Livreur fiable'],
    'Trouver un professionnel',
    'Budget max (FCFA)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.prestation: _Copy(
    'Prestation',
    'Quelle prestation voulez-vous confier ?',
    'Ex. site web, traiteur pour 50 personnes…',
    ['Création d’un site vitrine', 'Traiteur pour 50 personnes', 'Logo et charte graphique'],
    'Trouver un prestataire',
    'Budget max (FCFA)',
    '/app/chat/waouh',
  ),
  LiveQuickAskKind.demander: _Copy(
    'Demander',
    'Dites-le comme vous voulez.',
    'De quoi avez-vous besoin ?',
    ['Un livreur fiable', 'Traiteur pour 50 personnes', 'Un plombier'],
    'Demander à Bot',
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
void liveOpenGuidedPath(BuildContext context, String path, {bool replace = false}) {
  void open(String to) => replace ? context.pushReplacement(to) : context.push(to);
  final uri = Uri.parse(path);
  final controller = _guidedController(context);
  if (controller == null || !liveGuidedIsEntryPath(uri)) {
    open(path);
    return;
  }
  if (controller.auth.signedIn) {
    if (liveGuidedIsSell(uri)) {
      controller.setComposerSeed('', meta: const <String, dynamic>{'open_sell': true});
    } else {
      final ask = liveGuidedAskFromUri(uri);
      if (ask != null) {
        controller.setComposerSeed(ask.text, meta: <String, dynamic>{
          'source': 'flutter_guided_search',
          'origin_surface': 'flutter_guided_search',
          'auto_send': true,
          'guided_ask': ask.toMap(),
        });
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
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) liveOpenGuidedPath(context, widget.uri.toString(), replace: true);
    });
  }

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}

/// Entrée guidée de l'accueil (Acheter, Vendre, Trouver, Opportunité, Service, Prestation).
/// Vendre, compte connecté : la fiche de vente du Chat s'ouvre directement.
Future<void> liveGuidedQuickAsk(BuildContext context, LiveQuickAskKind kind) async {
  final controller = _guidedController(context);
  if (controller != null && controller.auth.signedIn && kind == LiveQuickAskKind.vendre) {
    controller.setComposerSeed('', meta: const <String, dynamic>{'open_sell': true});
    context.push('/app/chat/waouh');
    return;
  }
  final path = await showLiveQuickAsk(context, kind);
  if (path == null || !context.mounted) return;
  liveOpenGuidedPath(context, path);
}

/// Ouvre le formulaire et renvoie l'URL (avec ?q=…&go=1) ou null.
Future<String?> showLiveQuickAsk(BuildContext context, LiveQuickAskKind kind) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => kind == LiveQuickAskKind.vendre ? const LiveSmartSaleSheet() : _QuickAskSheet(kind: kind),
  );
}

class _QuickAskSheet extends StatefulWidget {
  const _QuickAskSheet({required this.kind});
  final LiveQuickAskKind kind;
  @override
  State<_QuickAskSheet> createState() => _QuickAskSheetState();
}

class _QuickAskSheetState extends State<_QuickAskSheet> {
  final _q = TextEditingController();
  final _city = TextEditingController();
  final _budget = TextEditingController();

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
    if (text.isEmpty) return;
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

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    final hasText = _q.text.trim().isNotEmpty;
    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.white, Color(0xFFEFF5FF)],
          ),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    padding: const EdgeInsets.all(2.5),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          Color(0xFF55DDF2),
                          Color(0xFF4F7FFF),
                          Color(0xFF8B7CFF),
                        ],
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
                        Text(
                          c.title,
                          style: const TextStyle(
                            fontSize: 21,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          c.line,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF55688A),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Fermer',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
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
                decoration: InputDecoration(
                  hintText: c.field,
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: const BorderSide(color: Color(0xFFD9E6FF)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              if (!hasText)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final chip in c.chips)
                      ActionChip(
                        label: Text(chip),
                        backgroundColor: Colors.white,
                        side: const BorderSide(color: Color(0xFFD9E6FF)),
                        labelStyle: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF315BD8),
                          fontSize: 12,
                        ),
                        onPressed: () => setState(() => _q.text = chip),
                      ),
                  ],
                )
              else ...[
                LiveCityField(controller: _city),
                if (c.budget != null) ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: _budget,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: c.budget,
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: const BorderSide(color: Color(0xFFD9E6FF)),
                      ),
                    ),
                  ),
                ],
              ],
              const SizedBox(height: 14),
              SizedBox(
                height: 52,
                child: FilledButton(
                  onPressed: hasText ? _go : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: WaouhPalette.blue,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: Text(
                    c.cta,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
