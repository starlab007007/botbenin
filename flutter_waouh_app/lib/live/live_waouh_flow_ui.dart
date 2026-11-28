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
    this.photos = const [],
    this.priorityFacts = const {},
    this.city,
    this.verified = false,
    this.contactLabel,
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
  final List<String> photos;
  final Map<String,String> priorityFacts;
  final String? city, contactLabel;
  final bool verified, best, own, busy;
  final VoidCallback onWant;
  final VoidCallback? onBot;
  final VoidCallback? onDetails;

  @override
  Widget build(BuildContext context) {
    final gallery = <String>{...photos, if (photo != null) photo!}.where((p) => p.startsWith('https://') || p.startsWith('http://')).toList();
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
          if (gallery.isNotEmpty) _PremiumOfferPhotos(photos: gallery, title: title),
          if (contactLabel case final label?)
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          if (best || verified)
            Padding(padding: const EdgeInsets.fromLTRB(14,12,14,0),child: Wrap(spacing: 8,runSpacing: 4,children: [
              if (best) const Text('Le choix de Bot',style: TextStyle(color: Color(0xFF8A5708),fontSize: 12,fontWeight: FontWeight.w800)),
              if (verified) const Tooltip(message: 'Contact possible',child: Icon(Icons.chat_bubble_outline,size: 17,color: _green)),
            ])),
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
              if(priorityFacts.isNotEmpty) ...[
                LayoutBuilder(builder:(context,constraints)=>Wrap(spacing:6,runSpacing:6,children:[for(final f in priorityFacts.entries) SizedBox(width:(constraints.maxWidth-6)/2,child:Container(padding:const EdgeInsets.all(8),decoration:BoxDecoration(color:const Color(0xFFF7F5FC),borderRadius:BorderRadius.circular(11)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(f.key,style:const TextStyle(fontSize:10,color:Color(0xFF746B86))),const SizedBox(height:3),Text(f.value,style:TextStyle(fontSize:12,fontWeight:FontWeight.w700,color:f.value=='À confirmer'?const Color(0xFF746B86):_ink))])))])),
                const SizedBox(height:12),
              ],
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

class _PremiumOfferPhotos extends StatefulWidget {
  const _PremiumOfferPhotos({required this.photos, required this.title});
  final List<String> photos;
  final String title;
  @override
  State<_PremiumOfferPhotos> createState() => _PremiumOfferPhotosState();
}
class _PremiumOfferPhotosState extends State<_PremiumOfferPhotos> {
  int index = 0;
  @override
  void didUpdateWidget(covariant _PremiumOfferPhotos oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.photos.join('|') != widget.photos.join('|')) index = 0;
  }
  @override
  Widget build(BuildContext context) {
    final photos = widget.photos;
    if (photos.isEmpty) return const SizedBox.shrink();
    final active = index.clamp(0, photos.length - 1).toInt();
    return Column(children: [
      Stack(alignment: Alignment.center,children: [
        AspectRatio(aspectRatio: 16/10,child: ColoredBox(color: const Color(0xFFF7F5FA),child: Semantics(label: '${widget.title} — photo ${active+1}',image:true,child: Image.network(photos[active],fit:BoxFit.contain,errorBuilder: (_,__,___)=>const Center(child: Icon(Icons.image_not_supported_outlined,color: Color(0xFF9489A7),size:32)))))),
        if (photos.length>1) ...[
          Positioned(left:4,child: IconButton.filledTonal(tooltip:'Photo précédente',onPressed:()=>setState(()=>index=(active+photos.length-1)%photos.length),icon:const Icon(Icons.chevron_left))),
          Positioned(right:4,child: IconButton.filledTonal(tooltip:'Photo suivante',onPressed:()=>setState(()=>index=(active+1)%photos.length),icon:const Icon(Icons.chevron_right))),
          Positioned(top:8,right:8,child: Container(padding:const EdgeInsets.symmetric(horizontal:10,vertical:5),decoration:BoxDecoration(color:const Color(0xDD221735),borderRadius:BorderRadius.circular(20)),child:Text('${active+1} / ${photos.length}',style:const TextStyle(color:Colors.white,fontSize:12,fontWeight:FontWeight.w700)))),
        ],
      ]),
      if (photos.length>1) SizedBox(height:60,child: ListView.separated(scrollDirection:Axis.horizontal,padding:const EdgeInsets.all(8),itemCount:photos.length,separatorBuilder:(_,__)=>const SizedBox(width:6),itemBuilder:(context,i)=>Semantics(button:true,selected:i==active,label:'Afficher la photo ${i+1}',child:InkWell(onTap:()=>setState(()=>index=i),child:Container(width:44,decoration:BoxDecoration(border:Border.all(color:i==active?const Color(0xFF6334CF):Colors.transparent,width:2),borderRadius:BorderRadius.circular(9)),clipBehavior:Clip.antiAlias,child:Image.network(photos[i],fit:BoxFit.cover,errorBuilder:(_,__,___)=>const Icon(Icons.image_not_supported_outlined,size:18))))))),
    ]);
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
  const WaouhAgreementPanel({super.key, required this.amount, required this.tag, this.waitingOther = false, this.busy = false, this.onValidate, this.onEdit, this.validateLabel = 'Valider'});
  final String amount;
  final WaouhPriceTag tag;
  final bool waitingOther, busy;
  final VoidCallback? onValidate, onEdit;
  final String validateLabel;
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
          if (onValidate != null) Expanded(child: _Big(label: validateLabel, icon: Icons.check_rounded, onTap: busy ? null : onValidate)),
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
