import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_models.dart';

const _agentGreen = Color(0xFF08756A);
const _agentInk = Color(0xFF16231F);

class LiveWhatsAppAiAgent {
  const LiveWhatsAppAiAgent({
    required this.id,
    required this.name,
    required this.sector,
    required this.agentType,
    required this.status,
    required this.personaName,
    required this.tone,
    required this.emojis,
    required this.capabilities,
    required this.stats,
    this.wahaSessionName,
    this.websiteUrl,
    this.pausedContacts = const <String>[],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String sector;
  final String agentType;
  final String status;
  final String personaName;
  final String tone;
  final bool emojis;
  final Map<String, bool> capabilities;
  final Map<String, dynamic> stats;
  final String? wahaSessionName;
  final String? websiteUrl;
  final List<String> pausedContacts;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isActive => status == 'active';
  bool get isDraft =>
      status == 'draft' || status == 'testing' || status == 'training';
  int get messagesHandled => _asInt(stats['messages_handled']);
  int get handoffs => _asInt(stats['handoffs']);

  factory LiveWhatsAppAiAgent.fromJson(Map<String, dynamic> row) {
    final persona = _map(row['persona']);
    final capabilities = _map(row['capabilities']);
    final stats = _map(row['stats']);
    final paused = row['paused_contacts'] is List
        ? (row['paused_contacts'] as List).map((item) => '$item').toList()
        : const <String>[];
    return LiveWhatsAppAiAgent(
      id: '${row['id'] ?? ''}',
      name: '${row['name'] ?? 'Agent sans nom'}',
      sector: '${row['sector'] ?? 'other'}',
      agentType: '${row['agent_type'] ?? 'commerce'}',
      status: '${row['status'] ?? 'draft'}',
      personaName: '${persona['name'] ?? 'Assistant'}',
      tone: '${persona['tone'] ?? 'chaleureux et professionnel'}',
      emojis: persona['emojis'] != false,
      capabilities: {
        'qa': capabilities['qa'] != false,
        'sell': capabilities['sell'] == true,
        'appointments': capabilities['appointments'] == true,
        'qualify': capabilities['qualify'] == true,
        'handoff': capabilities['handoff'] != false,
      },
      stats: stats,
      wahaSessionName: _cleanNullable(row['waha_session_name']),
      websiteUrl: _cleanNullable(row['website_url']),
      pausedContacts: paused,
      createdAt: DateTime.tryParse('${row['created_at'] ?? ''}')?.toLocal(),
      updatedAt: DateTime.tryParse('${row['updated_at'] ?? ''}')?.toLocal(),
    );
  }
}

class LiveAgentProduct {
  const LiveAgentProduct({
    required this.name,
    this.price,
    this.description,
    this.id,
    this.businessName,
    this.available = true,
  });

  final String? id;
  final String name;
  final int? price;
  final String? description;
  final String? businessName;
  final bool available;

  String get priceLabel =>
      price == null ? 'Prix sur demande' : '${_formatNumber(price!)} FCFA';

  factory LiveAgentProduct.partner(Map<String, dynamic> row) =>
      LiveAgentProduct(
        id: '${row['id'] ?? ''}',
        name: '${row['nom'] ?? ''}',
        price: _asNullableInt(row['prix_min']),
        description: _cleanNullable(row['description']),
        businessName: _cleanNullable(row['business_name']),
        available: row['disponible'] != false,
      );
}

class LiveAgentDraft {
  LiveAgentDraft({
    required this.name,
    required this.agentType,
    required this.sector,
    required this.personaName,
    required this.tone,
    this.emojis = true,
    Map<String, bool>? capabilities,
    Set<String>? selectedPartnerProductIds,
    List<LiveAgentProduct>? manualProducts,
    this.websiteUrl = '',
    this.crawlSite = true,
    this.documentUrl = '',
    this.knowledge = '',
    this.knowledgeUrl = '',
  })  : capabilities = capabilities ??
            {
              'qa': true,
              'sell': true,
              'appointments': false,
              'qualify': true,
              'handoff': true,
            },
        selectedPartnerProductIds = selectedPartnerProductIds ?? <String>{},
        manualProducts = manualProducts ?? <LiveAgentProduct>[];

  String name;
  String agentType;
  String sector;
  String personaName;
  String tone;
  bool emojis;
  Map<String, bool> capabilities;
  Set<String> selectedPartnerProductIds;
  List<LiveAgentProduct> manualProducts;
  String websiteUrl;
  bool crawlSite;
  String documentUrl;
  String knowledge;
  String knowledgeUrl;
}

class LiveAgentConversation {
  const LiveAgentConversation({
    required this.id,
    required this.agentId,
    required this.phone,
    required this.messages,
    required this.lastActivity,
    this.name,
    this.humanTakeover = false,
    this.needsHandoff = false,
  });

  final String id;
  final String agentId;
  final String phone;
  final String? name;
  final List<LiveAgentMessage> messages;
  final DateTime? lastActivity;
  final bool humanTakeover;
  final bool needsHandoff;

  factory LiveAgentConversation.fromJson(Map<String, dynamic> row) {
    final raw = row['messages'] is List ? row['messages'] as List : const [];
    return LiveAgentConversation(
      id: '${row['id'] ?? ''}',
      agentId: '${row['agent_id'] ?? ''}',
      phone: '${row['wa_contact_phone'] ?? ''}',
      name: _cleanNullable(row['wa_contact_name']),
      messages: raw
          .whereType<Map>()
          .map((item) =>
              LiveAgentMessage.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
      lastActivity:
          DateTime.tryParse('${row['last_activity'] ?? ''}')?.toLocal(),
      humanTakeover: row['human_takeover'] == true,
      needsHandoff: row['needs_handoff'] == true,
    );
  }
}

class LiveAgentMessage {
  const LiveAgentMessage({required this.role, required this.content});
  final String role;
  final String content;

  factory LiveAgentMessage.fromJson(Map<String, dynamic> row) =>
      LiveAgentMessage(
        role: '${row['role'] ?? 'assistant'}',
        content: '${row['content'] ?? ''}',
      );
}

class LiveWhatsAppAiAgentRepository {
  LiveWhatsAppAiAgentRepository(this.client);

  final SupabaseClient client;

  User get _user {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const LiveWhatsAppIaException(
          'Votre session est expirée. Reconnectez-vous.');
    }
    return user;
  }

  Future<List<LiveWhatsAppAiAgent>> listAgents() async {
    final rows = await client
        .from('waouh_ai_agents')
        .select(
            'id,name,sector,agent_type,website_url,persona,capabilities,status,stats,waha_session_name,paused_contacts,created_at,updated_at')
        .eq('user_id', _user.id)
        .order('created_at', ascending: false);
    return (rows as List)
        .whereType<Map>()
        .map((item) =>
            LiveWhatsAppAiAgent.fromJson(Map<String, dynamic>.from(item)))
        .where((item) => item.id.isNotEmpty)
        .toList();
  }

  Future<List<LiveAgentProduct>> listPartnerProducts() async {
    final rows = await client
        .from('waouh_partner_products')
        .select('id,nom,description,prix_min,disponible,business_id')
        .order('nom');
    return (rows as List)
        .whereType<Map>()
        .map(
            (item) => LiveAgentProduct.partner(Map<String, dynamic>.from(item)))
        .where((item) => item.id != null && item.name.isNotEmpty)
        .toList();
  }

  Future<LiveWhatsAppAiAgent> createTestingDraft(LiveAgentDraft draft) async {
    final user = _user;
    final row = await client
        .from('waouh_ai_agents')
        .insert({
          'user_id': user.id,
          'name': draft.name.trim(),
          'sector': draft.sector,
          'template_id': draft.sector,
          'agent_type': draft.agentType,
          'website_url':
              draft.agentType == 'website' ? draft.websiteUrl.trim() : null,
          'persona': {
            'name': draft.personaName.trim(),
            'tone': draft.tone.trim(),
            'emojis': draft.emojis,
          },
          'capabilities': draft.capabilities,
          'status': 'testing',
        })
        .select()
        .single();
    final agent = LiveWhatsAppAiAgent.fromJson(Map<String, dynamic>.from(row));

    try {
      final products = draft.manualProducts
          .where((item) => item.name.trim().isNotEmpty)
          .toList();
      if (products.isNotEmpty) {
        await client.from('waouh_ai_agent_products').insert(products
            .asMap()
            .entries
            .map((entry) => {
                  'agent_id': agent.id,
                  'user_id': user.id,
                  'name': entry.value.name.trim(),
                  'price_fcfa': entry.value.price,
                  'description': entry.value.description?.trim(),
                  'position': entry.key,
                })
            .toList());
      }
      if (draft.selectedPartnerProductIds.isNotEmpty) {
        await client
            .from('waouh_ai_agent_partner_products')
            .insert(draft.selectedPartnerProductIds
                .map((productId) => {
                      'agent_id': agent.id,
                      'product_id': productId,
                      'user_id': user.id,
                    })
                .toList());
      }
      final starterFaq = _starterFaq(draft.sector);
      final notes = <String>[starterFaq, draft.knowledge.trim()]
          .where((item) => item.isNotEmpty)
          .join('\n\n---\n\n');
      if (notes.isNotEmpty) {
        await _invoke('waouh-agent-ingest', {
          'agent_id': agent.id,
          'source_type': 'text',
          'text': notes,
        });
      }
      final sourceUrl = draft.agentType == 'website'
          ? draft.websiteUrl.trim()
          : draft.agentType == 'docs'
              ? draft.documentUrl.trim()
              : draft.knowledgeUrl.trim();
      if (sourceUrl.isNotEmpty) {
        await _invoke('waouh-agent-ingest', {
          'agent_id': agent.id,
          'source_type': draft.agentType == 'website' ? 'website' : 'url',
          'url': sourceUrl,
          if (draft.agentType == 'website') 'crawl': draft.crawlSite,
        });
      }
      if (draft.agentType != 'website' &&
          draft.knowledgeUrl.trim().isNotEmpty &&
          sourceUrl != draft.knowledgeUrl.trim()) {
        await _invoke('waouh-agent-ingest', {
          'agent_id': agent.id,
          'source_type': 'url',
          'url': draft.knowledgeUrl.trim(),
        });
      }
      return agent;
    } catch (_) {
      await client.from('waouh_ai_agents').delete().eq('id', agent.id);
      rethrow;
    }
  }

  Future<String> sandbox({
    required LiveWhatsAppAiAgent agent,
    required String message,
    required List<LiveAgentMessage> history,
  }) async {
    final data = await _invoke('waouh-agent-chat', {
      'agent_id': agent.id,
      'message': message,
      'history': history
          .map((item) => {'role': item.role, 'content': item.content})
          .toList(),
      'persist': false,
    });
    return '${data['reply'] ?? '…'}';
  }

  Future<void> deploy(
      {required LiveWhatsAppAiAgent agent,
      required String? sessionName}) async {
    final clean = _cleanNullable(sessionName);
    if (clean != null) {
      final conflict = await client
          .from('waouh_ai_agents')
          .select('id,name')
          .eq('user_id', _user.id)
          .eq('waha_session_name', clean)
          .eq('status', 'active')
          .neq('id', agent.id)
          .maybeSingle();
      if (conflict != null) {
        throw LiveWhatsAppIaException(
            'La ligne « $clean » est déjà utilisée par l’agent « ${conflict['name']} ».');
      }
    }
    await client.from('waouh_ai_agents').update({
      'waha_session_name': clean,
      'status': clean == null ? 'draft' : 'active',
    }).eq('id', agent.id);
  }

  Future<void> setPaused(LiveWhatsAppAiAgent agent, bool paused) => client
      .from('waouh_ai_agents')
      .update({'status': paused ? 'paused' : 'active'}).eq('id', agent.id);

  Future<List<LiveAgentConversation>> conversations(String agentId) async {
    final rows = await client
        .from('waouh_ai_agent_conversations')
        .select(
            'id,agent_id,wa_contact_phone,wa_contact_name,messages,last_activity,human_takeover,needs_handoff')
        .eq('agent_id', agentId)
        .order('last_activity', ascending: false)
        .limit(50);
    return (rows as List)
        .whereType<Map>()
        .map((item) =>
            LiveAgentConversation.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<void> manual({
    required LiveWhatsAppAiAgent agent,
    required String phone,
    String? message,
    String? mode,
  }) async {
    await _invoke('waouh-agent-manual-reply', {
      'agent_id': agent.id,
      'contact_phone': phone,
      if (message != null && message.trim().isNotEmpty)
        'message': message.trim(),
      if (mode != null) 'mode': mode,
    });
  }

  Future<Map<String, dynamic>> insights(String agentId) =>
      _invoke('waouh-agent-insights', {
        'agent_id': agentId,
        'mode': 'overview',
      });

  Future<List<LiveAgentProduct>> parseProductImage(XFile image) async {
    final bytes = await image.readAsBytes();
    final response = await _invoke('waouh-agent-parse-catalog', {
      'mode': 'image',
      'image_base64': base64Encode(bytes),
      'image_mime': image.mimeType ?? 'image/jpeg',
    });
    final rows =
        response['products'] is List ? response['products'] as List : const [];
    return rows
        .whereType<Map>()
        .map((item) {
          final row = Map<String, dynamic>.from(item);
          return LiveAgentProduct(
            name: '${row['name'] ?? ''}',
            price: _asNullableInt(row['price_fcfa']),
            description: _cleanNullable(row['description']),
          );
        })
        .where((item) => item.name.isNotEmpty)
        .toList();
  }

  Future<Map<String, dynamic>> _invoke(
      String functionName, Map<String, dynamic> body) async {
    try {
      final response = await client.functions.invoke(functionName, body: body);
      if (response.data is Map) {
        final map = Map<String, dynamic>.from(response.data as Map);
        if (map['error'] != null && '${map['error']}'.trim().isNotEmpty) {
          throw LiveWhatsAppIaException('${map['error']}');
        }
        return map;
      }
      return <String, dynamic>{};
    } on FunctionException catch (error) {
      throw LiveWhatsAppIaException(
          _edgeDiagnostic(error.details?.toString() ?? error.toString()));
    } catch (error) {
      if (error is LiveWhatsAppIaException) rethrow;
      throw LiveWhatsAppIaException(_edgeDiagnostic('$error'));
    }
  }
}

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
    final changed = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => LiveWhatsAppIaAgentWizard(
        repository: repository,
        sessions: sessions,
        initialSessionName: sessionName ?? initialSessionName,
      ),
    ));
    if (changed == true) await onChanged();
  }

