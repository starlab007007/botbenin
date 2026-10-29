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
  int activeGroup = 0;
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

  static const groupNames = [
    '01 — Trouver et choisir',
    '02 — Du contact à l’accord',
    '03 — Services, opportunités, autonomie',
    '04 — Rejoindre, suivre, conclure',
  ];
  IconData iconFor(PremiumJourneyScreen step) {
    switch (step) {
      case PremiumJourneyScreen.liveSearch: return Icons.search;
      case PremiumJourneyScreen.selection: return Icons.checklist_rounded;
      case PremiumJourneyScreen.offerDetail: return Icons.verified_outlined;
      case PremiumJourneyScreen.sellerRequest: return Icons.notifications_active_outlined;
      case PremiumJourneyScreen.dealRoom: return Icons.forum_outlined;
      case PremiumJourneyScreen.agreement: return Icons.handshake_outlined;
      case PremiumJourneyScreen.serviceQuote: return Icons.handyman_outlined;
      case PremiumJourneyScreen.opportunity: return Icons.work_outline;
      case PremiumJourneyScreen.mandate: return Icons.tune;
      case PremiumJourneyScreen.externalInvite: return Icons.link;
      case PremiumJourneyScreen.fulfillment: return Icons.local_shipping_outlined;
      case PremiumJourneyScreen.completion: return Icons.task_alt;
    }
  }
  @override Widget build(BuildContext context) {
    const blue = Color(0xFF4266FA), navy = Color(0xFF09163A);
    final screens = PremiumJourneyScreen.values.skip(activeGroup * 3).take(3).toList();
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: const Text('WAOUH', style: TextStyle(color: navy, fontWeight: FontWeight.w800)),
        actions: [IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh))],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const SizedBox(height: 8),
        const Center(child: CircleAvatar(radius: 29, backgroundColor: Color(0xFFE3EBFF), child: Text('🤖', style: TextStyle(fontSize: 27)))),
        const SizedBox(height: 12),
        const Text('Votre parcours, avec Bot',
          textAlign: TextAlign.center, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: navy)),
        const SizedBox(height: 6),
        const Text('Je cherche, je vérifie et je prépare. Vous confirmez l’accord final.',
          textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Color(0xFF526285))),
        const SizedBox(height: 20),
        Row(children: List.generate(4, (i) => Expanded(child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 3),
          child: OutlinedButton(
            onPressed: () => setState(() => activeGroup = i),
            style: OutlinedButton.styleFrom(
              backgroundColor: i == activeGroup ? blue : Colors.white,
              foregroundColor: i == activeGroup ? Colors.white : navy,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
            ),
            child: Text('${i+1}'),
          ),
        )))),
        const SizedBox(height: 16),
        Text(groupNames[activeGroup], textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: navy)),
        if (loading) const Padding(padding: EdgeInsets.all(12), child: LinearProgressIndicator()),
        if (error != null) Padding(padding: const EdgeInsets.all(10), child: Text(error!, style: const TextStyle(color: Colors.red))),
        if (missions.isNotEmpty) Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Text('${missions.length} mission(s) réellement enregistrée(s)',
            style: const TextStyle(color: Color(0xFF53627B)))),
        const SizedBox(height: 14),
        for (final screen in screens) Card(
          elevation: 0, color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color(0xFFDDE4F1))),
          margin: const EdgeInsets.only(bottom: 14),
          child: Padding(padding: const EdgeInsets.all(20), child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Icon(Icons.arrow_back_ios_new, size: 17),
                const Text('WAOUH', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: navy)),
                Icon(iconFor(screen), size: 20, color: navy),
              ]),
              const SizedBox(height: 25),
              CircleAvatar(radius: 30, backgroundColor: const Color(0xFFEAF0FF),
                child: Icon(iconFor(screen), size: 30, color: blue)),
              const SizedBox(height: 16),
              Text(premiumJourneyTitles[screen] ?? '', textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800, color: navy)),
              const SizedBox(height: 14),
              Container(padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(color: const Color(0xFFF3F6FC), borderRadius: BorderRadius.circular(12)),
                child: const Text('Les prix, les contacts et les confirmations sont issus du dossier réel. Aucune action externe ne part sans autorisation.',
                  textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Color(0xFF526285)))),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => _open(screen),
                style: FilledButton.styleFrom(backgroundColor: blue, minimumSize: const Size.fromHeight(48)),
                child: Text(premiumJourneyPrimaryActions[screen] ?? 'Ouvrir cette étape'),
              ),
            ]))),
        ),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          TextButton(onPressed: activeGroup == 0 ? null : () => setState(() => activeGroup--), child: const Text('Précédent')),
          FilledButton(onPressed: activeGroup == 3 ? null : () => setState(() => activeGroup++), child: const Text('Suivant')),
        ]),
      ]),
    );
  }
}
