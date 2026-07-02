import 'package:flutter/material.dart';

import 'live_agent_ia_models.dart';
import 'live_agent_ia_service.dart';

Future<LiveAiAgent?> showAgentQuickCreateSheet(
  BuildContext context,
  LiveAgentIaService service,
) => showModalBottomSheet<LiveAiAgent>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AgentQuickCreateSheet(service: service),
    );

class _AgentQuickCreateSheet extends StatefulWidget {
  const _AgentQuickCreateSheet({required this.service});
  final LiveAgentIaService service;

  @override
  State<_AgentQuickCreateSheet> createState() => _AgentQuickCreateSheetState();
}

class _AgentQuickCreateSheetState extends State<_AgentQuickCreateSheet> {
  final name = TextEditingController();
  final assistant = TextEditingController(text: 'Aïcha');
  final tone = TextEditingController(text: 'chaleureux et vendeur');
  final sector = TextEditingController(text: 'commerce');
  bool busy = false;
  bool emojis = true;
  LiveAgentType type = LiveAgentType.commerce;

  @override
  void dispose() { name.dispose(); assistant.dispose(); tone.dispose(); sector.dispose(); super.dispose(); }

  Future<void> create() async {
    if (name.text.trim().isEmpty) return;
    setState(() => busy = true);
    try {
      final agent = await widget.service.create(
        name: name.text,
        type: type,
        sector: sector.text,
        assistantName: assistant.text,
        tone: tone.text,
        emojis: emojis,
        capabilities: const {'qa': true, 'sell': true, 'appointments': false, 'qualify': true, 'handoff': true},
      );
      if (mounted) Navigator.pop(context, agent);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 42, height: 5, decoration: BoxDecoration(color: const Color(0xFFC9D8D2), borderRadius: BorderRadius.circular(99))),
              const SizedBox(height: 14),
              const Align(alignment: Alignment.centerLeft, child: Text('Nouvel Agent IA', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900))),
              const SizedBox(height: 12),
              TextField(controller: name, autofocus: true, decoration: const InputDecoration(labelText: 'Nom de votre activité')),
              const SizedBox(height: 10),
              DropdownButtonFormField<LiveAgentType>(value: type, items: LiveAgentType.values.map((value) => DropdownMenuItem(value: value, child: Text(value.label))).toList(), onChanged: (value) => setState(() => type = value!), decoration: const InputDecoration(labelText: 'Type d’agent')),
              const SizedBox(height: 10),
              TextField(controller: assistant, decoration: const InputDecoration(labelText: 'Prénom de votre assistant')),
              const SizedBox(height: 10),
              TextField(controller: tone, decoration: const InputDecoration(labelText: 'Ton / personnalité')),
              const SizedBox(height: 10),
              TextField(controller: sector, decoration: const InputDecoration(labelText: 'Secteur')),
              SwitchListTile(value: emojis, onChanged: (value) => setState(() => emojis = value), title: const Text('Utiliser des emojis'), contentPadding: EdgeInsets.zero),
              const SizedBox(height: 8),
              SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: busy ? null : create, icon: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.auto_awesome_rounded), label: const Text('Créer et tester'), style: FilledButton.styleFrom(backgroundColor: const Color(0xFF08756A)))),
            ]),
          ),
        ),
      );