  Future<void> _openDetail(
      BuildContext context, LiveWhatsAppAiAgent agent) async {
    final changed = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => LiveWhatsAppIaAgentDetailScreen(
          repository: repository, agent: agent, sessions: sessions),
    ));
    if (changed == true) await onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final active = agents.where((item) => item.isActive).length;
    final drafts = agents.where((item) => item.isDraft).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        Row(
          children: [
            const Expanded(
              child: Text('Agents IA',
                  style: TextStyle(
                      color: _agentInk,
                      fontSize: 21,
                      fontWeight: FontWeight.w900)),
            ),
            if (active > 0)
              _TinyPill(
                  label: '$active actif${active > 1 ? 's' : ''}',
                  color: const Color(0xFF159B65)),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: 'Nouvel agent',
              onPressed: () => _openWizard(context),
              style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF25D366),
                  foregroundColor: Colors.white),
              icon: const Icon(Icons.add_rounded),
            ),
          ],
        ),
        const SizedBox(height: 9),
        Text(
          agents.isEmpty
              ? 'Créez, testez puis déployez un Agent IA sans quitter WhatsApp IA.'
              : '$active actif${active > 1 ? 's' : ''} · $drafts brouillon${drafts > 1 ? 's' : ''}',
          style: const TextStyle(
              color: Color(0xFF62756D),
              fontSize: 12.5,
              fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        if (agents.isEmpty)
          _AgentEmpty(onCreate: () => _openWizard(context))
        else
          ...agents.map((agent) => Padding(
                padding: const EdgeInsets.only(bottom: 11),
                child: _AgentCard(
                  agent: agent,
                  onTap: () => _openDetail(context, agent),
                  onDeploy: agent.wahaSessionName == null
                      ? () => _openDetail(context, agent)
                      : null,
                ),
              )),
      ],
    );
  }
}

class LiveWhatsAppIaAgentWizard extends StatefulWidget {
  const LiveWhatsAppIaAgentWizard({
    super.key,
    required this.repository,
    required this.sessions,
    this.initialSessionName,
  });

  final LiveWhatsAppAiAgentRepository repository;
  final List<LiveWhatsAppSession> sessions;
  final String? initialSessionName;

  @override
  State<LiveWhatsAppIaAgentWizard> createState() =>
      _LiveWhatsAppIaAgentWizardState();
}

