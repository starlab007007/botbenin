part of 'live_whatsapp_ia_agent_module.dart';

extension LiveWhatsAppAiAgentOwnershipManagement
    on LiveWhatsAppAiAgentRepository {
  Future<LiveWhatsAppAiAgent> updateOwnedAgent({
    required LiveWhatsAppAiAgent agent,
    required LiveWhatsAppIaAgentEditValue value,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const LiveWhatsAppIaException(
        'Votre session est expirée. Reconnectez-vous.',
      );
    }

    final current = await client
        .from('waouh_ai_agents')
        .select('persona')
        .eq('id', agent.id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (current == null) {
      throw const LiveWhatsAppIaException(
        'Cet Agent IA est introuvable ou ne vous appartient pas.',
      );
    }

    final persona = current['persona'] is Map
        ? Map<String, dynamic>.from(current['persona'] as Map)
        : <String, dynamic>{};

    final row = await client
        .from('waouh_ai_agents')
        .update(<String, dynamic>{
          'name': value.name,
          'sector': value.sector,
          'template_id': value.sector,
          'persona': <String, dynamic>{
            ...persona,
            'name': value.personaName,
            'tone': value.tone,
            'emojis': value.emojis,
          },
          'capabilities': value.capabilities,
        })
        .eq('id', agent.id)
        .eq('user_id', user.id)
        .select(
          'id,name,sector,agent_type,website_url,persona,capabilities,status,stats,waha_session_name,paused_contacts,created_at,updated_at',
        )
        .single();

    return LiveWhatsAppAiAgent.fromJson(
      Map<String, dynamic>.from(row as Map),
    );
  }

  Future<void> deleteOwnedAgent(LiveWhatsAppAiAgent agent) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const LiveWhatsAppIaException(
        'Votre session est expirée. Reconnectez-vous.',
      );
    }

    final owned = await client
        .from('waouh_ai_agents')
        .select('id')
        .eq('id', agent.id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (owned == null) {
      throw const LiveWhatsAppIaException(
        'Suppression impossible : cet Agent IA est introuvable ou non autorisé.',
      );
    }

    for (final table in <String>[
      'waouh_ai_agent_conversations',
      'waouh_ai_agent_partner_products',
      'waouh_ai_agent_products',
      'waouh_ai_agent_chunks',
    ]) {
      await client.from(table).delete().eq('agent_id', agent.id);
    }

    final deleted = await client
        .from('waouh_ai_agents')
        .delete()
        .eq('id', agent.id)
        .eq('user_id', user.id)
        .select('id');

    if (deleted.isEmpty) {
      throw const LiveWhatsAppIaException(
        'Suppression impossible : cet Agent IA est introuvable ou non autorisé.',
      );
    }
  }
}

class LiveWhatsAppIaAgentEditValue {
  const LiveWhatsAppIaAgentEditValue({
    required this.name,
    required this.personaName,
    required this.tone,
    required this.sector,
    required this.emojis,
    required this.capabilities,
  });

  final String name;
  final String personaName;
  final String tone;
  final String sector;
  final bool emojis;
  final Map<String, bool> capabilities;
}

class _OwnedAgentEditSheet extends StatefulWidget {
  const _OwnedAgentEditSheet({required this.agent});
  final LiveWhatsAppAiAgent agent;

  @override
  State<_OwnedAgentEditSheet> createState() => _OwnedAgentEditSheetState();
}

class _OwnedAgentEditSheetState extends State<_OwnedAgentEditSheet> {
  final _name = TextEditingController();
  final _persona = TextEditingController();
  final _tone = TextEditingController();
  late String _sector;
  late bool _emojis;
  late Map<String, bool> _capabilities;

  static const _sectors = <String, String>{
    'commerce': 'Boutique / Commerce',
    'food': 'Alimentation / Restaurant',
    'beauty': 'Mode / Beauté',
    'electronics': 'Téléphonie / Électronique',
    'auto': 'Auto / Pièces',
    'health': 'Santé / Bien-être',
    'education': 'Éducation / Formation',
    'administration': 'Administration / Accueil',
    'hospitality': 'Hôtellerie / Réservation',
    'realestate': 'Immobilier',
    'services': 'Services',
    'other': 'Autre activité',
  };

  @override
  void initState() {
    super.initState();
    _name.text = widget.agent.name;
    _persona.text = widget.agent.personaName;
    _tone.text = widget.agent.tone;
    _sector = widget.agent.sector.isEmpty ? 'other' : widget.agent.sector;
    _emojis = widget.agent.emojis;
    _capabilities = Map<String, bool>.from(widget.agent.capabilities);
  }

  @override
  void dispose() {
    _name.dispose();
    _persona.dispose();
    _tone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = <String, String>{
      ..._sectors,
      if (!_sectors.containsKey(_sector)) _sector: _sector,
    };

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Row(
                children: <Widget>[
                  const Icon(Icons.tune_rounded, color: _agentGreen),
                  const SizedBox(width: 9),
                  const Expanded(
                    child: Text(
                      'Modifier l’Agent IA',
                      style: TextStyle(
                        color: _agentInk,
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _name,
                decoration:
                    const InputDecoration(labelText: 'Nom de l’activité'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _persona,
                decoration:
                    const InputDecoration(labelText: 'Nom de l’assistant'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _tone,
                decoration: const InputDecoration(labelText: 'Ton de réponse'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _sector,
                isExpanded: true,
                decoration:
                    const InputDecoration(labelText: 'Secteur d’activité'),
                items: items.entries
                    .map((item) => DropdownMenuItem<String>(
                          value: item.key,
                          child: Text(item.value),
                        ))
                    .toList(),
                onChanged: (value) {
                  if (value != null) setState(() => _sector = value);
                },
              ),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: const Text('Emojis dans les réponses'),
                value: _emojis,
                activeColor: _agentBright,
                onChanged: (value) => setState(() => _emojis = value),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Capacités',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: _agentInk,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              ...const <(String, String)>[
                ('qa', 'Répondre aux questions'),
                ('sell', 'Présenter et vendre'),
                ('appointments', 'Prendre rendez-vous'),
                ('qualify', 'Qualifier un besoin'),
                ('handoff', 'Passer la main à un humain'),
              ].map(
                (item) => CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  title: Text(item.$2),
                  value: _capabilities[item.$1] == true,
                  onChanged: (value) => setState(
                    () => _capabilities[item.$1] = value == true,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    final name = _name.text.trim();
                    final persona = _persona.text.trim();
                    if (name.isEmpty || persona.isEmpty) return;
                    Navigator.pop(
                      context,
                      LiveWhatsAppIaAgentEditValue(
                        name: name,
                        personaName: persona,
                        tone: _tone.text.trim().isEmpty
                            ? 'chaleureux et professionnel'
                            : _tone.text.trim(),
                        sector: _sector,
                        emojis: _emojis,
                        capabilities: Map<String, bool>.from(_capabilities),
                      ),
                    );
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: _agentGreen,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(50),
                  ),
                  icon: const Icon(Icons.save_rounded),
                  label: const Text('Enregistrer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
