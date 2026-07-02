import 'package:flutter/material.dart';

import 'agent_action_card.dart';
import 'live_agent_ia_models.dart';

class AgentIaListBody extends StatelessWidget {
  const AgentIaListBody({
    super.key,
    required this.items,
    required this.onToggle,
    required this.onCreate,
    required this.onTest,
    required this.onDeploy,
  });

  final List<LiveAiAgent> items;
  final ValueChanged<LiveAiAgent> onToggle;
  final VoidCallback onCreate;
  final ValueChanged<LiveAiAgent> onTest;
  final ValueChanged<LiveAiAgent> onDeploy;

  @override
  Widget build(BuildContext context) {
    final active = items.where((item) => item.active).length;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF075E54),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(.14),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome_rounded,
                  color: Color(0xFF25D366), size: 30),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Vos assistants WhatsApp',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 17)),
                const SizedBox(height: 4),
                Text('$active actif(s) sur ${items.length}',
                    style: const TextStyle(color: Color(0xFFC9F6E6))),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 50,
          child: FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add_rounded),
            label: const Text('Créer un Agent IA'),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
          ),
        ),
        const SizedBox(height: 18),
        const Text('Mes Agents IA',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
        const SizedBox(height: 10),
        if (items.isEmpty)
          const _EmptyAgentPanel()
        else
          ...items.map((agent) => AgentActionCard(
                agent: agent,
                onToggle: () => onToggle(agent),
                onTest: () => onTest(agent),
                onDeploy: () => onDeploy(agent),
              )),
      ],
    );
  }
}

class _EmptyAgentPanel extends StatelessWidget {
  const _EmptyAgentPanel();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(26),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFDFEBE6)),
        ),
        child: const Column(children: [
          Icon(Icons.smart_toy_outlined, size: 52, color: Color(0xFF6B8279)),
          SizedBox(height: 12),
          Text('Aucun Agent IA',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          SizedBox(height: 7),
          Text(
            'Créez un agent avec une personnalité, des connaissances et une session WhatsApp.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF6B8279)),
          ),
        ]),
      );
}