class _LiveWhatsAppIaAgentWizardState extends State<LiveWhatsAppIaAgentWizard> {
  final _name = TextEditingController();
  final _persona = TextEditingController(text: 'Ami·e du magasin');
  final _tone =
      TextEditingController(text: 'chaleureux, professionnel et vendeur');
  final _knowledge = TextEditingController();
  final _knowledgeUrl = TextEditingController();
  final _websiteUrl = TextEditingController();
  final _documentUrl = TextEditingController();
  final _preview = TextEditingController();
  final _picker = ImagePicker();
  int _page = 0;
  bool _busy = false;
  bool _tested = false;
  String? _selectedSession;
  late LiveAgentDraft _draft;
  LiveWhatsAppAiAgent? _created;
  List<LiveAgentProduct> _partnerProducts = const [];
  final List<LiveAgentMessage> _messages = <LiveAgentMessage>[];

  static const _types = <Map<String, dynamic>>[
    {
      'id': 'commerce',
      'label': 'Commerce',
      'icon': Icons.shopping_bag_outlined,
      'description': 'Catalogue et ventes'
    },
    {
      'id': 'docs',
      'label': 'Documents',
      'icon': Icons.description_outlined,
      'description': 'FAQ et documents'
    },
    {
      'id': 'website',
      'label': 'Site web',
      'icon': Icons.language_rounded,
      'description': 'Contenu du site'
    },
  ];
  static const _sectors = <Map<String, String>>[
    {'id': 'commerce', 'emoji': '🛍️', 'label': 'Boutique / Commerce'},
    {'id': 'restaurant', 'emoji': '🍽️', 'label': 'Restaurant / Food'},
    {'id': 'health', 'emoji': '🩺', 'label': 'Santé / Bien-être'},
    {'id': 'services', 'emoji': '💼', 'label': 'Services / Freelance'},
    {'id': 'education', 'emoji': '🎓', 'label': 'Éducation / Formation'},
    {'id': 'other', 'emoji': '✨', 'label': 'Autre secteur'},
  ];

  @override
  void initState() {
    super.initState();
    _draft = LiveAgentDraft(
      name: '',
      agentType: 'commerce',
      sector: 'commerce',
      personaName: _persona.text,
      tone: _tone.text,
    );
    _selectedSession = widget.initialSessionName;
    _loadPartnerProducts();
  }

  @override
  void dispose() {
    _name.dispose();
    _persona.dispose();
    _tone.dispose();
    _knowledge.dispose();
    _knowledgeUrl.dispose();
    _websiteUrl.dispose();
    _documentUrl.dispose();
    _preview.dispose();
    super.dispose();
  }

  Future<void> _loadPartnerProducts() async {
    try {
      final products = await widget.repository.listPartnerProducts();
      if (mounted) setState(() => _partnerProducts = products);
    } catch (_) {
      // A merchant without Partner catalogues can still create a manual catalogue.
    }
  }

  bool get _canContinueBase =>
      _name.text.trim().isNotEmpty && _persona.text.trim().isNotEmpty;

  void _syncDraft() {
    _draft
      ..name = _name.text
      ..personaName = _persona.text
      ..tone = _tone.text
      ..knowledge = _knowledge.text
      ..knowledgeUrl = _knowledgeUrl.text
      ..websiteUrl = _websiteUrl.text
      ..documentUrl = _documentUrl.text;
  }

