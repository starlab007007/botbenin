import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Présentation d'une transaction : même logique que le web
/// (`src/lib/waouh/transactionPresentation.ts`).
class LiveTransactionState {
  const LiveTransactionState({
    required this.status,
    required this.cancelled,
    required this.paid,
    required this.completed,
    required this.paymentReady,
    required this.label,
    required this.next,
  });

  final String status;
  final bool cancelled;
  final bool paid;
  final bool completed;
  final bool paymentReady;
  final String label;
  final String next;

  static const _labels = <String, String>{
    'awaiting_confirmation': 'Confirmations attendues',
    'pending_assignment': 'Préparation confirmée',
    'assigned': 'Livreur affecté',
    'picked_up': 'Livraison en cours',
    'delivered': 'Remise confirmée',
    'completed': 'Terminée',
    'cancelled': 'Annulée',
    'failed': 'Action à reprendre',
    'refunded': 'Remboursement enregistré',
  };

  factory LiveTransactionState.from(
    Map<String, dynamic>? deal,
    String? transactionStatus, {
    bool seller = false,
  }) {
    final dealStatus = '${deal?['status'] ?? ''}';
    final status = dealStatus.isNotEmpty
        ? dealStatus
        : ((transactionStatus ?? '').isNotEmpty ? transactionStatus! : 'unknown');
    final cancelled = const ['cancelled', 'failed', 'refunded'].contains(status);
    final paid = '${deal?['payment_status'] ?? ''}' == 'paid';
    final hasDeliveredAt = '${deal?['delivered_at'] ?? ''}'.isNotEmpty;
    final delivered =
        hasDeliveredAt || status == 'delivered' || status == 'completed';
    final completed =
        !cancelled && (status == 'completed' || (paid && delivered));
    final paymentReady = hasDeliveredAt &&
        !cancelled &&
        !completed &&
        status == 'delivered' &&
        !paid;
    final label = status == 'delivered' && !hasDeliveredAt
        ? 'Remise à vérifier'
        : (_labels[status] ?? 'État à vérifier');
    String next;
    if (cancelled) {
      next = 'Consulter le résultat dans la discussion.';
    } else if (completed) {
      next = 'Consulter le reçu et évaluer la transaction.';
    } else if (deal == null) {
      next = 'Ouvrir la discussion pour vérifier l’accord et les étapes restantes.';
    } else if (status == 'delivered' && !hasDeliveredAt) {
      next = 'Vérifier la confirmation de remise dans la discussion.';
    } else if (paymentReady) {
      next = seller
          ? 'Attendre la confirmation du paiement par l’acheteur.'
          : 'Confirmer le paiement réellement effectué après la remise.';
    } else if (paid) {
      next = 'Vérifier la remise et la conclusion de la transaction.';
    } else if (status == 'picked_up' || status == 'assigned') {
      next = 'Suivre la livraison et vérifier la remise avant le paiement.';
    } else {
      next =
          'Confirmer la disponibilité, le mode de paiement et les modalités de réalisation dans la discussion.';
    }
    return LiveTransactionState(
      status: status,
      cancelled: cancelled,
      paid: paid,
      completed: completed,
      paymentReady: paymentReady,
      label: label,
      next: next,
    );
  }
}

String _fcfa(num n) {
  final digits = n.round().abs().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(digits[i]);
  }
  return '${n < 0 ? '-' : ''}$buffer FCFA';
}

/// Carte de suivi d'une transaction dans le fil : accord, livraison, paiement
/// après livraison, évaluation. Parité avec `WaouhTransactionCard` (web).
class LiveTransactionCard extends StatefulWidget {
  const LiveTransactionCard({super.key, required this.transactionId});

  final String transactionId;

  @override
  State<LiveTransactionCard> createState() => _LiveTransactionCardState();
}

class _LiveTransactionCardState extends State<LiveTransactionCard> {
  SupabaseClient get _client => Supabase.instance.client;

