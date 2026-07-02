import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_agent_ia_models.dart';
import 'live_agent_ia_service.dart';

class AgentIaScreenNative extends StatefulWidget {
  const AgentIaScreenNative({super.key});

  @override
  State<AgentIaScreenNative> createState() => _AgentIaScreenNativeState();
}

class _AgentIaScreenNativeState extends State<AgentIaScreenNative> {
  late final LiveAgentIaService _service =
      LiveAgentIaService(Supabase.instance.client);
  late Future<List<LiveAiAgent>> _future = _service.listAgents();

  Future<void> _reload() async {
    setState(() => _future = _service.listAgents());
    await _future;
  }

  Future<void> _toggle(LiveAiAgent agent) async {
    try {
      await _service.setStatus(agent.id, agent.active ? 'paused' : 'active');
      await _reload();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

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
          actions: [
            IconButton(onPressed: _reload, icon: const Icon(Icons.refresh_rounded)),
          ],
        ),
        body: FutureBuilder<List<LiveAiAgent>>(
          future: _future,
          builder: (_, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(
                child: FilledButton.icon(
                  onPressed: _reload,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Réessayer'),
                ),
              );
            }
            final agents = snapshot.data ?? const <LiveAiAgent>[];
            final active = agents.where((item) => item.active).length;
            return RefreshIndicator(
              onRefresh: _reload,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  _Summary(total: agents.length, active: active),
                  const SizedBox(height: 18),
                  const Text('Mes Agents IA',
                      style:
                          TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 10),
                  if (agents.isEmpty)
                    const _EmptyAgentPanel()
                  else
                    ...agents.map(
                      (agent) => _AgentCard(
                        agent: agent,
                        onToggle: () => _toggle(agent),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      );
}

class _Summary extends StatelessWidget {
  const _Summary({required this.total, required this.active});
  final int total;
  final int active;

  @override
  Widget build(BuildContext context) => Container(
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
              Text('$active actif(s) sur $total',
                  style: const TextStyle(color: Color(0xFFC9F6E6))),
            ]),
          ),
        ]),
      );
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

class _AgentCard extends StatelessWidget {
  const _AgentCard({required this.agent, required this.onToggle});
  final LiveAiAgent agent;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final color = agent.active ? const Color(0xFF159B65) : const Color(0xFFE99B14);
    final messages = agent.stats['messages_handled'] ?? 0;
    final handoffs = agent.stats['handoffs'] ?? 0;
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
          Icon(
            agent.type == LiveAgentType.docs
                ? Icons.description_outlined
                : agent.type == LiveAgentType.website
                    ? Icons.language_rounded
                    : Icons.storefront_outlined,
            color: color,
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(agent.name, style: const TextStyle(fontWeight: FontWeight.w900)),
            Text('${agent.assistantName} · ${agent.wahaSessionName ?? 'Non connecté'}',
                style: const TextStyle(color: Color(0xFF6B8279), fontSize: 12)),
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
        decoration: BoxDecoration(
          color: color.withOpacity(.12),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(text,
            style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w800)),
      );
}
