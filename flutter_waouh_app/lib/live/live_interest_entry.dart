import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'live_legacy_interest.dart';
import 'live_nexus_service.dart';

/// Resume an existing result/authentication link into the canonical chat screen.
/// This widget never creates or renders a separate Deal Room.
class LiveInterestEntry extends StatefulWidget {
  const LiveInterestEntry({super.key, required this.fabricId});
  final String fabricId;
  @override
  State<LiveInterestEntry> createState() => _LiveInterestEntryState();
}

class _LiveInterestEntryState extends State<LiveInterestEntry> {
  String? error;
  bool opening = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => open());
  }

  Future<void> open() async {
    if (!mounted || opening) return;
    setState(() {
      opening = true;
      error = null;
    });
    try {
      await openLiveInterestedDiscussion(
        context,
        NexusDiscoveryItem.fromJson({
          'fabric_id': widget.fabricId,
          'source_key': 'chat_entry',
          'subject': 'Annonce',
          'intent': 'SELL',
        }),
      );
    } catch (_) {
      if (mounted)
        setState(
          () => error = 'Cet échange n’a pas pu être ouvert. Réessayez.',
        );
    } finally {
      if (mounted) setState(() => opening = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Votre échange'),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => context.go('/app/chat'),
      ),
    ),
    body: Center(
      child: error == null
          ? const CircularProgressIndicator()
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(error!),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: opening ? null : open,
                  child: const Text('Réessayer'),
                ),
              ],
            ),
    ),
  );
}