  Future<void> _next() async {
    if (_page == 0) {
      if (!_canContinueBase) {
        _notice('Indiquez le nom de l’activité et le prénom de l’assistant.');
        return;
      }
      setState(() => _page = 1);
      return;
    }
    if (_page == 1) {
      _syncDraft();
      setState(() => _busy = true);
      try {
        _created = await widget.repository.createTestingDraft(_draft);
        if (mounted) setState(() => _page = 2);
      } catch (error) {
        _notice('$error');
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    }
  }

  Future<void> _parseImage() async {
    final image =
        await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (image == null) return;
    setState(() => _busy = true);
    try {
      final parsed = await widget.repository.parseProductImage(image);
      if (!mounted) return;
      setState(() => _draft.manualProducts.addAll(parsed));
      _notice('${parsed.length} produit(s) ajouté(s) depuis la photo.',
          success: true);
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendSandbox() async {
    final text = _preview.text.trim();
    if (text.isEmpty || _created == null) return;
    setState(() {
      _messages.add(LiveAgentMessage(role: 'user', content: text));
      _preview.clear();
      _busy = true;
    });
    try {
      final reply = await widget.repository
          .sandbox(agent: _created!, message: text, history: _messages);
      if (mounted) {
        setState(() {
          _messages.add(LiveAgentMessage(role: 'assistant', content: reply));
          _tested = true;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() => _messages.add(LiveAgentMessage(
            role: 'assistant', content: _sandboxDiagnostic('$error'))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save({required bool activate}) async {
    final agent = _created;
    if (agent == null) return;
    if (activate && !_tested) {
      _notice(
          'Testez au moins une fois l’agent avant de l’activer sur WhatsApp.');
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.repository.deploy(
          agent: agent, sessionName: activate ? _selectedSession : null);
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: const Color(0xFF159B65),
        content: Text(activate
            ? 'Agent IA activé sur WhatsApp.'
            : 'Agent conservé comme brouillon.'),
      ));
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notice(String text, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      behavior: SnackBarBehavior.floating,
      backgroundColor: success ? const Color(0xFF159B65) : _agentInk,
      content: Text(text.replaceFirst('LiveWhatsAppIaException: ', '')),
    ));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF6F9F7),
        appBar: AppBar(
          surfaceTintColor: Colors.white,
          backgroundColor: Colors.white,
          foregroundColor: _agentInk,
          elevation: 0,
          titleSpacing: 12,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Nouvel Agent IA · ${_page + 1}/3',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w900)),
              const SizedBox(height: 2),
              Text(
                  _page == 0
                      ? 'Identité & comportement'
                      : _page == 1
                          ? 'Sources & connaissances'
                          : 'Tester & activer',
                  style: const TextStyle(
                      color: Color(0xFF62756D),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600)),
            ],
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(7),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: Row(
                children: List.generate(
                    3,
                    (index) => Expanded(
                        child: Container(
                            height: 5,
                            margin: EdgeInsets.only(right: index == 2 ? 0 : 6),
                            decoration: BoxDecoration(
                                color: index <= _page
                                    ? const Color(0xFF25D366)
                                    : const Color(0xFFE5ECE8),
                                borderRadius: BorderRadius.circular(9))))),
              ),
            ),
          ),
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 14),
                  child: _page == 0
                      ? _basePage()
                      : _page == 1
                          ? _sourcePage()
                          : _testPage(),
                ),
              ),
              _footer(),
            ],
          ),
        ),
      );

  Widget _basePage() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(
              title: 'Votre activité',
              subtitle: 'Définissez ce que l’Agent IA doit représenter.'),
          const SizedBox(height: 14),
          _field(
              controller: _name,
              label: 'Nom de l’activité ou de l’agent',
              hint: 'Ex. Boutique Chic Cotonou'),
          const SizedBox(height: 18),
          const Text('Type d’Agent IA',
              style: TextStyle(
                  color: _agentInk, fontWeight: FontWeight.w900, fontSize: 16)),
          const SizedBox(height: 9),
          Row(
              children: _types.map((type) {
            final selected = _draft.agentType == type['id'];
            return Expanded(
                child: Padding(
                    padding:
                        EdgeInsets.only(right: type['id'] == 'website' ? 0 : 8),
                    child: _ChoiceCard(
                      compact: true,
                      selected: selected,
                      icon: type['icon'] as IconData,
                      title: type['label'] as String,
                      subtitle: type['description'] as String,
                      onTap: () => setState(
                          () => _draft.agentType = type['id'] as String),
                    )));
          }).toList()),
          const SizedBox(height: 18),
          const Text('Secteur d’activité',
              style: TextStyle(
                  color: _agentInk, fontWeight: FontWeight.w900, fontSize: 16)),
          const SizedBox(height: 9),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.72,
                mainAxisSpacing: 9,
                crossAxisSpacing: 9),
            itemCount: _sectors.length,
            itemBuilder: (_, index) {
              final sector = _sectors[index];
              return _ChoiceCard(
                selected: _draft.sector == sector['id'],
                emoji: sector['emoji'],
                title: sector['label']!,
                onTap: () => setState(() => _draft.sector = sector['id']!),
              );
            },
          ),
          const SizedBox(height: 22),
          const _SectionTitle(
              title: 'Personnalité',
              subtitle:
                  'La manière dont votre assistant accueille et accompagne vos clients.'),
          const SizedBox(height: 14),
          _field(
              controller: _persona,
              label: 'Prénom de votre assistant IA',
              hint: 'Ex. Aïcha'),
          const SizedBox(height: 12),
          _field(
              controller: _tone,
              label: 'Ton / personnalité',
              hint: 'Ex. Chaleureux, professionnel et vendeur'),
          const SizedBox(height: 8),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Utiliser des emojis',
                style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: const Text(
                'Des réponses plus expressives, adaptées à WhatsApp.',
                style: TextStyle(fontSize: 12, color: Color(0xFF62756D))),
            value: _draft.emojis,
            activeColor: const Color(0xFF25D366),
            onChanged: (value) => setState(() => _draft.emojis = value),
          ),
          const Divider(height: 22),
          const Text('Ce que l’agent peut faire',
              style: TextStyle(
                  color: _agentInk, fontWeight: FontWeight.w900, fontSize: 16)),
          const SizedBox(height: 5),
          ...const [
            (
              'qa',
              'Répondre aux questions',
              'Répond en s’appuyant sur vos sources.'
            ),
            (
              'sell',
              'Présenter et vendre',
              'Présente les produits ou services disponibles.'
            ),
            (
              'appointments',
              'Prendre des rendez-vous',
              'Collecte les demandes de rendez-vous.'
            ),
            (
              'qualify',
              'Qualifier les prospects',
              'Pose des questions utiles avant une vente.'
            ),
            (
              'handoff',
              'Passer la main à un humain',
              'Signale les demandes nécessitant votre intervention.'
            ),
          ].map((item) => SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: Text(item.$2,
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 14.5)),
                subtitle: Text(item.$3,
                    style: const TextStyle(
                        fontSize: 11.5, color: Color(0xFF62756D))),
                value: _draft.capabilities[item.$1] == true,
                activeColor: const Color(0xFF25D366),
                onChanged: (value) =>
                    setState(() => _draft.capabilities[item.$1] = value),
              )),
        ],
      );

  Widget _sourcePage() {
    final commerce = _draft.agentType == 'commerce';
    final docs = _draft.agentType == 'docs';
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _SectionTitle(
        title: commerce
            ? 'Catalogue & connaissances'
            : docs
                ? 'Documents & connaissances'
                : 'Site web & connaissances',
        subtitle: commerce
            ? 'Choisissez les produits que votre agent peut présenter à vos clients.'
            : docs
                ? 'Utilisez une URL de document accessible pour enrichir l’agent depuis mobile.'
                : 'Indiquez le site que l’agent doit analyser.',
      ),
      const SizedBox(height: 14),
      if (commerce) ..._commerceSources(),
      if (docs) ...[
        _field(
            controller: _documentUrl,
            label: 'URL du document',
            hint: 'https://.../catalogue.pdf',
            keyboardType: TextInputType.url),
        const SizedBox(height: 8),
        const _InlineHint(
            text:
                'Le lien doit être accessible publiquement. Les fichiers locaux restent gérés depuis la version Web tant qu’aucun importeur de documents natif n’est ajouté.'),
      ],
      if (_draft.agentType == 'website') ...[
        _field(
            controller: _websiteUrl,
            label: 'URL du site web',
            hint: 'https://mon-site.com',
            keyboardType: TextInputType.url),
        const SizedBox(height: 5),
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          title: const Text('Explorer plusieurs pages',
              style: TextStyle(fontWeight: FontWeight.w800)),
          subtitle: const Text(
              'Analyse jusqu’à 15 pages : plus complet, mais plus long.',
              style: TextStyle(fontSize: 12, color: Color(0xFF62756D))),
          value: _draft.crawlSite,
          activeColor: const Color(0xFF25D366),
          onChanged: (value) => setState(() => _draft.crawlSite = value),
        ),
      ],
      const SizedBox(height: 18),
      const Divider(height: 1),
      const SizedBox(height: 18),
      const Text('Informations pratiques',
          style: TextStyle(
              color: _agentInk, fontWeight: FontWeight.w900, fontSize: 16)),
      const SizedBox(height: 5),
      const Text(
          'Horaires, livraison, paiement, zone couverte et FAQ : l’Agent IA les utilisera pour répondre plus précisément.',
          style: TextStyle(
              color: Color(0xFF62756D), fontSize: 12.5, height: 1.32)),
      const SizedBox(height: 10),
      TextField(
        controller: _knowledge,
        minLines: 5,
        maxLines: 8,
        decoration: const InputDecoration(
            hintText:
                'Ex. Livraison Cotonou/Calavi. Paiement Mobile Money. Retours sous 48h.',
            alignLabelWithHint: true),
      ),
      const SizedBox(height: 12),
      _field(
          controller: _knowledgeUrl,
          label: 'Page complémentaire (optionnel)',
          hint: 'https://...',
          keyboardType: TextInputType.url),
    ]);
  }

  List<Widget> _commerceSources() {
    final selected = _draft.selectedPartnerProductIds;
    return [
      if (_partnerProducts.isEmpty)
        const _InlineHint(
            text:
                'Aucun produit Partenaire disponible. Vous pouvez ajouter un catalogue manuel ou analyser une photo.')
      else ...[
        const Text('Produits synchronisés',
            style: TextStyle(
                color: _agentInk, fontSize: 16, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFDCE8E2))),
          child: Column(
              children: _partnerProducts.take(30).map((product) {
            final isSelected = selected.contains(product.id);
            return CheckboxListTile(
              value: isSelected,
              controlAffinity: ListTileControlAffinity.leading,
              activeColor: const Color(0xFF159B65),
              title: Text(product.name,
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              subtitle: Text(
                  '${product.priceLabel}${product.description?.isNotEmpty == true ? ' · ${product.description}' : ''}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Color(0xFF62756D), fontSize: 11.5)),
              onChanged: (value) => setState(() => value == true
                  ? selected.add(product.id!)
                  : selected.remove(product.id)),
            );
          }).toList()),
        ),
        const SizedBox(height: 7),
        Text('${selected.length} produit(s) partenaire sélectionné(s)',
            style: const TextStyle(color: Color(0xFF62756D), fontSize: 12)),
      ],
      const SizedBox(height: 18),
      const Text('Ajouter un article',
          style: TextStyle(
              color: _agentInk, fontSize: 16, fontWeight: FontWeight.w900)),
      const SizedBox(height: 9),
      Wrap(spacing: 8, runSpacing: 8, children: [
        OutlinedButton.icon(
            onPressed: _busy ? null : _parseImage,
            icon: const Icon(Icons.photo_camera_back_outlined),
            label: const Text('Photo')),
        OutlinedButton.icon(
            onPressed: () => setState(() =>
                _draft.manualProducts.add(const LiveAgentProduct(name: ''))),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Manuel')),
      ]),
      if (_draft.manualProducts.isNotEmpty) ...[
        const SizedBox(height: 10),
        ..._draft.manualProducts.asMap().entries.map((entry) =>
            _ManualProductEditor(
              product: entry.value,
              onChanged: (updated) =>
                  setState(() => _draft.manualProducts[entry.key] = updated),
              onDelete: () =>
                  setState(() => _draft.manualProducts.removeAt(entry.key)),
            )),
      ],
    ];
  }

  Widget _testPage() {
    final connected = widget.sessions.where((item) => item.isWorking).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: const Color(0xFFEAF9F2),
            borderRadius: BorderRadius.circular(17),
            border: Border.all(color: const Color(0xFFC5EBD9))),
        child:
            const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.shield_outlined, color: _agentGreen),
          SizedBox(width: 9),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('Test sécurisé',
                    style: TextStyle(
                        color: _agentGreen, fontWeight: FontWeight.w900)),
                SizedBox(height: 3),
                Text('Aucun message n’est envoyé sur WhatsApp à cette étape.',
                    style: TextStyle(
                        color: Color(0xFF476C61), fontSize: 12.5, height: 1.3)),
              ])),
        ]),
      ),
      const SizedBox(height: 14),
      Container(
        height: 330,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: const Color(0xFFF7FAF8),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFDDEBE4))),
        child: _messages.isEmpty
            ? const Center(
                child: Text(
                    'Essayez : « Bonjour, que vendez-vous ? »\n« Quel est le prix ? »\n« Je veux parler à une personne. »',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF6B8279), height: 1.5)))
            : ListView.builder(
                itemCount: _messages.length + (_busy ? 1 : 0),
                itemBuilder: (_, index) {
                  if (index == _messages.length)
                    return const Padding(
                        padding: EdgeInsets.all(8),
                        child: Text('L’agent réfléchit…',
                            style: TextStyle(
                                color: Color(0xFF6B8279), fontSize: 12)));
                  final message = _messages[index];
                  final user = message.role == 'user';
                  return Align(
                    alignment:
                        user ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 320),
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                          color: user ? const Color(0xFF159B65) : Colors.white,
                          borderRadius: BorderRadius.circular(15),
                          border: user
                              ? null
                              : Border.all(color: const Color(0xFFDDEBE4))),
                      child: Text(message.content,
                          style: TextStyle(
                              color: user ? Colors.white : _agentInk,
                              fontSize: 13,
                              height: 1.3)),
                    ),
                  );
                },
              ),
      ),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(
            child: TextField(
                controller: _preview,
                enabled: !_busy,
                onSubmitted: (_) => _sendSandbox(),
                decoration: const InputDecoration(
                    hintText: 'Écrivez comme un client WhatsApp…'))),
        const SizedBox(width: 8),
        IconButton.filled(
            onPressed: _busy ? null : _sendSandbox,
            style: IconButton.styleFrom(backgroundColor: _agentGreen),
            icon: const Icon(Icons.send_rounded)),
      ]),
      const SizedBox(height: 24),
      const Text('Déployer sur WhatsApp',
          style: TextStyle(
              color: _agentInk, fontSize: 17, fontWeight: FontWeight.w900)),
      const SizedBox(height: 5),
      const Text(
          'Choisissez une ligne connectée. Une seule IA active est autorisée par ligne.',
          style: TextStyle(color: Color(0xFF62756D), fontSize: 12.5)),
      const SizedBox(height: 10),
      DropdownButtonFormField<String>(
        value: _selectedSession,
        decoration:
            const InputDecoration(prefixIcon: Icon(Icons.forum_outlined)),
        hint: const Text('Choisir une session connectée'),
        items: connected
            .map((session) => DropdownMenuItem(
                value: session.name,
                child: Text(
                    '${session.name}${session.phone == null ? '' : ' · ${session.displayPhone}'}')))
            .toList(),
        onChanged:
            _busy ? null : (value) => setState(() => _selectedSession = value),
      ),
      if (connected.isEmpty)
        const Padding(
            padding: EdgeInsets.only(top: 8),
            child: _InlineHint(
                text:
                    'Aucune ligne connectée. Vous pouvez enregistrer cet agent comme brouillon puis le déployer plus tard.')),
      const SizedBox(height: 14),
      _SummaryCard(
          draft: _draft, tested: _tested, linkedSession: _selectedSession),
    ]);
  }

  Widget _footer() => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFE2EBE6)))),
          child: Row(children: [
            if (_page > 0)
              TextButton.icon(
                  onPressed: _busy ? null : () => setState(() => _page--),
                  icon: const Icon(Icons.chevron_left_rounded),
                  label: const Text('Précédent'))
            else
              const SizedBox(width: 8),
            const Spacer(),
            if (_page < 2)
              FilledButton.icon(
                onPressed: _busy ? null : _next,
                style: FilledButton.styleFrom(
                    backgroundColor: _agentGreen,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(132, 48)),
                icon: _busy
                    ? const _TinyLoader()
                    : const Icon(Icons.chevron_right_rounded),
                label: Text(_page == 1 ? 'Créer et tester' : 'Suivant'),
              )
            else ...[
              OutlinedButton(
                  onPressed: _busy ? null : () => _save(activate: false),
                  child: const Text('Brouillon')),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: _busy || _selectedSession == null
                    ? null
                    : () => _save(activate: true),
                style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(0, 48)),
                icon: _busy
                    ? const _TinyLoader()
                    : const Icon(Icons.rocket_launch_rounded, size: 18),
                label: const Text('Activer'),
              ),
            ],
          ]),
        ),
      );

  Widget _field(
          {required TextEditingController controller,
          required String label,
          required String hint,
          TextInputType? keyboardType}) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(
                color: _agentInk, fontWeight: FontWeight.w900, fontSize: 14.5)),
        const SizedBox(height: 7),
        TextField(
            controller: controller,
            keyboardType: keyboardType,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(hintText: hint)),
      ]);
}

