import 'package:flutter/material.dart';

import 'live_agent_ia_models.dart';
import 'live_agent_ia_service.dart';

class AgentSandboxPanel extends StatefulWidget {
  const AgentSandboxPanel({super.key, required this.agent, required this.service});
  final LiveAiAgent agent;
  final LiveAgentIaService service;

  @override
  State<AgentSandboxPanel> createState() => _AgentSandboxPanelState();
}

class _AgentSandboxPanelState extends State<AgentSandboxPanel> {
  final controller = TextEditingController();
  final history = <Map<String, String>>[];
  bool loading = false;

  @override
  void dispose() { controller.dispose(); super.dispose(); }

  Future<void> submit() async {
    final message = controller.text.trim();
    if (message.isEmpty || loading) return;
    setState(() { history.add({'role': 'user', 'content': message}); controller.clear(); loading = true; });
    try {
      final reply = await widget.service.test(widget.agent.id, message, history);
      if (mounted) setState(() => history.add({'role': 'assistant', 'content': reply}));
    } catch (error) {
      if (mounted) setState(() => history.add({'role': 'assistant', 'content': '$error'}));
    } finally { if (mounted) setState(() => loading = false); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text('Test — ${widget.agent.name}')),
        body: Column(children: [
          Expanded(child: ListView.builder(padding: const EdgeInsets.all(14), itemCount: history.length, itemBuilder: (_, index) { final item = history[index]; final own = item['role'] == 'user'; return Align(alignment: own ? Alignment.centerRight : Alignment.centerLeft, child: Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: own ? const Color(0xFF25D366) : Colors.white, borderRadius: BorderRadius.circular(14)), child: Text(item['content'] ?? '', style: TextStyle(color: own ? Colors.white : null))); })),
          Padding(padding: const EdgeInsets.all(12), child: Row(children: [Expanded(child: TextField(controller: controller, onSubmitted: (_) => submit(), decoration: const InputDecoration(hintText: 'Message client...'))), const SizedBox(width: 8), IconButton.filled(onPressed: loading ? null : submit, icon: const Icon(Icons.send_rounded))])),
        ]),
      );
}
