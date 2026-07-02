import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'agent_deploy_sheet.dart';
import 'agent_ia_list_body.dart';
import 'agent_quick_create_sheet.dart';
import 'agent_sandbox_panel.dart';
import 'live_agent_ia_models.dart';
import 'live_agent_ia_service.dart';

class AgentIaListLoaderV2 extends StatefulWidget {
  const AgentIaListLoaderV2({super.key});
  @override
  State<AgentIaListLoaderV2> createState() => _AgentIaListLoaderV2State();
}

class _AgentIaListLoaderV2State extends State<AgentIaListLoaderV2> {
  late final LiveAgentIaService service = LiveAgentIaService(Supabase.instance.client);
  late Future<List<LiveAiAgent>> future = service.listAgents();

  Future<void> refresh() async { setState(() => future = service.listAgents()); await future; }

  Future<void> create() async {
    final agent = await showAgentQuickCreateSheet(context, service);
    if (agent != null && mounted) await refresh();
  }

  Future<void> test(LiveAiAgent agent) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => AgentSandboxPanel(agent: agent, service: service)));
    if (mounted) await refresh();
  }

  Future<void> deploy(LiveAiAgent agent) async {
    try {
      final changed = await showAgentDeploySheet(context, agentId: agent.id, service: service);
      if (changed && mounted) await refresh();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> toggle(LiveAiAgent agent) async {
    try {
      await service.setStatus(agent.id, agent.active ? 'paused' : 'active');
      await refresh();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<List<LiveAiAgent>>(
    future: future,
    builder: (_, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
      if (snapshot.hasError) return Center(child: FilledButton.icon(onPressed: refresh, icon: const Icon(Icons.refresh_rounded), label: const Text('Réessayer')));
      return RefreshIndicator(onRefresh: refresh, child: AgentIaListBody(items: snapshot.data ?? const [], onToggle: toggle, onCreate: create, onTest: test, onDeploy: deploy));
    },
  );
}