class LiveWhatsAppIaAgentDetailScreen extends StatefulWidget {
  const LiveWhatsAppIaAgentDetailScreen({
    super.key,
    required this.repository,
    required this.agent,
    required this.sessions,
  });

  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  final List<LiveWhatsAppSession> sessions;

  @override
  State<LiveWhatsAppIaAgentDetailScreen> createState() =>
      _LiveWhatsAppIaAgentDetailScreenState();
}

class _LiveWhatsAppIaAgentDetailScreenState
    extends State<LiveWhatsAppIaAgentDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 4, vsync: this);
  late LiveWhatsAppAiAgent _agent = widget.agent;
  bool _busy = false;

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    setState(() => _busy = true);
    try {
      await widget.repository.setPaused(_agent, _agent.isActive);
      if (!mounted) return;
      setState(() => _agent = LiveWhatsAppAiAgent(
            id: _agent.id,
            name: _agent.name,
            sector: _agent.sector,
            agentType: _agent.agentType,
            status: _agent.isActive ? 'paused' : 'active',
            personaName: _agent.personaName,
            tone: _agent.tone,
            emojis: _agent.emojis,
            capabilities: _agent.capabilities,
            stats: _agent.stats,
            wahaSessionName: _agent.wahaSessionName,
            websiteUrl: _agent.websiteUrl,
            pausedContacts: _agent.pausedContacts,
          ));
      Navigator.pop(context, true);
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notice(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(text.replaceFirst('LiveWhatsAppIaException: ', ''))));

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF6F9F7),
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          foregroundColor: _agentInk,
          title:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_agent.name,
                style:
                    const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
            Text(
                '${_agent.personaName} · ${_agent.isActive ? 'Actif' : _agent.status}',
                style:
                    const TextStyle(color: Color(0xFF62756D), fontSize: 11.5)),
          ]),
          actions: [
            IconButton(
                onPressed: _busy ? null : _toggle,
                tooltip: _agent.isActive ? 'Mettre en pause' : 'Activer',
                icon: Icon(_agent.isActive
                    ? Icons.pause_circle_outline_rounded
                    : Icons.play_circle_outline_rounded)),
          ],
          bottom: TabBar(
            controller: _tabs,
            isScrollable: true,
            labelColor: _agentGreen,
            indicatorColor: _agentGreen,
            tabs: const [
              Tab(text: 'Résumé'),
              Tab(text: 'Test'),
              Tab(text: 'Direct'),
              Tab(text: 'Stats')
            ],
          ),
        ),
        body: TabBarView(controller: _tabs, children: [
          _AgentSummary(agent: _agent),
          _AgentSandboxTab(repository: widget.repository, agent: _agent),
          _AgentDirectTab(repository: widget.repository, agent: _agent),
          _AgentStatsTab(repository: widget.repository, agent: _agent),
        ]),
      );
}

class _AgentSummary extends StatelessWidget {
  const _AgentSummary({required this.agent});
  final LiveWhatsAppAiAgent agent;

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(16), children: [
        _AgentHero(agent: agent),
        const SizedBox(height: 12),
        _InfoPanel(
            title: 'Canal WhatsApp',
            icon: Icons.forum_outlined,
            child: Text(
                agent.wahaSessionName == null
                    ? 'Brouillon — aucune ligne WhatsApp associée.'
                    : 'Actif sur « ${agent.wahaSessionName} ».',
                style: const TextStyle(height: 1.35))),
        const SizedBox(height: 12),
        _InfoPanel(
            title: 'Personnalité',
            icon: Icons.person_outline_rounded,
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(agent.personaName,
                  style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              Text(agent.tone, style: const TextStyle(color: Color(0xFF62756D)))
            ])),
        const SizedBox(height: 12),
        _InfoPanel(
            title: 'Capacités',
            icon: Icons.auto_awesome_rounded,
            child: Wrap(
                spacing: 7,
                runSpacing: 7,
                children: agent.capabilities.entries
                    .where((item) => item.value)
                    .map((item) => _TinyPill(
                        label: _capabilityLabel(item.key), color: _agentGreen))
                    .toList())),
      ]);
}

class _AgentSandboxTab extends StatefulWidget {
  const _AgentSandboxTab({required this.repository, required this.agent});
  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  @override
  State<_AgentSandboxTab> createState() => _AgentSandboxTabState();
}

