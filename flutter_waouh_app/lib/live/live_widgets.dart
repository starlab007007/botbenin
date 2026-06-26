import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../main.dart' as legacy;
import 'live_models.dart';

class LiveHeader extends StatelessWidget implements PreferredSizeWidget {
  const LiveHeader({super.key, required this.title, this.subtitle, this.actions = const [], this.back = false});
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final bool back;

  @override
  Size get preferredSize => const Size.fromHeight(92);

  @override
  Widget build(BuildContext context) => AppBar(
        toolbarHeight: 92,
        automaticallyImplyLeading: false,
        leading: back ? IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.canPop() ? context.pop() : context.go('/app/chat')) : null,
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
    return Align(
      alignment: message.outgoing ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 330),
        child: Card(
          color: message.outgoing ? const Color(0xFFDDFBEA) : Colors.white,
          margin: const EdgeInsets.only(bottom: 10),
          child: Padding(
            padding: const EdgeInsets.all(11),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (message.text.isNotEmpty) Text(message.text, style: const TextStyle(fontSize: 15, height: 1.32)),
              if (message.attachments.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: message.attachments.map((item) => ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(item.url, height: 130, width: 130, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox(height: 80, width: 120, child: Icon(Icons.broken_image_outlined)),
                )).toList()),
              ],
              if (actions is List && onPayload != null) ...[
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: actions.whereType<Map>().map((raw) {
                  final label = (raw['label'] ?? raw['title'] ?? raw['id'] ?? 'Choisir').toString();
                  final payload = (raw['id'] ?? raw['payload'] ?? label).toString();
                  return OutlinedButton(onPressed: () => onPayload!(payload), child: Text(label));
                }).toList()),
              ],
              const SizedBox(height: 4),
              Align(alignment: Alignment.bottomRight, child: Text(_stamp(message.createdAt), style: const TextStyle(fontSize: 10, color: legacy.WaouhColors.muted))),
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
      : SizedBox(
          height: 50,
          child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 8), children: items.map((item) => Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Chip(label: const Text('Image'), avatar: const Icon(Icons.image_outlined, size: 18), onDeleted: () => onRemove(item)),
          )).toList()),
        );
}
