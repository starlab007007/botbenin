import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'agent_ia_list_body.dart';
import 'live_agent_ia_models.dart';
import 'live_agent_ia_service.dart';

class AgentIaListLoader extends StatefulWidget {
  const AgentIaListLoader({super.key});

  @override
  State<AgentIaListLoader> createState() => _AgentIaListLoaderState();
}

class _AgentIaListLoaderState extends State<AgentIaListLoader> {
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
  Widget build(BuildContext context) => FutureBuilder<List<LiveAiAgent>>(
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
          return RefreshIndicator(
            onRefresh: _reload,
            child: AgentIaListBody(
              items: snapshot.data ?? const [],
              onToggle: _toggle,
            ),
          );
        },
      );
}
