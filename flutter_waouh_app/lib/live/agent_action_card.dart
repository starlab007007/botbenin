import 'package:flutter/material.dart';

import 'live_agent_ia_models.dart';

class AgentActionCard extends StatelessWidget {
  const AgentActionCard({
    super.key,
    required this.agent,
    required this.onToggle,
    required this.onTest,
    required this.onDeploy,
  });

  final LiveAiAgent agent;
  final VoidCallback onToggle;
  final VoidCallback onTest;
  final VoidCallback onDeploy;

  @override
  Widget build(BuildContext context) {
    final online = agent.active;
    final color = online ? const Color(0xFF159B65) : const Color(0xFFE99B14);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFDFEBE6))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.smart_toy_outlined, color: color),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(agent.name, style: const TextStyle(fontWeight: FontWeight.w900)),
            Text('${agent.assistantName} · ${agent.type.label}', style: const TextStyle(color: Color(0xFF6B8279), fontSize: 12)),
          ])),
          Switch(value: online, onChanged: (_) => onToggle()),
        ]),
        const SizedBox(height: 10),
        Text(agent.wahaSessionName ?? 'Aucune session WhatsApp associée', style: const TextStyle(color: Color(0xFF6B8279), fontSize: 12)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: OutlinedButton.icon(onPressed: onTest, icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18), label: const Text('Tester'))),
          const SizedBox(width: 8),
          Expanded(child: FilledButton.icon(onPressed: onDeploy, icon: const Icon(Icons.send_rounded, size: 18), label: const Text('Déployer'), style: FilledButton.styleFrom(backgroundColor: const Color(0xFF08756A)))),
        ]),
      ]),
    );
  }
}
