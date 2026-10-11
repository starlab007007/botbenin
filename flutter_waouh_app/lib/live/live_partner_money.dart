import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';

enum LiveMoneyKind { sales, payouts, payments }

/// Ventes, versements, paiements du Partner (parité Web mobile).
class LivePartnerMoneyScreen extends StatefulWidget {
  const LivePartnerMoneyScreen({super.key, required this.kind});
  final LiveMoneyKind kind;
  @override
  State<LivePartnerMoneyScreen> createState() => _LivePartnerMoneyScreenState();
}

class _LivePartnerMoneyScreenState extends State<LivePartnerMoneyScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final partner = context.read<legacy.PartnerController>();
    if (!partner.checked) await partner.ensurePartner();
    if (!mounted) return;
    final p = partner.partner;
    if (p == null || p.status != 'active') {
      context.go('/app/partner');
      return;
    }
    try {
      final t = widget.kind;
      final q = legacy.supabase.from(switch (t) {
        LiveMoneyKind.sales => 'waouh_partner_sales',
        LiveMoneyKind.payouts => 'waouh_partner_payouts',
        LiveMoneyKind.payments => 'payment_transactions',
      }).select();
      final filtered = t == LiveMoneyKind.payments ? q : q.eq('partner_id', p.id);
      final data = await filtered.order(
          t == LiveMoneyKind.sales ? 'date_vente' : 'created_at',
          ascending: false);
      if (!mounted) return;
      setState(() {
        _rows = List<Map<String, dynamic>>.from(data);
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Chargement impossible. Réessayez.';
          _loading = false;
        });
      }
    }
  }

  String _f(dynamic v) {
    final n = (v is num ? v : num.tryParse('${v ?? 0}') ?? 0).round();
    final s = n.toString().replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ' ');
    return s;
  }

  String _d(dynamic v) {
    final t = DateTime.tryParse('${v ?? ''}')?.toLocal();
    if (t == null) return '-';
    return '${t.day.toString().padLeft(2, '0')}/${t.month.toString().padLeft(2, '0')}/${t.year}';
  }

  @override
  Widget build(BuildContext context) {
    final k = widget.kind;
    final title = switch (k) {
      LiveMoneyKind.sales => 'Mes ventes',
      LiveMoneyKind.payouts => 'Mes versements',
      LiveMoneyKind.payments => 'Paiements',
    };
    final total = k == LiveMoneyKind.sales
        ? _rows.fold<num>(0, (s, r) => s + (num.tryParse('${r['commission_partner'] ?? 0}') ?? 0))
        : k == LiveMoneyKind.payouts
            ? _rows.fold<num>(0, (s, r) => s + (num.tryParse('${r['montant_total'] ?? 0}') ?? 0))
            : 0;
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/app/partner/businesses'),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    children: [
                      if (k != LiveMoneyKind.payments)
                        Container(
                          padding: const EdgeInsets.all(16),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                                colors: [Color(0xFF4F7FFF), Color(0xFF55DDF2)]),
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  k == LiveMoneyKind.sales
                                      ? 'Commission cumulée'
                                      : 'Total versé',
                                  style: const TextStyle(
                                      color: Colors.white70,
                                      fontWeight: FontWeight.w700)),
                              Text('${_f(total)} FCFA',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 26,
                                      fontWeight: FontWeight.w900)),
                            ],
                          ),
                        ),
                      if (_rows.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(child: Text('Rien pour l’instant.')),
                        ),
                      for (final r in _rows) _tile(k, r),
                    ],
                  ),
                ),
    );
  }

  Widget _tile(LiveMoneyKind k, Map<String, dynamic> r) {
    late String head, sub, amount, status;
    switch (k) {
      case LiveMoneyKind.sales:
        head = '${r['source'] ?? 'Vente'}';
        sub = '${_d(r['date_vente'])} · ${r['buyer_phone'] ?? '-'}';
        amount = '+${_f(r['commission_partner'])} F';
        status = '${r['statut'] ?? ''}';
      case LiveMoneyKind.payouts:
        head = '${r['periode_debut'] ?? ''} → ${r['periode_fin'] ?? ''}';
        sub = '${r['nb_ventes'] ?? 0} vente(s) · ${r['mobile_money_ref'] ?? '-'}';
        amount = '${_f(r['montant_total'])} F';
        status = '${r['statut'] ?? ''}';
      case LiveMoneyKind.payments:
        head = '${r['order_id'] ?? 'Paiement'}';
        sub = _d(r['created_at']);
        amount = '${_f(r['amount'])} ${r['currency'] ?? 'FCFA'}';
        status = '${r['status'] ?? ''}';
    }
    final paid = status == 'paid' || status == 'completed' || status == 'approved';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD9E6FF)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(head,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(sub,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF55688A))),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amount,
                  style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 2),
              Text(status,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: paid
                          ? const Color(0xFF0E9F6E)
                          : const Color(0xFF8A6D00))),
            ],
          ),
        ],
      ),
    );
  }
}
