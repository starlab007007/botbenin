import 'package:flutter/material.dart';

import 'live_agent_ia_models.dart';

class AgentIaTileNative extends StatelessWidget {
  const AgentIaTileNative({super.key, required this.agent, required this.onToggle});
  final LiveAiAgent agent;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final color = agent.active ? const Color(0xFF159B65) : const Color(0xFFE99B14);
    final messages = agent.stats['messages_handled'] ?? 0;
    final handoffs = agent.stats['handoffs'] ?? 0;
    final typeIcon = switch (agent.type) {
      LiveAgentType.docs => Icons.description_outlined,
      LiveAgentType.website => Icons.language_rounded,
      LiveAgentType.commerce => Icons.storefront_outlined,
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDFEBE6)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(typeIcon, color: color),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(agent.name, style: const TextStyle(fontWeight: FontWeight.w900)),
            Text('${agent.assistantName} · ${agent.wahaSessionName ?? 'Non connecté'}', style: const TextStyle(color: Color(0xFF6B8279), fontSize: 12)),
          ])),
          Switch(value: agent.active, onChanged: (_) => onToggle()),
        ]),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 6, children: [
          _Pill(text: agent.status, color: color),
          _Pill(text: '$messages messages', color: const Color(0xFF08756A)),
          _Pill(text: '$handoffs handoffs', color: const Color(0xFF7D5D00)),
        ]),
      ]),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.color});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: color.withOpacity(.12), borderRadius: BorderRadius.circular(99)),
        child: Text(text, style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w800)),
      );
}