class _AgentSandboxTabState extends State<_AgentSandboxTab> {
  final _input = TextEditingController();
  final List<LiveAgentMessage> _messages = [];
  bool _busy = false;
  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _togglePause() async {
    final selected = _selected;
    if (selected == null) return;
    final willPause = !_paused.contains(selected.phone);
    try {
      await widget.repository.manual(
        agent: widget.agent,
        phone: selected.phone,
        mode: willPause ? 'pause' : 'resume',
      );
      if (!mounted) return;
      setState(() {
        if (willPause) {
          _paused.add(selected.phone);
        } else {
          _paused.remove(selected.phone);
        }
      });
    } catch (error) {
      _notice('$error');
    }
  }

  Future<void> _send() async {
    final message = _input.text.trim();
    if (message.isEmpty) return;
    setState(() {
      _messages.add(LiveAgentMessage(role: 'user', content: message));
      _input.clear();
      _busy = true;
    });
    try {
      final reply = await widget.repository
          .sandbox(agent: widget.agent, message: message, history: _messages);
      if (mounted)
        setState(() =>
            _messages.add(LiveAgentMessage(role: 'assistant', content: reply)));
    } catch (error) {
      if (mounted)
        setState(() => _messages.add(LiveAgentMessage(
            role: 'assistant', content: _sandboxDiagnostic('$error'))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          const _InlineHint(
              text:
                  'Test interne : aucun message n’est transmis à vos clients WhatsApp.'),
          const SizedBox(height: 12),
          Expanded(child: _ChatPanel(messages: _messages, busy: _busy)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
                child: TextField(
                    controller: _input,
                    onSubmitted: (_) => _send(),
                    decoration: const InputDecoration(
                        hintText: 'Écrivez comme un client…'))),
            const SizedBox(width: 8),
            IconButton.filled(
                onPressed: _busy ? null : _send,
                style: IconButton.styleFrom(backgroundColor: _agentGreen),
                icon: const Icon(Icons.send_rounded))
          ]),
        ]),
      );
}

class _AgentDirectTab extends StatefulWidget {
  const _AgentDirectTab({required this.repository, required this.agent});
  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  @override
  State<_AgentDirectTab> createState() => _AgentDirectTabState();
}

class _AgentDirectTabState extends State<_AgentDirectTab> {
  Timer? _poll;
  List<LiveAgentConversation> _conversations = const [];
  LiveAgentConversation? _selected;
  final _reply = TextEditingController();
  bool _loading = true;
  bool _sending = false;
  late final Set<String> _paused = {...widget.agent.pausedContacts};
  @override
  void initState() {
    super.initState();
    _load();
    _poll =
        Timer.periodic(const Duration(seconds: 12), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _reply.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent && mounted) setState(() => _loading = true);
    try {
      final values = await widget.repository.conversations(widget.agent.id);
      if (!mounted) return;
      LiveAgentConversation? retained;
      for (final item in values) {
        if (item.id == _selected?.id) {
          retained = item;
          break;
        }
      }
      setState(() {
        _conversations = values;
        _selected =
            retained ?? _selected ?? (values.isEmpty ? null : values.first);
      });
    } catch (_) {
    } finally {
      if (!silent && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _control(String mode) async {
    final selected = _selected;
    if (selected == null) return;
    try {
      await widget.repository
          .manual(agent: widget.agent, phone: selected.phone, mode: mode);
      await _load(silent: true);
    } catch (error) {
      _notice('$error');
    }
  }

  Future<void> _send() async {
    final selected = _selected;
    final text = _reply.text.trim();
    if (selected == null || text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await widget.repository.manual(
          agent: widget.agent,
          phone: selected.phone,
          message: text,
          mode: selected.humanTakeover ? null : 'takeover');
      _reply.clear();
      await _load(silent: true);
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _notice(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(text.replaceFirst('LiveWhatsAppIaException: ', ''))));
  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_conversations.isEmpty)
      return const Center(
          child: Padding(
              padding: EdgeInsets.all(28),
              child: Text(
                  'Aucune conversation. L’Agent IA doit être actif sur une session WhatsApp et recevoir un message client.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF62756D), height: 1.35))));
    final selected = _selected!;
    return Column(children: [
      SizedBox(
          height: 106,
          child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
              itemCount: _conversations.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, index) {
                final item = _conversations[index];
                final active = item.id == selected.id;
                return InkWell(
                    onTap: () => setState(() => _selected = item),
                    borderRadius: BorderRadius.circular(15),
                    child: Container(
                        width: 155,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                            color:
                                active ? const Color(0xFFE8F8F1) : Colors.white,
                            borderRadius: BorderRadius.circular(15),
                            border: Border.all(
                                color: active
                                    ? const Color(0xFF9BDAC0)
                                    : const Color(0xFFDDEBE4))),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  item.name?.isNotEmpty == true
                                      ? item.name!
                                      : item.phone,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w900)),
                              const SizedBox(height: 3),
                              Text(
                                  item.needsHandoff
                                      ? 'Humain demandé'
                                      : item.humanTakeover
                                          ? 'Mode manuel'
                                          : 'Agent actif',
                                  style: TextStyle(
                                      color: item.needsHandoff
                                          ? const Color(0xFFD94747)
                                          : _agentGreen,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700))
                            ])));
              })),
      Container(
          padding: const EdgeInsets.all(12),
          decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                  top: BorderSide(color: Color(0xFFE2EBE6)),
                  bottom: BorderSide(color: Color(0xFFE2EBE6)))),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(
                        selected.name?.isNotEmpty == true
                            ? selected.name!
                            : selected.phone,
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    Text(selected.phone,
                        style: const TextStyle(
                            color: Color(0xFF62756D), fontSize: 12))
                  ])),
              TextButton.icon(
                  onPressed: () =>
                      _control(selected.humanTakeover ? 'release' : 'takeover'),
                  icon: Icon(selected.humanTakeover
                      ? Icons.smart_toy_outlined
                      : Icons.person_outline_rounded),
                  label: Text(selected.humanTakeover
                      ? 'Rendre au bot'
                      : 'Prendre la main'))
            ]),
            Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                    onPressed: _togglePause,
                    icon: Icon(_paused.contains(selected.phone)
                        ? Icons.play_circle_outline_rounded
                        : Icons.pause_circle_outline_rounded),
                    label: Text(_paused.contains(selected.phone)
                        ? 'Reprendre le bot'
                        : 'Mettre le bot en pause')))
          ])),
      Expanded(child: _ChatPanel(messages: selected.messages, busy: false)),
      Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Expanded(
                child: TextField(
                    controller: _reply,
                    onSubmitted: (_) => _send(),
                    decoration: InputDecoration(
                        hintText: selected.humanTakeover
                            ? 'Répondre manuellement…'
                            : 'Répondre et prendre la main…'))),
            const SizedBox(width: 8),
            IconButton.filled(
                onPressed: _sending ? null : _send,
                style: IconButton.styleFrom(backgroundColor: _agentGreen),
                icon: _sending
                    ? const _TinyLoader()
                    : const Icon(Icons.send_rounded))
          ])),
    ]);
  }
}

class _AgentStatsTab extends StatefulWidget {
  const _AgentStatsTab({required this.repository, required this.agent});
  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  @override
  State<_AgentStatsTab> createState() => _AgentStatsTabState();
}

class _AgentStatsTabState extends State<_AgentStatsTab> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await widget.repository.insights(widget.agent.id);
      if (mounted) setState(() => _data = data);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final data = _data ?? const <String, dynamic>{};
    final keywords =
        data['top_keywords'] is List ? data['top_keywords'] as List : const [];
    final products =
        data['top_products'] is List ? data['top_products'] as List : const [];
    return RefreshIndicator(
        onRefresh: _load,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              childAspectRatio: 1.55,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              children: [
                _Kpi(
                    value: '${data['total_conversations'] ?? 0}',
                    label: 'Conversations'),
                _Kpi(
                    value: '${data['total_messages'] ?? 0}',
                    label: 'Messages traités'),
                _Kpi(
                    value: '${data['unique_contacts'] ?? 0}',
                    label: 'Contacts uniques'),
                _Kpi(
                    value: '${data['total_handoffs'] ?? 0}',
                    label: 'Transferts humains'),
              ]),
          const SizedBox(height: 16),
          _InfoPanel(
              title: 'Mots-clés fréquents',
              icon: Icons.key_rounded,
              child: keywords.isEmpty
                  ? const Text('Pas encore de données.',
                      style: TextStyle(color: Color(0xFF62756D)))
                  : Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: keywords
                          .whereType<Map>()
                          .map((item) => _TinyPill(
                              label:
                                  '${item['word'] ?? item['name'] ?? ''} · ${item['count'] ?? 0}',
                              color: _agentGreen))
                          .toList())),
          const SizedBox(height: 12),
          _InfoPanel(
              title: 'Produits les plus demandés',
              icon: Icons.shopping_bag_outlined,
              child: products.isEmpty
                  ? const Text('Pas encore de demandes analysées.',
                      style: TextStyle(color: Color(0xFF62756D)))
                  : Column(
                      children: products.whereType<Map>().take(8).map((item) =>
                          ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  leading: const Icon(Icons.trending_up_rounded,
                                      color: _agentGreen),
                                  title: Text('${item['name'] ?? 'Produit'}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w800)),
                                  trailing: Text('${item['count'] ?? 0}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w900)))
                              .toList()))),
        ]));
  }
}

