import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'premium_journey_contract.dart';
import 'convergence/live_convergence_screen.dart';

/// Connected entry point. No invented product, payment, or seller confirmations.
class LivePremiumJourneyScreen extends StatefulWidget {
  const LivePremiumJourneyScreen({super.key});
  @override State<LivePremiumJourneyScreen> createState() => _LivePremiumJourneyScreenState();
}

class _LivePremiumJourneyScreenState extends State<LivePremiumJourneyScreen> {
  bool loading = true;
  String? error;
  List<Map<String, dynamic>> missions = [];
  @override void initState() { super.initState(); _refresh(); }

  Future<void> _refresh() async {
    setState(() { loading = true; error = null; });
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'waouh-convergence', body: {'action': 'list', 'payload': <String, dynamic>{}},
      );
      final body = response.data;
      if (body is! Map || body['ok'] != true) throw Exception('Données indisponibles.');
      final data = body['data'];
      final raw = data is Map ? data['missions'] : null;
      if (!mounted) return;
      setState(() => missions = raw is List
          ? raw.whereType<Map>().map((row) => row.map((k, v) => MapEntry('$k', v))).toList()
          : []);
    } catch (_) {
      if (mounted) setState(() => error = 'Connexion au suivi indisponible. Réessayez.');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _open(PremiumJourneyScreen screen) {
    switch (screen) {
      case PremiumJourneyScreen.liveSearch:
      case PremiumJourneyScreen.selection:
      case PremiumJourneyScreen.offerDetail:
        context.push('/app/avatar/acheter');
        break;
      case PremiumJourneyScreen.serviceQuote:
      case PremiumJourneyScreen.opportunity:
        context.push('/app/avatar/demander');
        break;
      case PremiumJourneyScreen.sellerRequest:
      case PremiumJourneyScreen.dealRoom:
      case PremiumJourneyScreen.agreement:
        context.push('/app/chat');
        break;
      case PremiumJourneyScreen.mandate:
        context.push('/app/missions');
        break;
      case PremiumJourneyScreen.externalInvite:
      case PremiumJourneyScreen.fulfillment:
      case PremiumJourneyScreen.completion:
        openLiveConvergence(context);
        break;
    }
  }

  @override Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFFF7F9FE),
    appBar: AppBar(title: const Text('WAOUH · Parcours premium'),
      actions: [IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh), tooltip: 'Actualiser')]),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      const Text('Bot cherche, compare et prépare. Vous confirmez l’accord final.',
        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Color(0xFF0B1A44))),
      const SizedBox(height: 12),
      if (loading) const LinearProgressIndicator(),
      if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
      Text(missions.isEmpty ? 'Aucune mission confirmée dans votre compte.' : '${missions.length} mission(s) retrouvée(s)',
        style: const TextStyle(color: Color(0xFF53627B))),
      const SizedBox(height: 20),
      ...PremiumJourneyScreen.values.map((screen) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: Card(color: Colors.white, child: ListTile(
          leading: CircleAvatar(backgroundColor: const Color(0xFFE6EDFF),
            child: Text('${screen.index + 1}', style: const TextStyle(color: Color(0xFF315BF5)))),
          title: Text(premiumJourneyTitles[screen] ?? ''),
          subtitle: Text(premiumJourneyPrimaryActions[screen] ?? ''),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _open(screen),
        )),
      )),
      const Text('Les confirmations de stock, de remise et de paiement proviennent des données métier, jamais des maquettes.',
        style: TextStyle(color: Color(0xFF53627B), fontSize: 12)),
    ]),
  );
}
