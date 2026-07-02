import 'package:flutter/material.dart';

import 'agent_ia_list_loader.dart';

class AgentIaScreenNative extends StatelessWidget {
  const AgentIaScreenNative({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF7FAF8),
        appBar: AppBar(
          backgroundColor: const Color(0xFF075E54),
          foregroundColor: Colors.white,
          title: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Agents IA', style: TextStyle(fontWeight: FontWeight.w900)),
              Text('Connaissances, tests et WhatsApp',
                  style: TextStyle(fontSize: 11)),
            ],
          ),
        ),
        body: const AgentIaListLoader(),
      );
}