class _ChoiceCard extends StatelessWidget {
  const _ChoiceCard(
      {required this.selected,
      required this.title,
      this.subtitle,
      this.icon,
      this.emoji,
      required this.onTap,
      this.compact = false});
  final bool selected;
  final String title;
  final String? subtitle;
  final IconData? icon;
  final String? emoji;
  final VoidCallback onTap;
  final bool compact;
  @override
  Widget build(BuildContext context) => InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
          padding: EdgeInsets.all(compact ? 10 : 12),
          decoration: BoxDecoration(
              color: selected ? const Color(0xFFEAF9F2) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: selected
                      ? const Color(0xFF25D366)
                      : const Color(0xFFE0EAE5),
                  width: selected ? 2 : 1)),
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(children: [
                  if (emoji != null)
                    Text(emoji!, style: const TextStyle(fontSize: 21))
                  else if (icon != null)
                    Icon(icon,
                        color: selected ? _agentGreen : const Color(0xFF6B8279),
                        size: 21),
                  const Spacer(),
                  if (selected)
                    const Icon(Icons.check_circle_rounded,
                        size: 17, color: Color(0xFF159B65))
                ]),
                const SizedBox(height: 7),
                Text(title,
                    maxLines: compact ? 1 : 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: _agentInk,
                        fontSize: compact ? 13 : 14.5,
                        fontWeight: FontWeight.w900)),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: Color(0xFF62756D),
                          fontSize: 10.5,
                          height: 1.2))
                ]
              ])));
}

class _ManualProductEditor extends StatefulWidget {
  const _ManualProductEditor(
      {required this.product, required this.onChanged, required this.onDelete});
  final LiveAgentProduct product;
  final ValueChanged<LiveAgentProduct> onChanged;
  final VoidCallback onDelete;
  @override
  State<_ManualProductEditor> createState() => _ManualProductEditorState();
}

class _ManualProductEditorState extends State<_ManualProductEditor> {
  late final TextEditingController _name =
      TextEditingController(text: widget.product.name);
  late final TextEditingController _price =
      TextEditingController(text: widget.product.price?.toString() ?? '');
  late final TextEditingController _desc =
      TextEditingController(text: widget.product.description ?? '');
  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _desc.dispose();
    super.dispose();
  }

  void _emit() => widget.onChanged(LiveAgentProduct(
      name: _name.text,
      price: int.tryParse(_price.text),
      description: _desc.text));
  @override
  Widget build(BuildContext context) => Container(
      margin: const EdgeInsets.only(top: 9),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: const Color(0xFFDDEBE4))),
      child: Column(children: [
        Row(children: [
          Expanded(
              child: TextField(
                  controller: _name,
                  onChanged: (_) => _emit(),
                  decoration: const InputDecoration(
                      isDense: true, hintText: 'Nom du produit'))),
          IconButton(
              onPressed: widget.onDelete,
              color: const Color(0xFFD94747),
              icon: const Icon(Icons.delete_outline_rounded))
        ]),
        const SizedBox(height: 7),
        Row(children: [
          SizedBox(
              width: 120,
              child: TextField(
                  controller: _price,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => _emit(),
                  decoration: const InputDecoration(
                      isDense: true, hintText: 'Prix FCFA'))),
          const SizedBox(width: 8),
          Expanded(
              child: TextField(
                  controller: _desc,
                  onChanged: (_) => _emit(),
                  decoration: const InputDecoration(
                      isDense: true, hintText: 'Description')))
        ])
      ]));
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(
                color: _agentInk, fontSize: 21, fontWeight: FontWeight.w900)),
        const SizedBox(height: 4),
        Text(subtitle,
            style: const TextStyle(
                color: Color(0xFF62756D),
                fontSize: 12.5,
                height: 1.32,
                fontWeight: FontWeight.w600))
      ]);
}

class _InlineHint extends StatelessWidget {
  const _InlineHint({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
          color: const Color(0xFFF7FAF8),
          borderRadius: BorderRadius.circular(13)),
      child: Text(text,
          style: const TextStyle(
              color: Color(0xFF62756D), fontSize: 12, height: 1.3)));
}

class _TinyPill extends StatelessWidget {
  const _TinyPill({required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
          color: color.withOpacity(.12),
          borderRadius: BorderRadius.circular(99)),
      child: Text(label,
          style: TextStyle(
              color: color, fontSize: 10.5, fontWeight: FontWeight.w900)));
}

class _TinyLoader extends StatelessWidget {
  const _TinyLoader();
  @override
  Widget build(BuildContext context) => const SizedBox(
      width: 17,
      height: 17,
      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2));
}

class _AgentEmpty extends StatelessWidget {
  const _AgentEmpty({required this.onCreate});
  final VoidCallback onCreate;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(21),
          border: Border.all(color: const Color(0xFFDDEBE4))),
      child: Column(children: [
        Container(
            width: 54,
            height: 54,
            decoration: const BoxDecoration(
                color: Color(0xFFE4FAF0), shape: BoxShape.circle),
            child: const Icon(Icons.smart_toy_rounded,
                color: _agentGreen, size: 27)),
        const SizedBox(height: 12),
        const Text('Votre premier Agent IA',
            style: TextStyle(
                color: _agentInk, fontSize: 17, fontWeight: FontWeight.w900)),
        const SizedBox(height: 5),
        const Text(
            'Créez-le, testez ses réponses puis activez-le sur une ligne connectée.',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: Color(0xFF62756D), fontSize: 12.5, height: 1.32)),
        const SizedBox(height: 14),
        FilledButton.icon(
            onPressed: onCreate,
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF25D366),
                foregroundColor: Colors.white),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Nouvel agent'))
      ]));
}

class _AgentCard extends StatelessWidget {
  const _AgentCard({required this.agent, required this.onTap, this.onDeploy});
  final LiveWhatsAppAiAgent agent;
  final VoidCallback onTap;
  final VoidCallback? onDeploy;
  @override
  Widget build(BuildContext context) {
    final color = agent.isActive
        ? const Color(0xFF159B65)
        : agent.status == 'paused'
            ? const Color(0xFFE99B14)
            : const Color(0xFF62756D);
    return Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(20),
            child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: agent.isActive
                            ? const Color(0xFFC6ECD9)
                            : const Color(0xFFDDEBE4))),
                child: Column(children: [
                  Row(children: [
                    Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                            color: color.withOpacity(.12),
                            borderRadius: BorderRadius.circular(14)),
                        child: Icon(_agentTypeIcon(agent.agentType),
                            color: color)),
                    const SizedBox(width: 10),
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text(agent.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  color: _agentInk,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 16)),
                          const SizedBox(height: 2),
                          Text(
                              '${agent.personaName} · ${_agentTypeLabel(agent.agentType)}',
                              style: const TextStyle(
                                  color: Color(0xFF62756D), fontSize: 12))
                        ])),
                    _TinyPill(
                        label: _agentStatusLabel(agent.status), color: color)
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                        child: Text(
                            agent.wahaSessionName == null
                                ? 'Brouillon — aucune ligne associée'
                                : 'Actif sur ${agent.wahaSessionName}',
                            style: const TextStyle(
                                color: Color(0xFF536A60),
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700))),
                    if (onDeploy != null)
                      TextButton(
                          onPressed: onDeploy, child: const Text('Déployer'))
                  ]),
                  const SizedBox(height: 8),
                  Row(children: [
                    _MetricMini(
                        icon: Icons.chat_bubble_outline_rounded,
                        value: '${agent.messagesHandled}',
                        label: 'messages'),
                    const SizedBox(width: 16),
                    _MetricMini(
                        icon: Icons.person_outline_rounded,
                        value: '${agent.handoffs}',
                        label: 'handoffs'),
                    const Spacer(),
                    const Icon(Icons.chevron_right_rounded,
                        color: Color(0xFF6B8279))
                  ])
                ]))));
  }
}