  Map<String, dynamic>? _tx;
  Map<String, dynamic>? _deal;
  String? _articleTitle;
  String _role = 'other';
  bool _notFound = false;
  bool _hasRated = false;
  int? _rating;
  bool _busy = false;
  List<String> _viewerIds = const <String>[];
  Timer? _timer;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
    // Temps réel sur la transaction ; l'interrogation lente n'est qu'un filet de sécurité.
    try {
      _channel = _client
          .channel('waouh_tx_card_${widget.transactionId}_${DateTime.now().microsecondsSinceEpoch}')
          .onPostgresChanges(
            event: PostgresChangeEvent.update,
            schema: 'public',
            table: 'waouh_transactions',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'id',
              value: widget.transactionId,
            ),
            callback: (_) => unawaited(_refreshStatus()),
          )
          .onPostgresChanges(
            event: PostgresChangeEvent.update,
            schema: 'public',
            table: 'waouh_deals',
            callback: (_) => unawaited(_refreshStatus()),
          )
          .subscribe();
    } catch (_) {}
    _timer = Timer.periodic(const Duration(seconds: 45), (_) => _refreshStatus());
  }

  @override
  void dispose() {
    _timer?.cancel();
    final channel = _channel;
    if (channel != null) unawaited(_client.removeChannel(channel));
    super.dispose();
  }

  Future<List<String>> _resolveViewerIds() async {
    final ids = <String>[];
    try {
      final authId = _client.auth.currentUser?.id;
      if (authId != null && authId.isNotEmpty) {
        final rows = await _client
            .from('waouh_users')
            .select('id')
            .eq('auth_user_id', authId)
            .order('created_at', ascending: true)
            .limit(100);
        for (final row in rows as List) {
          final id = '${(row as Map)['id'] ?? ''}';
          if (id.isNotEmpty && !ids.contains(id)) ids.add(id);
        }
      }
      final prefs = await SharedPreferences.getInstance();
      final sid = prefs.getString('waouh_web_session_id');
      if (sid != null && sid.isNotEmpty) {
        final row = await _client
            .from('waouh_users')
            .select('id')
            .eq('web_session_id', sid)
            .maybeSingle();
        final id = '${row?['id'] ?? ''}';
        if (id.isNotEmpty && !ids.contains(id)) ids.add(id);
      }
    } catch (_) {
      // Sans identité résolue, la carte reste masquée (jamais montrée à un tiers).
    }
    return ids;
  }

  Future<Map<String, dynamic>?> _fetchDeal(String? threadId) async {
    if (threadId == null || threadId.isEmpty) return null;
    final row = await _client
        .from('waouh_deals')
        .select('id,thread_id,status,payment_status,amount,delivered_at')
        .eq('thread_id', threadId)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();
    return row == null ? null : Map<String, dynamic>.from(row);
  }

  Future<void> _load() async {
    try {
      final tx = await _client
          .from('waouh_transactions')
          .select()
          .eq('id', widget.transactionId)
          .maybeSingle();
      if (!mounted) return;
      if (tx == null) {
        setState(() => _notFound = true);
        return;
      }
      final txMap = Map<String, dynamic>.from(tx);
      final deal = await _fetchDeal(txMap['thread_id'] as String?);
      String? title;
      final articleId = '${txMap['article_id'] ?? ''}';
      if (articleId.isNotEmpty) {
        final a = await _client
            .from('waouh_articles')
            .select('title')
            .eq('id', articleId)
            .maybeSingle();
        title = a == null ? null : '${a['title'] ?? ''}';
      }
      final ids = await _resolveViewerIds();
      var role = 'other';
      if (ids.contains(txMap['buyer_id'])) {
        role = 'buyer';
      } else if (ids.contains(txMap['seller_id'])) {
        role = 'seller';
      }
      var rated = false;
      if (ids.isNotEmpty) {
        final r = await _client
            .from('waouh_ratings')
            .select('id')
            .eq('transaction_id', widget.transactionId)
            .eq('rater_id', ids.first)
            .maybeSingle();
        rated = r != null;
      }
      if (!mounted) return;
      setState(() {
        _tx = txMap;
        _deal = deal;
        _articleTitle = title;
        _viewerIds = ids;
        _role = role;
        _hasRated = rated;
      });
    } catch (_) {
      if (mounted && _tx == null) setState(() => _notFound = true);
    }
  }

  Future<void> _refreshStatus() async {
    if (!mounted || _tx == null || _busy) return;
    try {
      final tx = await _client
          .from('waouh_transactions')
          .select()
          .eq('id', widget.transactionId)
          .maybeSingle();
      if (tx == null || !mounted) return;
      final txMap = Map<String, dynamic>.from(tx);
      final deal = await _fetchDeal(txMap['thread_id'] as String?);
      if (!mounted) return;
      setState(() {
        _tx = txMap;
        _deal = deal;
      });
    } catch (_) {}
  }

  void _toast(String text) {
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _confirmPayment() async {
    final dealId = '${_deal?['id'] ?? ''}';
    if (dealId.isEmpty || _busy) return;
    final method = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Confirmer le paiement',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text(
                'L’article ou la prestation a été remis. Confirmez le moyen réellement utilisé pour le paiement.',
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.payments_outlined),
                title: const Text('Espèces'),
                subtitle: const Text('Paiement effectué en espèces à la remise'),
                onTap: () => Navigator.of(ctx).pop('cash'),
              ),
              ListTile(
                leading: const Icon(Icons.smartphone_outlined),
                title: const Text('Mobile Money'),
                subtitle:
                    const Text('Mobile Money utilisé lors de la remise / livraison'),
                onTap: () => Navigator.of(ctx).pop('mobile_money'),
              ),
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Plus tard'),
              ),
            ],
          ),
        ),
      ),
    );
    if (method == null || !mounted) return;
    setState(() => _busy = true);
    try {
      final res = await _client.functions.invoke(
        'waouh-deal-ops',
        body: <String, dynamic>{
          'action': 'payment',
          'deal_id': dealId,
          'method': method,
        },
      );
      final data = res.data;
      final ok = data is Map && (data['ok'] == true || data['success'] == true);
      if (!ok) {
        throw Exception('not_recorded');
      }
      _toast('Paiement confirmé. Merci !');
      await _refreshStatus();
    } catch (_) {
      _toast('La confirmation n’a pas été enregistrée. Actualisez le suivi puis réessayez.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _rate(int stars) async {
    final tx = _tx;
    if (tx == null || _hasRated || _viewerIds.isEmpty || _busy) return;
    setState(() => _busy = true);
    try {
      await _client.from('waouh_ratings').insert({
        'transaction_id': tx['id'],
        'rater_id': _viewerIds.first,
        'ratee_id': tx['seller_id'],
        'rating': stars,
      });
      if (!mounted) return;
      setState(() {
        _hasRated = true;
        _rating = stars;
      });
      _toast('Merci pour votre évaluation !');
    } catch (_) {
      _toast('Évaluation non enregistrée. Réessayez dans un instant.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_notFound) return const SizedBox.shrink();
    final tx = _tx;
    if (tx == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2)),
          SizedBox(width: 8),
          Text('Chargement de la transaction…'),
        ]),
      );
    }
    // Carte privée : jamais montrée à un tiers.
    if (_role == 'other') return const SizedBox.shrink();

    final seller = _role == 'seller';
    final state = LiveTransactionState.from(
      _deal,
      '${tx['status'] ?? ''}',
      seller: seller,
    );
    final currentIdx = state.completed
        ? 2
        : const ['assigned', 'picked_up', 'delivered'].contains(state.status)
            ? 1
            : 0;
    const steps = <(String, IconData)>[
      ('Accord confirmé', Icons.verified_user_outlined),
      ('Livraison WAOUH', Icons.local_shipping_outlined),
      ('Paiement après livraison', Icons.credit_card_outlined),
    ];
    final amount = num.tryParse('${tx['amount'] ?? 0}') ?? 0;
    final id = '${tx['id'] ?? ''}';

    return Container(
      margin: const EdgeInsets.only(top: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFCDEBF5)),
        color: Colors.white,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF06B6D4), Color(0xFF0EA5E9), Color(0xFF2563EB)],
            ),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                child: Text(
                  '💎 TRANSACTION · ${seller ? 'VENTE SÉCURISÉE' : 'ACHAT SÉCURISÉ'}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2),
                ),
              ),
              if (id.length >= 6)
                Text('#${id.substring(0, 6).toUpperCase()}',
                    style: const TextStyle(color: Colors.white70, fontSize: 10)),
            ]),
            const SizedBox(height: 4),
            Text(
              (_articleTitle ?? '').isEmpty ? 'Article' : _articleTitle!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
            ),
            Text(_fcfa(amount),
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 24)),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            for (var i = 0; i < steps.length; i++)
              _stepRow(
                steps[i].$1,
                steps[i].$2,
                done: !state.cancelled &&
                    _deal != null &&
                    (i < currentIdx || (i == 2 && state.completed)),
                current: !state.cancelled && _deal != null && i == currentIdx,
                trailing: state.label,
              ),
            const SizedBox(height: 8),
            if (!seller && state.paymentReady && '${_deal?['id'] ?? ''}'.isNotEmpty) ...[
              _banner('✅ Livraison confirmée · vous pouvez maintenant enregistrer le paiement',
                  const Color(0xFFECFDF5), const Color(0xFF047857)),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _busy ? null : _confirmPayment,
                  icon: const Icon(Icons.credit_card, size: 18),
                  label: const Text('Confirmer le paiement'),
                ),
              ),
            ] else if (!state.completed)
              _banner(
                seller ? '${state.label} · ${state.next}' : state.next,
                const Color(0xFFF8FAFC),
                const Color(0xFF334155),
              ),
            if (state.completed) ...[
              const SizedBox(height: 10),
              const Center(
                child: Text('🎉 Transaction terminée',
                    style: TextStyle(
                        color: Color(0xFF047857), fontWeight: FontWeight.w800)),
              ),
              if (!seller && !_hasRated) ...[
                const SizedBox(height: 6),
                const Center(child: Text('Notez le vendeur :')),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  for (var s = 1; s <= 5; s++)
                    IconButton(
                      tooltip: '$s étoile${s > 1 ? 's' : ''}',
                      onPressed: _busy ? null : () => _rate(s),
                      icon: Icon(
                        (_rating ?? 0) >= s ? Icons.star : Icons.star_border,
                        color: (_rating ?? 0) >= s
                            ? const Color(0xFFFBBF24)
                            : Colors.grey,
                      ),
                    ),
                ]),
              ],
              if (_hasRated)
                const Center(
                  child: Text('⭐ Merci pour votre évaluation',
                      style: TextStyle(color: Color(0xFFD97706))),
                ),
            ],
          ]),
        ),
      ]),
    );
  }

  Widget _stepRow(String label, IconData icon,
      {required bool done, required bool current, required String trailing}) {
    final color = done
        ? const Color(0xFF10B981)
        : current
            ? const Color(0xFF06B6D4)
            : Colors.grey.shade400;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        Icon(done ? Icons.check_circle : (current ? icon : Icons.circle_outlined),
            size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(label,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: done || current ? Colors.black87 : Colors.grey)),
        ),
        if (current)
          Text(trailing,
              style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ]),
    );
  }

  Widget _banner(String text, Color background, Color foreground) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
            color: background, borderRadius: BorderRadius.circular(8)),
        child: Text(text,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w700, color: foreground)),
      );
}
