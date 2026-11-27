import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Parcours WAOUH en 5 étapes visibles : Besoin → Offres → Échange → Accord → Reçu.
const waouhFlowSteps = <(IconData, String)>[
  (Icons.mic_rounded, 'Besoin'),
  (Icons.grid_view_rounded, 'Offres'),
  (Icons.forum_rounded, 'Échange'),
  (Icons.handshake_rounded, 'Accord'),
  (Icons.inventory_2_rounded, 'Reçu'),
];

const _blue = Color(0xFF2563EB);
const _ink = Color(0xFF0F172A);
const _muted = Color(0xFF64748B);
const _green = Color(0xFF059669);

/// Barre d'étapes compacte : icône + 1 mot. [step] commence à 1.
class WaouhStepBar extends StatelessWidget {
  const WaouhStepBar({super.key, required this.step});
  final int step;
  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Étape $step sur 5 : ${waouhFlowSteps[(step - 1).clamp(0, 4)].$2}',
      child: Row(children: [
        for (var i = 0; i < waouhFlowSteps.length; i++) ...[
          Expanded(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i + 1 < step ? _green : i + 1 == step ? _blue : const Color(0xFFE2E8F0),
                ),
                child: Icon(i + 1 < step ? Icons.check_rounded : waouhFlowSteps[i].$1,
                    size: 18, color: i + 1 <= step ? Colors.white : _muted),
              ),
              const SizedBox(height: 4),
              Text(waouhFlowSteps[i].$2,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: i + 1 == step ? FontWeight.w900 : FontWeight.w600,
                      color: i + 1 == step ? _ink : _muted)),
            ]),
          ),
        ],
      ]),
    );
  }
}

enum WaouhPriceTag { good, fair, high, ask }

/// Pastille prix à partir de la médiane des offres affichées.
WaouhPriceTag waouhPriceTag(num? price, num? median) {
  if (price == null || price <= 0) return WaouhPriceTag.ask;
  if (median == null || median <= 0) return WaouhPriceTag.fair;
  final r = price / median;
  if (r <= 0.9) return WaouhPriceTag.good;
  if (r <= 1.15) return WaouhPriceTag.fair;
  return WaouhPriceTag.high;
}

num? waouhMedian(Iterable<num?> values) {
  final v = values.whereType<num>().where((n) => n > 0).toList()..sort();
  if (v.length < 3) return null;
  final m = v.length ~/ 2;
  return v.length.isOdd ? v[m] : (v[m - 1] + v[m]) / 2;
}

class WaouhPricePill extends StatelessWidget {
  const WaouhPricePill(this.tag, {super.key});
  final WaouhPriceTag tag;
  @override
  Widget build(BuildContext context) {
    final (label, fg, bg, icon) = switch (tag) {
      WaouhPriceTag.good => ('Bon prix', _green, const Color(0xFFD1FAE5), Icons.thumb_up_alt_rounded),
      WaouhPriceTag.fair => ('Prix moyen', const Color(0xFF475569), const Color(0xFFF1F5F9), Icons.balance_rounded),
      WaouhPriceTag.high => ('Cher', const Color(0xFFB91C1C), const Color(0xFFFEE2E2), Icons.trending_up_rounded),
      WaouhPriceTag.ask => ('Prix à demander', const Color(0xFF92400E), const Color(0xFFFEF3C7), Icons.help_outline_rounded),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: fg),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: fg)),
      ]),
    );
  }
}