class _MetricMini extends StatelessWidget {
  const _MetricMini(
      {required this.icon, required this.value, required this.label});
  final IconData icon;
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Row(children: [
        Icon(icon, color: _agentGreen, size: 15),
        const SizedBox(width: 4),
        Text('$value $label',
            style: const TextStyle(
                color: Color(0xFF62756D),
                fontSize: 11.5,
                fontWeight: FontWeight.w700))
      ]);
}

class _AgentHero extends StatelessWidget {
  const _AgentHero({required this.agent});
  final LiveWhatsAppAiAgent agent;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [Color(0xFF063F38), Color(0xFF0C6D5E)]),
          borderRadius: BorderRadius.circular(22)),
      child: Row(children: [
        Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
                color: Colors.white.withOpacity(.14),
                borderRadius: BorderRadius.circular(17)),
            child: const Icon(Icons.smart_toy_rounded,
                color: Color(0xFFB8FFE3), size: 30)),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(agent.personaName,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 3),
          Text(agent.tone,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: Color(0xFFD5F8EA), fontSize: 12.5, height: 1.25)),
          const SizedBox(height: 8),
          _TinyPill(
              label: _agentStatusLabel(agent.status),
              color: const Color(0xFFB8FFE3))
        ]))
      ]));
}

class _InfoPanel extends StatelessWidget {
  const _InfoPanel(
      {required this.title, required this.icon, required this.child});
  final String title;
  final IconData icon;
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFDDEBE4))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: _agentGreen, size: 19),
          const SizedBox(width: 8),
          Text(title,
              style: const TextStyle(
                  color: _agentInk,
                  fontWeight: FontWeight.w900,
                  fontSize: 15.5))
        ]),
        const SizedBox(height: 10),
        child
      ]));
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(17),
          border: Border.all(color: const Color(0xFFDDEBE4))),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(value,
            style: const TextStyle(
                color: _agentGreen, fontSize: 23, fontWeight: FontWeight.w900)),
        const SizedBox(height: 2),
        Text(label,
            textAlign: TextAlign.center,
            style: const TextStyle(
                color: Color(0xFF62756D),
                fontSize: 11.5,
                fontWeight: FontWeight.w700))
      ]));
}

class _ChatPanel extends StatelessWidget {
  const _ChatPanel({required this.messages, required this.busy});
  final List<LiveAgentMessage> messages;
  final bool busy;
  @override
  Widget build(BuildContext context) => Container(
      decoration: BoxDecoration(
          color: const Color(0xFFF7FAF8),
          borderRadius: BorderRadius.circular(19),
          border: Border.all(color: const Color(0xFFDDEBE4))),
      child: messages.isEmpty
          ? const Center(
              child: Text('Commencez une conversation de test.',
                  style: TextStyle(color: Color(0xFF6B8279))))
          : ListView.builder(
              padding: const EdgeInsets.all(11),
              itemCount: messages.length + (busy ? 1 : 0),
              itemBuilder: (_, index) {
                if (index == messages.length)
                  return const Padding(
                      padding: EdgeInsets.all(8),
                      child: Text('L’agent réfléchit…',
                          style: TextStyle(
                              color: Color(0xFF6B8279), fontSize: 12)));
                final item = messages[index];
                final fromUser = item.role == 'user';
                final operator = item.role == 'operator';
                return Align(
                    alignment:
                        fromUser ? Alignment.centerLeft : Alignment.centerRight,
                    child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 9),
                        constraints: const BoxConstraints(maxWidth: 320),
                        decoration: BoxDecoration(
                            color: fromUser
                                ? Colors.white
                                : operator
                                    ? const Color(0xFFFFF0E0)
                                    : const Color(0xFF159B65),
                            borderRadius: BorderRadius.circular(15),
                            border: fromUser
                                ? Border.all(color: const Color(0xFFDDEBE4))
                                : null),
                        child: Text(item.content,
                            style: TextStyle(
                                color: fromUser || operator
                                    ? _agentInk
                                    : Colors.white,
                                height: 1.3,
                                fontSize: 13))));
              }));
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard(
      {required this.draft, required this.tested, required this.linkedSession});
  final LiveAgentDraft draft;
  final bool tested;
  final String? linkedSession;
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(17),
          border: Border.all(color: const Color(0xFFDDEBE4))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Récapitulatif',
            style: TextStyle(
                color: _agentInk, fontWeight: FontWeight.w900, fontSize: 16)),
        const SizedBox(height: 8),
        _summary('Agent', draft.name),
        _summary('Type', _agentTypeLabel(draft.agentType)),
        _summary('Assistant', draft.personaName),
        _summary('Test', tested ? 'Validé' : 'À effectuer'),
        _summary('Session', linkedSession ?? 'Brouillon')
      ]));
  Widget _summary(String label, String value) => Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text('• $label : $value',
          style: const TextStyle(color: Color(0xFF536A60), fontSize: 12.5)));
}

Map<String, dynamic> _map(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
String? _cleanNullable(dynamic value) {
  final text = '$value'.trim();
  return text.isEmpty || text == 'null' ? null : text;
}

int _asInt(dynamic value) => value is int ? value : int.tryParse('$value') ?? 0;
int? _asNullableInt(dynamic value) =>
    value is int ? value : int.tryParse('$value');
String _formatNumber(int value) {
  final text = '$value';
  final out = StringBuffer();
  for (var i = 0; i < text.length; i++) {
    if (i > 0 && (text.length - i) % 3 == 0) out.write(' ');
    out.write(text[i]);
  }
  return out.toString();
}

String _agentTypeLabel(String type) => type == 'docs'
    ? 'Documents'
    : type == 'website'
        ? 'Site web'
        : 'Commerce';
IconData _agentTypeIcon(String type) => type == 'docs'
    ? Icons.description_outlined
    : type == 'website'
        ? Icons.language_rounded
        : Icons.shopping_bag_outlined;
String _agentStatusLabel(String status) => status == 'active'
    ? 'Actif'
    : status == 'paused'
        ? 'En pause'
        : status == 'testing'
            ? 'À tester'
            : status == 'training'
                ? 'Préparation'
                : 'Brouillon';
String _capabilityLabel(String key) => key == 'qa'
    ? 'Réponses'
    : key == 'sell'
        ? 'Vente'
        : key == 'appointments'
            ? 'Rendez-vous'
            : key == 'qualify'
                ? 'Prospects'
                : 'Handoff humain';
String _starterFaq(String sector) => switch (sector) {
      'restaurant' =>
        'Q: Quels sont vos horaires ?\nR: Nos horaires sont précisés dans les informations pratiques.\n\nQ: Peut-on commander ?\nR: Oui, je peux vous aider à préparer votre commande.',
      'health' =>
        'Q: Puis-je prendre rendez-vous ?\nR: Je peux recueillir votre demande et la transmettre à l’équipe.',
      'education' =>
        'Q: Comment s’inscrire ?\nR: Je peux vous guider sur les formations, les tarifs et les inscriptions.',
      'services' =>
        'Q: Comment demander un devis ?\nR: Je peux recueillir votre besoin pour préparer une demande de devis.',
      _ =>
        'Q: Quels produits proposez-vous ?\nR: Je peux vous présenter les produits disponibles et vous accompagner dans votre choix.'
    };
String _edgeDiagnostic(String raw) {
  final lower = raw.toLowerCase();
  if (lower.contains('failed to send a request') || lower.contains('fetch'))
    return 'Le service IA n’est pas joignable. Vérifiez que l’Edge Function waouh-agent-chat est déployée, que la session est authentifiée et que les secrets IA sont configurés.';
  if (lower.contains('401') ||
      lower.contains('token') ||
      lower.contains('auth'))
    return 'Votre session n’est plus autorisée pour ce test. Reconnectez-vous puis réessayez.';
  if (lower.contains('timeout'))
    return 'Le service IA a dépassé le délai de réponse. Réessayez dans quelques instants.';
  return raw.replaceFirst('LiveWhatsAppIaException: ', '');
}

String _sandboxDiagnostic(String raw) => '⚠️ ${_edgeDiagnostic(raw)}';
