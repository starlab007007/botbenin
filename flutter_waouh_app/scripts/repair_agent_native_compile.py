#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]

quick = root / 'lib/live/agent_quick_create_sheet.dart'
quick_text = quick.read_text(encoding='utf-8')
if not quick_text.rstrip().endswith('}'):
    quick.write_text(quick_text.rstrip() + '\n}\n', encoding='utf-8')

sandbox = root / 'lib/live/agent_sandbox_panel.dart'
sandbox.write_text('''import 'package:flutter/material.dart';

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
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _history = <Map<String, String>>[];
  bool _loading = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final message = _controller.text.trim();
    if (message.isEmpty || _loading) return;

    setState(() {
      _history.add({'role': 'user', 'content': message});
      _controller.clear();
      _loading = true;
    });

    try {
      final reply = await widget.service.test(widget.agent.id, message, _history);
      if (mounted) {
        setState(() => _history.add({'role': 'assistant', 'content': reply}));
      }
    } catch (error) {
      if (mounted) {
        setState(() => _history.add({'role': 'assistant', 'content': '$error'}));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Test — ${widget.agent.name}')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: _history.length,
              itemBuilder: (_, index) {
                final item = _history[index];
                final own = item['role'] == 'user';
                return Align(
                  alignment: own ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: own ? const Color(0xFF25D366) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      item['content'] ?? '',
                      style: TextStyle(color: own ? Colors.white : null),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    onSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(hintText: 'Message client...'),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _loading ? null : _submit,
                  icon: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
''', encoding='utf-8')

print('Agent IA Dart syntax repaired.')
