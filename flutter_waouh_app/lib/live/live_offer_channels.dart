import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'live_nexus_service.dart';

/// Moyens de joindre le propriétaire d'une offre (même modèle que le web).
enum LiveOfferChannel { waouh, whatsapp, email, phone }

LiveOfferChannel? _normalizeChannel(Object? raw) {
  final c = '${raw ?? ''}'.toLowerCase();
  if (c == 'waouh' || c == 'app' || c == 'waouh_app') return LiveOfferChannel.waouh;
  if (c == 'whatsapp' || c == 'wa') return LiveOfferChannel.whatsapp;
  if (c == 'email' || c == 'mail') return LiveOfferChannel.email;
  if (c == 'phone' || c == 'call' || c == 'sms') return LiveOfferChannel.phone;
  return null;
}

/// Tous les canaux d'une offre : application WAOUH, WhatsApp, e-mail, téléphone (par ordre de préférence).
List<LiveOfferChannel> liveOfferChannels(NexusDiscoveryItem o) {
  final found = <LiveOfferChannel>{};
  final id = o.fabricId;
  final e = o.evidence;
  final hasContact = e['has_contact'];
  if (id.startsWith('article:')) found.add(LiveOfferChannel.waouh);
  if (id.startsWith('catalog:') &&
      (e['source'] == 'partner' || hasContact == true || hasContact == 'true')) {
    found.add(LiveOfferChannel.waouh);
  }
  final pack = o.contactPack;
  if (pack != null) {
    for (final row in [...pack.availableChannels, ...pack.maskedContacts]) {
      final channel = _normalizeChannel(row['channel']);
      if (channel != null) found.add(channel);
    }
  }
  if (e['has_whatsapp'] == true || e['has_whatsapp'] == 'true') found.add(LiveOfferChannel.whatsapp);
  final hints = e['contact_hints'];
  if (hints is Map) {
    if ((num.tryParse('${hints['email_count']}') ?? 0) > 0) found.add(LiveOfferChannel.email);
    if ((num.tryParse('${hints['phone_count']}') ?? 0) > 0) found.add(LiveOfferChannel.phone);
  }
  return LiveOfferChannel.values.where(found.contains).toList(growable: false);
}

List<LiveOfferChannel> liveDirectChannels(NexusDiscoveryItem o) =>
    liveOfferChannels(o).where((c) => c != LiveOfferChannel.waouh).toList(growable: false);

String liveChannelName(LiveOfferChannel c) => switch (c) {
  LiveOfferChannel.waouh => 'WAOUH',
  LiveOfferChannel.whatsapp => 'WhatsApp',
  LiveOfferChannel.email => 'E-mail',
  LiveOfferChannel.phone => 'Appel',
};

/// Premier message proposé pour un contact direct.
String liveDirectMessage(String title, double? price) {
  final about = title.trim().isEmpty ? 'votre annonce' : '« ${title.trim()} »';
  final amount = (price != null && price > 0) ? ' (${liveMoneyText(price)} FCFA)' : '';
  return 'Bonjour, je vous contacte via WAOUH au sujet de $about$amount. Est-ce toujours disponible ? Quel est votre meilleur prix ?';
}

String liveMoneyText(num value) {
  final digits = value.round().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(digits[i]);
  }
  return buffer.toString();
}

/// Ouvre WhatsApp, la messagerie ou l'appel avec le message déjà rédigé.
/// Retourne false quand la source n'autorise pas à révéler le contact.
Future<bool> openLiveDirectContact(
  LiveNexusService nexus,
  NexusDiscoveryItem item,
  LiveOfferChannel channel,
) async {
  final prepared = await nexus.prepareContact(item.fabricId);
  NexusContactItem? contact;
  for (final c in prepared.contacts) {
    // Un numéro de téléphone peut aussi recevoir WhatsApp.
    final normalized = _normalizeChannel(c.channel);
    final matches = normalized == channel ||
        (channel == LiveOfferChannel.whatsapp && normalized == LiveOfferChannel.phone);
    if (matches && c.value.trim().isNotEmpty) {
      contact = c;
      break;
    }
  }
  if (!prepared.policy.canReveal || contact == null) return false;
  final value = contact.value.trim();
  final message = liveDirectMessage(item.title, item.priceMin ?? item.priceMax);
  final Uri uri;
  if (channel == LiveOfferChannel.email) {
    uri = Uri(scheme: 'mailto', path: value, queryParameters: {
      'subject': 'À propos de ${item.title}',
      'body': message,
    });
  } else {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return false;
    uri = channel == LiveOfferChannel.whatsapp
        ? Uri.parse('https://wa.me/$digits?text=${Uri.encodeComponent(message)}')
        : Uri.parse('tel:+$digits');
  }
  return launchUrl(uri, mode: LaunchMode.externalApplication);
}

/// Boutons de contact direct : WhatsApp (message prêt), e-mail (message prêt), appel.
class LiveDirectContactBar extends StatefulWidget {
  const LiveDirectContactBar({super.key, required this.item, required this.nexus});
  final NexusDiscoveryItem item;
  final LiveNexusService nexus;

  @override
  State<LiveDirectContactBar> createState() => _LiveDirectContactBarState();
}

class _LiveDirectContactBarState extends State<LiveDirectContactBar> {
  LiveOfferChannel? _busy;

  Future<void> _run(LiveOfferChannel channel) async {
    if (_busy != null) return;
    setState(() => _busy = channel);
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      final opened = await openLiveDirectContact(widget.nexus, widget.item, channel);
      if (!opened) {
        messenger?.showSnackBar(const SnackBar(
          content: Text('Ce vendeur n’a pas rendu son contact public. Confiez la prise de contact à l’avatar : il le joint pour vous.'),
        ));
      }
    } catch (_) {
      messenger?.showSnackBar(const SnackBar(content: Text('Contact indisponible. Réessayez dans un instant.')));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final channels = liveDirectChannels(widget.item);
    final buttons = <(LiveOfferChannel, String, IconData)>[
      if (channels.contains(LiveOfferChannel.whatsapp) || channels.contains(LiveOfferChannel.phone))
        (LiveOfferChannel.whatsapp, 'WhatsApp', Icons.chat_rounded),
      if (channels.contains(LiveOfferChannel.email)) (LiveOfferChannel.email, 'E-mail', Icons.mail_outline_rounded),
      if (channels.contains(LiveOfferChannel.phone)) (LiveOfferChannel.phone, 'Appeler', Icons.phone_outlined),
    ];
    if (buttons.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final b in buttons)
            OutlinedButton.icon(
              key: ValueKey('direct-${b.$1.name}'),
              onPressed: _busy == null ? () => _run(b.$1) : null,
              icon: Icon(b.$3, size: 16),
              label: Text(_busy == b.$1 ? 'Ouverture…' : b.$2),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 40),
                foregroundColor: b.$1 == LiveOfferChannel.whatsapp ? const Color(0xFF0A6B35) : const Color(0xFF0B5D4D),
                backgroundColor: b.$1 == LiveOfferChannel.whatsapp ? const Color(0xFFE8F8EE) : Colors.white,
                shape: const StadiumBorder(),
              ),
            ),
        ],
      ),
    );
  }
}
