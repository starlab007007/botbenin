import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../main.dart' as legacy;
import 'live_models.dart';

class LiveHeader extends StatelessWidget implements PreferredSizeWidget {
  const LiveHeader({super.key, required this.title, this.subtitle, this.actions = const [], this.back = false, this.leading});
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final bool back;
  final Widget? leading;

  @override
  Size get preferredSize => const Size.fromHeight(92);

  @override
  Widget build(BuildContext context) => AppBar(
        toolbarHeight: 92,
        automaticallyImplyLeading: false,
        leading: leading ?? (back ? IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.canPop() ? context.pop() : context.go('/app/chat')) : null),
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          if (subtitle != null) Text(subtitle!, style: const TextStyle(color: Color(0xFFC9F6E3), fontSize: 13, fontWeight: FontWeight.w700)),
        ]),
        actions: actions,
        flexibleSpace: const DecoratedBox(
          decoration: BoxDecoration(gradient: LinearGradient(colors: [legacy.WaouhColors.deep, legacy.WaouhColors.green, Color(0xFF031F1A)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        ),
      );
}

class LiveMessageBubble extends StatelessWidget {
  const LiveMessageBubble({super.key, required this.message, this.onPayload});
  final LiveMessage message;
  final ValueChanged<String>? onPayload;

  @override
  Widget build(BuildContext context) {
    final actions = message.meta['actions'];
    final outgoing = message.outgoing;
    final radius = BorderRadius.only(
      topLeft: const Radius.circular(18),
      topRight: const Radius.circular(18),
      bottomLeft: Radius.circular(outgoing ? 18 : 4),
      bottomRight: Radius.circular(outgoing ? 4 : 18),
    );
    return Align(
      alignment: outgoing ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: outgoing ? const Color(0xFFDCF8C6) : Colors.white,
            borderRadius: radius,
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 9, 10, 7),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (message.attachments.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: message.attachments.length == 1
                      ? Image.network(
                          message.attachments.first.url,
                          height: 190,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            height: 130,
                            color: legacy.WaouhColors.pearl,
                            child: const Icon(Icons.broken_image_outlined, color: legacy.WaouhColors.muted),
                          ),
                        )
                      : SizedBox(
                          height: 110,
                          child: Wrap(
                            spacing: 5,
                            runSpacing: 5,
                            children: message.attachments
                                .map((item) => ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.network(item.url, height: 110, width: 110, fit: BoxFit.cover),
                                    ))
                                .toList(),
                          ),
                        ),
                ),
                if (message.text.isNotEmpty) const SizedBox(height: 8),
              ],
              if (message.text.isNotEmpty)
                Text(message.text, style: const TextStyle(fontSize: 15.5, height: 1.34, color: legacy.WaouhColors.ink)),
              if (actions is List && onPayload != null) ...[
                const SizedBox(height: 9),
                Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: actions.whereType<Map>().map((raw) {
                    final label = (raw['label'] ?? raw['title'] ?? raw['id'] ?? 'Choisir').toString();
                    final payload = (raw['id'] ?? raw['payload'] ?? label).toString();
                    return OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 36),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        side: const BorderSide(color: legacy.WaouhColors.green),
                        foregroundColor: legacy.WaouhColors.green,
                      ),
                      onPressed: () => onPayload!(payload),
                      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 3),
              Align(
                alignment: Alignment.bottomRight,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_stamp(message.createdAt), style: const TextStyle(fontSize: 10.5, color: legacy.WaouhColors.muted)),
                    if (outgoing) ...[
                      const SizedBox(width: 3),
                      const Icon(Icons.done_all_rounded, size: 14, color: Color(0xFF53BDEB)),
                    ],
                  ],
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

String _stamp(DateTime value) {
  final local = value.toLocal();
  return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

class LiveAttachmentStrip extends StatelessWidget {
  const LiveAttachmentStrip({super.key, required this.items, required this.onRemove});
  final List<LiveAttachment> items;
  final ValueChanged<LiveAttachment> onRemove;

  @override
  Widget build(BuildContext context) => items.isEmpty
      ? const SizedBox.shrink()
      : Container(
          height: 76,
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: items
                .map((item) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              item.url,
                              width: 60,
                              height: 60,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                width: 60,
                                height: 60,
                                color: legacy.WaouhColors.pearl,
                                child: const Icon(Icons.image_outlined, color: legacy.WaouhColors.muted),
                              ),
                            ),
                          ),
                          Positioned(
                            top: -4,
                            right: -4,
                            child: GestureDetector(
                              onTap: () => onRemove(item),
                              child: Container(
                                width: 20,
                                height: 20,
                                decoration: const BoxDecoration(color: legacy.WaouhColors.red, shape: BoxShape.circle),
                                child: const Icon(Icons.close_rounded, size: 13, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ))
                .toList(),
          ),
        );
}
