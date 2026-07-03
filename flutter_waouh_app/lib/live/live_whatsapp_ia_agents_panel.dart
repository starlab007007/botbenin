import 'package:flutter/material.dart';

import 'live_whatsapp_ia_agent_detail.dart';
import 'live_whatsapp_ia_agent_models.dart';
import 'live_whatsapp_ia_agent_repository.dart';
import 'live_whatsapp_ia_agent_wizard.dart';
import 'live_whatsapp_ia_models.dart';

const _panelGreen = Color(0xFF08756A);
const _panelInk = Color(0xFF16231F);
const _panelMuted = Color(0xFF62756D);

class LiveWhatsAppIaAgentsPanel extends StatelessWidget {
  const LiveWhatsAppIaAgentsPanel({
    super.key,
    required this.agents,
    required this.sessions,
    required this.repository,
    required this.onChanged,
    this.initialSessionName,
  });

  final List<LiveWhatsAppAiAgent> agents;
  final List<LiveWhatsAppSession> sessions;
  final LiveWhatsAppAiAgentRepository repository;
  final Future<void> Function() onChanged;
  final String? initialSessionName;

  Future<void> _openWizard(BuildContext context, {String? sessionName}) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => LiveWhatsAppIaAgentWizard(
          repository: repository,
          sessions: sessions,
          initialSessionName: sessionName ?? initialSessionName,
        ),
      ),
    );
    if (changed == true) await onChanged();
  }

  Future<void> _openAgent(
    BuildContext context,
    LiveWhatsAppAiAgent agent,
  ) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => LiveWhatsAppIaAgentDetailScreen(
          repository: repository,
          agent: agent,
          sessions: sessions,
        ),
      ),
    );
    if (changed == true) await onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final active = agents.where((item) => item.isActive).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const SizedBox(height: 22),
        Row(
          children: <Widget>[
            const Expanded(
              child: Text(
                'Agents IA',
                style: TextStyle(
                  color: _panelInk,
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            if (active > 0) _TinyPill(label: '$active actif', color: const Color(0xFF159B65)),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: 'Créer un agent',
              onPressed: () => _openWizard(context),
              icon: const Icon(Icons.add_rounded),
              style: IconButton.styleFrom(
                backgroundColor: const Color(0xFF25D366),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (agents.isEmpty)
          _EmptyAgents(onCreate: () => _openWizard(context))
        else
          ...agents.map(
            (agent) => Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: _AgentCard(
                agent: agent,
                onTap: () => _openAgent(context, agent),
              ),
            ),
          ),
      ],
    );
  }
}

class _EmptyAgents extends StatelessWidget {
  const _EmptyAgents({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFDDEBE4)),
        ),
        child: Row(
          children: <Widget>[
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF9F2),
                borderRadius: BorderRadius.circular(13),
              ),
              child: const Icon(Icons.smart_toy_rounded, color: _panelGreen),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Aucun agent', style: TextStyle(fontWeight: FontWeight.w900, color: _panelInk)),
                  SizedBox(height: 2),
                  Text('Créez-le puis liez-le à une ligne.', style: TextStyle(color: _panelMuted, fontSize: 12)),
                ],
              ),
            ),
            TextButton(onPressed: onCreate, child: const Text('Créer')),
          ],
        ),
      );
}

class _AgentCard extends StatelessWidget {
  const _AgentCard({required this.agent, required this.onTap});

  final LiveWhatsAppAiAgent agent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final active = agent.isActive;
    final color = active ? const Color(0xFF159B65) : const Color(0xFF6D7D76);
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: active ? const Color(0xFFC6ECD9) : const Color(0xFFDDEBE4)),
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_typeIcon(agent.agentType), color: color, size: 21),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(
                            agent.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: _panelInk, fontSize: 15, fontWeight: FontWeight.w900),
                          ),
                        ),
                        _TinyPill(
                          label: active ? 'Actif' : agent.isPaused ? 'Pause' : 'Brouillon',
                          color: color,
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      agent.wahaSessionName == null
                          ? '${_typeLabel(agent.agentType)} · non lié'
                          : '${_typeLabel(agent.agentType)} · ${agent.wahaSessionName}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: _panelMuted, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    if (active) ...<Widget>[
                      const SizedBox(height: 5),
                      Text('${agent.messagesHandled} messages · ${agent.handoffs} humains', style: const TextStyle(color: _panelMuted, fontSize: 11)),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right_rounded, color: _panelMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _TinyPill extends StatelessWidget {
  const _TinyPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900)),
      );
}

IconData _typeIcon(String value) {
  switch (value) {
    case 'docs':
      return Icons.description_outlined;
    case 'website':
      return Icons.language_rounded;
    default:
      return Icons.shopping_bag_outlined;
  }
}

String _typeLabel(String value) {
  switch (value) {
    case 'docs':
      return 'Documents';
    case 'website':
      return 'Site web';
    default:
      return 'Commerce';
  }
}