/// Carte d'offre : grande photo, prix en gros, ville, pastille, 2 boutons.
class WaouhOfferCard extends StatelessWidget {
  const WaouhOfferCard({
    super.key,
    required this.title,
    required this.priceLabel,
    required this.tag,
    this.photo,
    this.city,
    this.verified = false,
    this.best = false,
    this.own = false,
    this.busy = false,
    required this.onWant,
    this.onBot,
    this.onDetails,
    this.showPriceTag = true,
    this.actionLabel = 'Je prends',
    this.botLabel = 'Confier à Bot',
  });
  final String title;
  final String actionLabel, botLabel;
  final bool showPriceTag;
  final String? priceLabel;
  final WaouhPriceTag tag;
  final String? photo;
  final String? city;
  final bool verified, best, own, busy;
  final VoidCallback onWant;
  final VoidCallback? onBot;
  final VoidCallback? onDetails;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: best ? const Color(0xFFE2BF69) : const Color(0xFFDCE7F8), width: best ? 2 : 1),
        boxShadow: const [BoxShadow(color: Color(0x140F172A), blurRadius: 16, offset: Offset(0, 6))],
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onDetails,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Stack(children: [
            AspectRatio(
              aspectRatio: best ? 16 / 9 : 4 / 3,
              child: photo == null
                  ? Container(color: const Color(0xFFEFF4FF), child: const Icon(Icons.image_outlined, size: 48, color: _muted))
                  : Image.network(photo!, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(color: const Color(0xFFEFF4FF), child: const Icon(Icons.image_outlined, size: 48, color: _muted))),
            ),
            if (best)
              Positioned(
                left: 12, top: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: const Color(0xFFA8690A), borderRadius: BorderRadius.circular(99)),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.star_rounded, size: 14, color: Colors.white),
                    SizedBox(width: 4),
                    Text('Le choix de Bot', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900)),
                  ]),
                ),
              ),
            if (verified)
              Positioned(
                right: 12, top: 12,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                  child: const Icon(Icons.chat_bubble_outline, size: 18, color: _green),
                ),
              ),
          ]),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(priceLabel ?? 'Prix à demander',
                  style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900, color: _ink)),
              const SizedBox(height: 2),
              Text(title, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _ink)),
              const SizedBox(height: 8),
              Row(children: [
                if (showPriceTag) ...[WaouhPricePill(tag), const SizedBox(width: 8)],
                if ((city ?? '').trim().isNotEmpty) ...[
                  const Icon(Icons.place_rounded, size: 15, color: _muted),
                  Flexible(child: Text(city!, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, color: _muted, fontWeight: FontWeight.w600))),
                ],
              ]),
              const SizedBox(height: 12),
              if (own)
                const Text('Votre annonce', style: TextStyle(fontWeight: FontWeight.w800, color: _muted))
              else
                Column(crossAxisAlignment: CrossAxisAlignment.stretch,children: [
                  SizedBox(
                      height: 52,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFFF3EFFF), foregroundColor: const Color(0xFF281753), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                        onPressed: busy ? null : () { HapticFeedback.lightImpact(); onWant(); },
                        icon: const Icon(Icons.favorite_rounded),
                        label: Text(actionLabel, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                      ),
                  ),
                  if (onBot != null) ...[
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 52,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFF6334CF), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                        onPressed: busy ? null : () { HapticFeedback.lightImpact(); onBot!(); },
                        icon: const Icon(Icons.smart_toy_rounded),
                        label: Text(botLabel, style: const TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ],
                ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// Bandeau fixe en bas : « Bot s'occupe de tout ».
class WaouhBotBar extends StatelessWidget {
  const WaouhBotBar({super.key, required this.count, required this.busy, required this.done, required this.onDelegate, this.onFollow});
  final int count;
  final bool busy, done;
  final VoidCallback onDelegate;
  final VoidCallback? onFollow;
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
        decoration: const BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Color(0x220F172A), blurRadius: 18, offset: Offset(0, -4))],
        ),
        child: SizedBox(
          height: 56,
          child: FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: done ? _green : const Color(0xFF6D28D9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            ),
            onPressed: busy ? null : () { HapticFeedback.mediumImpact(); done ? onFollow?.call() : onDelegate(); },
            icon: busy
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Icon(done ? Icons.visibility_rounded : Icons.smart_toy_rounded),
            label: Text(done ? 'Suivre Bot' : count > 1 ? 'Bot s’occupe de tout · $count offres' : 'Bot s’occupe de tout',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          ),
        ),
      ),
    );
  }
}

/// Accord simplifié : montant en gros, pastille, Valider / Modifier.
class WaouhAgreementPanel extends StatelessWidget {
  const WaouhAgreementPanel({super.key, required this.amount, required this.tag, this.waitingOther = false, this.busy = false, this.onValidate, this.onEdit});
  final String amount;
  final WaouhPriceTag tag;
  final bool waitingOther, busy;
  final VoidCallback? onValidate, onEdit;
  @override
  Widget build(BuildContext context) {
    return _Panel(children: [
      const Icon(Icons.handshake_rounded, size: 40, color: _blue),
      const SizedBox(height: 6),
      Text(amount, textAlign: TextAlign.center, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: _ink)),
      const SizedBox(height: 8),
      Center(child: WaouhPricePill(tag)),
      const SizedBox(height: 14),
      if (waitingOther)
        const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.hourglass_top_rounded, color: _muted),
          SizedBox(width: 6),
          Text('En attente de l’autre partie', style: TextStyle(fontWeight: FontWeight.w700, color: _muted)),
        ])
      else
        Row(children: [
          if (onEdit != null) Expanded(child: _Big(label: 'Modifier', icon: Icons.edit_rounded, onTap: busy ? null : onEdit, outlined: true)),
          if (onEdit != null && onValidate != null) const SizedBox(width: 10),
          if (onValidate != null) Expanded(child: _Big(label: 'Valider', icon: Icons.check_rounded, onTap: busy ? null : onValidate)),
        ]),
    ]);
  }
}

/// Réception simplifiée : J'ai reçu / Problème, puis coche animée.
class WaouhReceiptPanel extends StatelessWidget {
  const WaouhReceiptPanel({super.key, required this.done, this.busy = false, this.receivedLabel = 'J’ai reçu', this.onReceived, this.onProblem});
  final bool done, busy;
  final String receivedLabel;
  final VoidCallback? onReceived, onProblem;
  @override
  Widget build(BuildContext context) {
    if (done) {
      return _Panel(children: [
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 600),
          curve: Curves.elasticOut,
          builder: (_, v, child) => Transform.scale(scale: v, child: child),
          child: const CircleAvatar(radius: 38, backgroundColor: _green, child: Icon(Icons.check_rounded, size: 46, color: Colors.white)),
        ),
        const SizedBox(height: 10),
        const Text('Terminé', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: _ink)),
      ]);
    }
    return _Panel(children: [
      const Icon(Icons.inventory_2_rounded, size: 40, color: _blue),
      const SizedBox(height: 12),
      Row(children: [
        if (onProblem != null) Expanded(child: _Big(label: 'Problème', icon: Icons.report_rounded, onTap: busy ? null : onProblem, outlined: true, danger: true)),
        if (onProblem != null && onReceived != null) const SizedBox(width: 10),
        if (onReceived != null) Expanded(child: _Big(label: receivedLabel, icon: Icons.check_circle_rounded, onTap: busy ? null : onReceived, green: true)),
      ]),
    ]);
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.symmetric(vertical: 10),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFDCE7F8))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
      );
}

class _Big extends StatelessWidget {
  const _Big({required this.label, required this.icon, this.onTap, this.outlined = false, this.danger = false, this.green = false});
  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  final bool outlined, danger, green;
  @override
  Widget build(BuildContext context) {
    final tap = onTap == null ? null : () { HapticFeedback.lightImpact(); onTap!(); };
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(16));
    return SizedBox(
      height: 54,
      child: outlined
          ? OutlinedButton.icon(
              style: OutlinedButton.styleFrom(shape: shape, foregroundColor: danger ? const Color(0xFFB91C1C) : null),
              onPressed: tap, icon: Icon(icon), label: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)))
          : FilledButton.icon(
              style: FilledButton.styleFrom(shape: shape, backgroundColor: green ? _green : _blue),
              onPressed: tap, icon: Icon(icon), label: Text(label, style: const TextStyle(fontWeight: FontWeight.w900))),
    );
  }
}
