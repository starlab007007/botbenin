import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_ia_premium_ui.dart';
import 'live_whatsapp_ia_models.dart';

part 'live_whatsapp_ia_smart_agent_wizard.dart';
part 'live_whatsapp_ia_agent_management.dart';

const _agentGreen = Color(0xFF08756A);
const _agentBright = Color(0xFF25D366);
const _agentInk = Color(0xFF16231F);
const _agentMuted = Color(0xFF62756D);

/// Represents one WAOUH AI Agent saved in Supabase.
String? _studioSessionLabel(
  List<LiveWhatsAppSession> sessions,
  String? technicalName,
) {
  final name = technicalName?.trim() ?? '';
  if (name.isEmpty) return null;

  for (final session in sessions) {
    if (session.name == name) return waouhIaSessionLabel(session);
  }

  return name;
}

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
      const {'draft', 'testing', 'training', 'deployed'}.contains(status);
  int get messagesHandled => _asInt(stats['messages_handled']);
  int get handoffs => _asInt(stats['handoffs']);

  LiveWhatsAppAiAgent copyWith({
    String? status,
    String? wahaSessionName,
    Map<String, dynamic>? stats,
    List<String>? pausedContacts,
  }) => LiveWhatsAppAiAgent(
    id: id,
    name: name,
    sector: sector,
    agentType: agentType,
    status: status ?? this.status,
    personaName: personaName,
    tone: tone,
    emojis: emojis,
    capabilities: capabilities,
    stats: stats ?? this.stats,
    wahaSessionName: wahaSessionName ?? this.wahaSessionName,
    websiteUrl: websiteUrl,
    pausedContacts: pausedContacts ?? this.pausedContacts,
    createdAt: createdAt,
    updatedAt: updatedAt,
  );

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
      capabilities: <String, bool>{
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

  LiveAgentProduct copyWith({String? name, int? price, String? description}) =>
      LiveAgentProduct(
        id: id,
        name: name ?? this.name,
        price: price ?? this.price,
        description: description ?? this.description,
        businessName: businessName,
        available: available,
      );

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

/// A source document physically stored in Supabase Storage.
class LiveAgentDocument {
  const LiveAgentDocument({
    required this.name,
    required this.storagePath,
    required this.sizeBytes,
  });

  final String name;
  final String storagePath;
  final int sizeBytes;

  String get sizeLabel {
    if (sizeBytes < 1024 * 1024) {
      return '${(sizeBytes / 1024).toStringAsFixed(0)} Ko';
    }
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} Mo';
  }
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
    List<LiveAgentDocument>? documents,
    this.websiteUrl = '',
    this.crawlSite = true,
    this.knowledge = '',
    this.knowledgeUrl = '',
  }) : capabilities =
           capabilities ??
           <String, bool>{
             'qa': true,
             'sell': true,
             'appointments': false,
             'qualify': true,
             'handoff': true,
           },
       selectedPartnerProductIds = selectedPartnerProductIds ?? <String>{},
       manualProducts = manualProducts ?? <LiveAgentProduct>[],
       documents = documents ?? <LiveAgentDocument>[];

  String name;
  String agentType;
  String sector;
  String personaName;
  String tone;
  bool emojis;
  Map<String, bool> capabilities;
  Set<String> selectedPartnerProductIds;
  List<LiveAgentProduct> manualProducts;
  List<LiveAgentDocument> documents;
  String websiteUrl;
  bool crawlSite;
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
          .map(
            (item) =>
                LiveAgentMessage.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList(),
      lastActivity: DateTime.tryParse(
        '${row['last_activity'] ?? ''}',
      )?.toLocal(),
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

/// All Agent IA reads/writes stay in existing Bot.BJ Supabase tables,
/// storage and Edge Functions. No local fake data is used.
class LiveWhatsAppAiAgentRepository {
  LiveWhatsAppAiAgentRepository(this.client);

  final SupabaseClient client;

  User get _user {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const LiveWhatsAppIaException(
        'Votre session est expirée. Reconnectez-vous.',
      );
    }
    return user;
  }

  Future<List<LiveWhatsAppAiAgent>> listAgents() async {
    final rows = await client
        .from('waouh_ai_agents')
        .select(
          'id,name,sector,agent_type,website_url,persona,capabilities,status,stats,waha_session_name,paused_contacts,created_at,updated_at',
        )
        .eq('user_id', _user.id)
        .order('created_at', ascending: false);
    return (rows as List)
        .whereType<Map>()
        .map(
          (item) =>
              LiveWhatsAppAiAgent.fromJson(Map<String, dynamic>.from(item)),
        )
        .where((item) => item.id.isNotEmpty)
        .toList();
  }

  Future<List<LiveAgentProduct>> listPartnerProducts() async {
    final partners = await client
        .from('waouh_partners')
        .select('id')
        .eq('user_id', _user.id);

    final partnerIds = (partners as List)
        .whereType<Map>()
        .map((item) => '${item['id'] ?? ''}'.trim())
        .where((id) => id.isNotEmpty)
        .toList();

    if (partnerIds.isEmpty) {
      return const <LiveAgentProduct>[];
    }

    final rows = await client
        .from('waouh_partner_products')
        .select('id,nom,description,prix_min,disponible,business_id,partner_id')
        .inFilter('partner_id', partnerIds)
        .order('nom');

    return (rows as List)
        .whereType<Map>()
        .map(
          (item) => LiveAgentProduct.partner(Map<String, dynamic>.from(item)),
        )
        .where((item) => item.id != null && item.name.isNotEmpty)
        .toList();
  }

  Future<LiveAgentDocument> uploadDocument({
    required String name,
    required Uint8List bytes,
  }) async {
    final extension = _extension(name);
    if (!const <String>{'pdf', 'docx', 'txt', 'md'}.contains(extension)) {
      throw const LiveWhatsAppIaException(
        'Format non pris en charge. Utilisez PDF, DOCX, TXT ou MD.',
      );
    }
    if (bytes.isEmpty) {
      throw const LiveWhatsAppIaException('Le document sélectionné est vide.');
    }
    if (bytes.lengthInBytes > 20 * 1024 * 1024) {
      throw const LiveWhatsAppIaException(
        'Le document dépasse 20 Mo. Choisissez un fichier plus léger.',
      );
    }

    final safeName = name.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    final storagePath =
        '${_user.id}/${DateTime.now().millisecondsSinceEpoch}-$safeName';
    await client.storage
        .from('agent-documents')
        .uploadBinary(
          storagePath,
          bytes,
          fileOptions: FileOptions(
            contentType: _documentMime(extension),
            upsert: false,
          ),
        );
    return LiveAgentDocument(
      name: name,
      storagePath: storagePath,
      sizeBytes: bytes.lengthInBytes,
    );
  }

  Future<void> deleteDocument(LiveAgentDocument document) => client.storage
      .from('agent-documents')
      .remove(<String>[document.storagePath]);

  Future<LiveWhatsAppAiAgent> createTestingDraft(LiveAgentDraft draft) async {
    final user = _user;
    if (draft.name.trim().isEmpty || draft.personaName.trim().isEmpty) {
      throw const LiveWhatsAppIaException(
        'Le nom de l’activité et celui de l’assistant sont requis.',
      );
    }
    if (draft.agentType == 'docs' && draft.documents.isEmpty) {
      throw const LiveWhatsAppIaException(
        'Ajoutez au moins un document pour créer cet Agent documentaire.',
      );
    }
    if (draft.agentType == 'website' && draft.websiteUrl.trim().isEmpty) {
      throw const LiveWhatsAppIaException(
        'Indiquez l’adresse du site web à analyser.',
      );
    }

    final row = await client
        .from('waouh_ai_agents')
        .insert(<String, dynamic>{
          'user_id': user.id,
          'name': draft.name.trim(),
          'sector': draft.sector,
          'template_id': draft.sector,
          'agent_type': draft.agentType,
          'website_url': draft.agentType == 'website'
              ? draft.websiteUrl.trim()
              : null,
          'persona': <String, dynamic>{
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
        await client
            .from('waouh_ai_agent_products')
            .insert(
              products
                  .asMap()
                  .entries
                  .map(
                    (entry) => <String, dynamic>{
                      'agent_id': agent.id,
                      'user_id': user.id,
                      'name': entry.value.name.trim(),
                      'price_fcfa': entry.value.price,
                      'description': entry.value.description?.trim(),
                      'position': entry.key,
                    },
                  )
                  .toList(),
            );
      }
      if (draft.selectedPartnerProductIds.isNotEmpty) {
        await client
            .from('waouh_ai_agent_partner_products')
            .insert(
              draft.selectedPartnerProductIds
                  .map(
                    (productId) => <String, dynamic>{
                      'agent_id': agent.id,
                      'product_id': productId,
                      'user_id': user.id,
                    },
                  )
                  .toList(),
            );
      }

      final starterFaq = _starterFaq(draft.sector);
      final notes = <String>[
        starterFaq,
        draft.knowledge.trim(),
      ].where((item) => item.isNotEmpty).join('\n\n---\n\n');
      if (notes.isNotEmpty) {
        await _invoke('waouh-agent-ingest', <String, dynamic>{
          'agent_id': agent.id,
          'source_type': 'text',
          'text': notes,
        });
      }

      for (final document in draft.documents) {
        await _invoke('waouh-agent-ingest', <String, dynamic>{
          'agent_id': agent.id,
          'source_type': 'doc',
          'storage_path': document.storagePath,
          'filename': document.name,
        });
      }

      if (draft.agentType == 'website') {
        await _invoke('waouh-agent-ingest', <String, dynamic>{
          'agent_id': agent.id,
          'source_type': 'website',
          'url': draft.websiteUrl.trim(),
          'crawl': draft.crawlSite,
        });
      }
      if (draft.knowledgeUrl.trim().isNotEmpty) {
        await _invoke('waouh-agent-ingest', <String, dynamic>{
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
    final data = await _invoke('waouh-agent-chat', <String, dynamic>{
      'agent_id': agent.id,
      'message': message,
      'history': history
          .map(
            (item) => <String, String>{
              'role': item.role,
              'content': item.content,
            },
          )
          .toList(),
      'persist': false,
    });
    return '${data['reply'] ?? '…'}';
  }

  Future<void> deploy({
    required LiveWhatsAppAiAgent agent,
    required String? sessionName,
    bool replaceExisting = false,
  }) async {
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
      if (conflict != null && !replaceExisting) {
        throw LiveWhatsAppIaException(
          'La ligne « $clean » est déjà utilisée par l’agent « ${conflict['name']} ».',
        );
      }
      if (conflict != null && replaceExisting) {
        await client
            .from('waouh_ai_agents')
            .update(<String, dynamic>{'status': 'paused'})
            .eq('id', conflict['id']);
      }
    }
    await client
        .from('waouh_ai_agents')
        .update(<String, dynamic>{
          'waha_session_name': clean,
          'status': clean == null ? 'draft' : 'active',
        })
        .eq('id', agent.id);
  }

  Future<void> setPaused(LiveWhatsAppAiAgent agent, bool paused) => client
      .from('waouh_ai_agents')
      .update(<String, dynamic>{'status': paused ? 'paused' : 'active'})
      .eq('id', agent.id);

  Future<List<LiveAgentConversation>> conversations(String agentId) async {
    final rows = await client
        .from('waouh_ai_agent_conversations')
        .select(
          'id,agent_id,wa_contact_phone,wa_contact_name,messages,last_activity,human_takeover,needs_handoff',
        )
        .eq('agent_id', agentId)
        .order('last_activity', ascending: false)
        .limit(50);
    return (rows as List)
        .whereType<Map>()
        .map(
          (item) =>
              LiveAgentConversation.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<void> manual({
    required LiveWhatsAppAiAgent agent,
    required String phone,
    String? message,
    String? mode,
  }) => _invoke('waouh-agent-manual-reply', <String, dynamic>{
    'agent_id': agent.id,
    'contact_phone': phone,
    if (message != null && message.trim().isNotEmpty) 'message': message.trim(),
    if (mode != null) 'mode': mode,
  });

  Future<Map<String, dynamic>> insights(String agentId) => _invoke(
    'waouh-agent-insights',
    <String, dynamic>{'agent_id': agentId, 'mode': 'overview'},
  );

  Future<String> askInsights(String agentId, String question) async {
    final response = await _invoke('waouh-agent-insights', <String, dynamic>{
      'agent_id': agentId,
      'mode': 'query',
      'question': question,
    });
    return '${response['answer'] ?? 'Aucune réponse disponible.'}';
  }

  Future<List<LiveAgentProduct>> parseProductImage(XFile image) async {
    final bytes = await image.readAsBytes();
    return _productsFromCatalogResponse(
      await _invoke('waouh-agent-parse-catalog', <String, dynamic>{
        'mode': 'image',
        'image_base64': base64Encode(bytes),
        'image_mime': image.mimeType ?? 'image/jpeg',
      }),
    );
  }

  Future<List<LiveAgentProduct>> parseVoiceAudio({
    required Uint8List bytes,
    required String mimeType,
  }) => _productsFromCatalogResponse(
    _invoke('waouh-agent-parse-catalog', <String, dynamic>{
      'mode': 'voice',
      'audio_base64': base64Encode(bytes),
      'audio_format': mimeType,
    }),
  );

  Future<List<LiveAgentProduct>> _productsFromCatalogResponse(
    FutureOr<Map<String, dynamic>> responseFuture,
  ) async {
    final response = await responseFuture;
    final rows = response['products'] is List
        ? response['products'] as List
        : const <dynamic>[];
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
        .where((item) => item.name.trim().isNotEmpty)
        .toList();
  }

  Future<Map<String, dynamic>> _invoke(
    String functionName,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await client.functions.invoke(functionName, body: body);
      if (response.data is Map) {
        final map = Map<String, dynamic>.from(response.data as Map);
        if (map['error'] != null && '${map['error']}'.trim().isNotEmpty) {
          throw LiveWhatsAppIaException(
            _edgeDiagnostic('${map['code'] ?? ''} ${map['error']}'),
          );
        }
        return map;
      }
      return <String, dynamic>{};
    } on FunctionException catch (error) {
      throw LiveWhatsAppIaException(
        _edgeDiagnostic(error.details?.toString() ?? error.toString()),
      );
    } catch (error) {
      if (error is LiveWhatsAppIaException) rethrow;
      throw LiveWhatsAppIaException(_edgeDiagnostic('$error'));
    }
  }
}

/// The panel is embedded below WhatsApp sessions. It keeps agents and sessions
/// in the same mental model instead of redirecting users to another module.
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
        builder: (_) => LiveWhatsAppIaSmartAgentWizard(
          repository: repository,
          sessions: sessions,
          initialSessionName: sessionName ?? initialSessionName,
        ),
      ),
    );
    if (changed == true) await onChanged();
  }

  Future<void> _openDetail(
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
    final drafts = agents.where((item) => item.isDraft).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const SizedBox(height: 24),
        Row(
          children: <Widget>[
            const Expanded(
              child: Text(
                'Agents IA',
                style: TextStyle(
                  color: _agentInk,
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            if (active > 0)
              _Pill(
                label: '$active actif${active > 1 ? 's' : ''}',
                color: const Color(0xFF159B65),
              ),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: 'Nouvel Agent IA',
              onPressed: () => _openWizard(context),
              style: IconButton.styleFrom(
                backgroundColor: _agentBright,
                foregroundColor: Colors.white,
              ),
              icon: const Icon(Icons.add_rounded),
            ),
          ],
        ),
        const SizedBox(height: 7),
        Text(
          agents.isEmpty
              ? 'Créez, testez puis déployez un Agent IA sans quitter WhatsApp IA.'
              : '$active actif${active > 1 ? 's' : ''} · $drafts brouillon${drafts > 1 ? 's' : ''}',
          style: const TextStyle(
            color: _agentMuted,
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        if (agents.isEmpty)
          _EmptyAgents(onCreate: () => _openWizard(context))
        else
          ...agents.map(
            (agent) => Padding(
              padding: const EdgeInsets.only(bottom: 11),
              child: _AgentCard(
                agent: agent,
                sessions: sessions,
                onTap: () => _openDetail(context, agent),
              ),
            ),
          ),
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
  final _tone = TextEditingController(
    text: 'chaleureux, professionnel et vendeur',
  );
  final _knowledge = TextEditingController();
  final _knowledgeUrl = TextEditingController();
  final _websiteUrl = TextEditingController();
  final _preview = TextEditingController();
  final _picker = ImagePicker();
  final _recorder = AudioRecorder();

  int _page = 0;
  bool _busy = false;
  bool _recording = false;
  bool _tested = false;
  String? _selectedSession;
  LiveWhatsAppAiAgent? _created;
  List<LiveAgentProduct> _partnerProducts = const <LiveAgentProduct>[];
  final List<LiveAgentMessage> _messages = <LiveAgentMessage>[];
  late LiveAgentDraft _draft;

  static const _types = <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'commerce',
      'label': 'Catalogue',
      'icon': Icons.shopping_bag_outlined,
      'description': 'Produits & services',
    },
    <String, dynamic>{
      'id': 'docs',
      'label': 'Documents',
      'icon': Icons.description_outlined,
      'description': 'PDF · Word · FAQ',
    },
    <String, dynamic>{
      'id': 'website',
      'label': 'Site web',
      'icon': Icons.language_rounded,
      'description': 'Pages & catalogue',
    },
  ];

  static const _sectors = <Map<String, String>>[
    <String, String>{
      'id': 'commerce',
      'emoji': '🛍️',
      'label': 'Boutique / Commerce',
    },
    <String, String>{
      'id': 'supermarket',
      'emoji': '🛒',
      'label': 'Supermarché / Alimentation',
    },
    <String, String>{
      'id': 'restaurant',
      'emoji': '🍽️',
      'label': 'Restaurant / Food',
    },
    <String, String>{'id': 'fashion', 'emoji': '✨', 'label': 'Mode / Beauté'},
    <String, String>{
      'id': 'electronics',
      'emoji': '📱',
      'label': 'Téléphonie / Électronique',
    },
    <String, String>{
      'id': 'health',
      'emoji': '🩺',
      'label': 'Santé / Bien-être',
    },
    <String, String>{
      'id': 'education',
      'emoji': '🎓',
      'label': 'Éducation / Formation',
    },
    <String, String>{
      'id': 'services',
      'emoji': '💼',
      'label': 'Services / Freelance',
    },
    <String, String>{'id': 'real_estate', 'emoji': '🏠', 'label': 'Immobilier'},
    <String, String>{
      'id': 'hospitality',
      'emoji': '🛎️',
      'label': 'Hôtellerie / Tourisme',
    },
    <String, String>{
      'id': 'automotive',
      'emoji': '🚗',
      'label': 'Automobile / Pièces',
    },
    <String, String>{
      'id': 'logistics',
      'emoji': '🚚',
      'label': 'Livraison / Logistique',
    },
    <String, String>{
      'id': 'administration',
      'emoji': '🏛️',
      'label': 'Administration / Accueil',
    },
    <String, String>{
      'id': 'booking',
      'emoji': '📅',
      'label': 'Réservation / Rendez-vous',
    },
    <String, String>{
      'id': 'support',
      'emoji': '🎧',
      'label': 'Support client / SAV',
    },
    <String, String>{
      'id': 'knowledge',
      'emoji': '📚',
      'label': 'Documents / Connaissance',
    },
    <String, String>{
      'id': 'web_catalog',
      'emoji': '🌐',
      'label': 'Site Web / Catalogue',
    },
    <String, String>{'id': 'other', 'emoji': '✨', 'label': 'Autre activité'},
  ];

  String get _sectorGuidance => switch (_draft.sector) {
    'commerce' || 'supermarket' || 'fashion' || 'electronics' =>
      'Conseil : un catalogue rendra les réponses produits plus précises.',
    'restaurant' || 'hospitality' || 'booking' =>
      'Conseil : activez les rendez-vous pour mieux traiter les réservations.',
    'health' || 'education' || 'knowledge' || 'support' =>
      'Conseil : des documents fiables améliorent la qualité des réponses.',
    'real_estate' || 'services' || 'logistics' || 'automotive' =>
      'Conseil : la qualification aide à recueillir besoin, budget et urgence.',
    _ =>
      'Conseil : choisissez la source de connaissance la plus proche de votre activité.',
  };

  String get _recommendedAgentType => switch (_draft.sector) {
    'commerce' ||
    'supermarket' ||
    'fashion' ||
    'electronics' ||
    'restaurant' ||
    'automotive' => 'commerce',
    'health' ||
    'education' ||
    'knowledge' ||
    'support' ||
    'administration' => 'docs',
    'real_estate' ||
    'services' ||
    'logistics' ||
    'hospitality' ||
    'booking' ||
    'web_catalog' => 'website',
    _ => 'commerce',
  };

  Map<String, bool> _recommendedCapabilities() => switch (_draft.sector) {
    'restaurant' || 'hospitality' || 'booking' => <String, bool>{
      'qa': true,
      'sell': true,
      'appointments': true,
      'qualify': true,
      'handoff': true,
    },
    'health' ||
    'education' ||
    'knowledge' ||
    'support' ||
    'administration' => <String, bool>{
      'qa': true,
      'sell': false,
      'appointments': _draft.sector == 'health',
      'qualify': true,
      'handoff': true,
    },
    'real_estate' ||
    'services' ||
    'logistics' ||
    'automotive' => <String, bool>{
      'qa': true,
      'sell': true,
      'appointments':
          _draft.sector == 'real_estate' || _draft.sector == 'services',
      'qualify': true,
      'handoff': true,
    },
    _ => <String, bool>{
      'qa': true,
      'sell': true,
      'appointments': false,
      'qualify': true,
      'handoff': true,
    },
  };

  void _applySectorRecommendation() {
    setState(() {
      _draft.agentType = _recommendedAgentType;
      _draft.capabilities = _recommendedCapabilities();
    });
  }

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
    _preview.dispose();
    unawaited(_recorder.dispose());
    super.dispose();
  }

  Future<void> _loadPartnerProducts() async {
    try {
      final values = await widget.repository.listPartnerProducts();
      if (mounted) setState(() => _partnerProducts = values);
    } catch (_) {
      // A manual catalog still lets the merchant create an agent.
    }
  }

  void _syncDraft() {
    _draft
      ..name = _name.text.trim()
      ..personaName = _persona.text.trim()
      ..tone = _tone.text.trim()
      ..knowledge = _knowledge.text.trim()
      ..knowledgeUrl = _knowledgeUrl.text.trim()
      ..websiteUrl = _websiteUrl.text.trim();
  }

  bool get _baseReady =>
      _name.text.trim().isNotEmpty && _persona.text.trim().isNotEmpty;

  Future<void> _next() async {
    if (_page == 0) {
      if (!_baseReady) {
        _notice('Indiquez le nom de l’activité et le prénom de l’assistant.');
        return;
      }
      setState(() => _page = 1);
      return;
    }

    _syncDraft();
    if (_draft.agentType == 'docs' && _draft.documents.isEmpty) {
      _notice('Ajoutez au moins un PDF, Word, TXT ou MD.');
      return;
    }
    if (_draft.agentType == 'website' && _draft.websiteUrl.trim().isEmpty) {
      _notice('Indiquez l’URL de votre site web.');
      return;
    }

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

  Future<void> _pickDocuments() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['pdf', 'docx', 'txt', 'md'],
      allowMultiple: true,
      withData: true,
    );
    if (result == null) return;

    setState(() => _busy = true);
    try {
      final uploaded = <LiveAgentDocument>[];
      for (final file in result.files) {
        final bytes =
            file.bytes ??
            (file.path == null ? null : await File(file.path!).readAsBytes());
        if (bytes == null) {
          throw LiveWhatsAppIaException(
            'Impossible de lire « ${file.name} ». Réessayez avec un autre fichier.',
          );
        }
        uploaded.add(
          await widget.repository.uploadDocument(name: file.name, bytes: bytes),
        );
      }
      if (!mounted) return;
      setState(() => _draft.documents.addAll(uploaded));
      _notice(
        '${uploaded.length} document(s) prêt(s) pour l’Agent IA.',
        success: true,
      );
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _removeDocument(int index) async {
    final document = _draft.documents[index];
    setState(() => _busy = true);
    try {
      await widget.repository.deleteDocument(document);
      if (mounted) setState(() => _draft.documents.removeAt(index));
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _parseImage() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _ImageSourceSheet(
        onCamera: () => Navigator.pop(sheetContext, ImageSource.camera),
        onGallery: () => Navigator.pop(sheetContext, ImageSource.gallery),
      ),
    );
    if (source == null) return;
    final image = await _picker.pickImage(source: source, imageQuality: 82);
    if (image == null) return;

    setState(() => _busy = true);
    try {
      final products = await widget.repository.parseProductImage(image);
      if (!mounted) return;
      setState(() => _draft.manualProducts.addAll(products));
      _notice(
        products.isEmpty
            ? 'Aucun article n’a été détecté. Ajoutez-le manuellement.'
            : '${products.length} article(s) ajouté(s) depuis la photo.',
        success: products.isNotEmpty,
      );
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleVoice() async {
    if (_recording) {
      await _stopVoice();
    } else {
      await _startVoice();
    }
  }

  Future<void> _startVoice() async {
    try {
      final allowed = await _recorder.hasPermission();
      if (!allowed) {
        throw const LiveWhatsAppIaException(
          'Autorisez le microphone pour dicter votre catalogue.',
        );
      }
      final directory = await getTemporaryDirectory();
      final path =
          '${directory.path}/waouh-catalog-${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        path: path,
      );
      if (mounted) setState(() => _recording = true);
    } catch (error) {
      _notice('$error');
    }
  }

  Future<void> _stopVoice() async {
    setState(() {
      _recording = false;
      _busy = true;
    });
    try {
      final path = await _recorder.stop();
      if (path == null) {
        throw const LiveWhatsAppIaException(
          'Aucun enregistrement détecté. Parlez au moins deux secondes.',
        );
      }
      final file = File(path);
      final bytes = await file.readAsBytes();
      final products = await widget.repository.parseVoiceAudio(
        bytes: bytes,
        mimeType: 'audio/mp4',
      );
      if (!mounted) return;
      setState(() => _draft.manualProducts.addAll(products));
      _notice(
        products.isEmpty
            ? 'La dictée a été comprise, mais aucun article clair n’a été détecté.'
            : '${products.length} article(s) ajouté(s) depuis votre dictée.',
        success: products.isNotEmpty,
      );
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
      final reply = await widget.repository.sandbox(
        agent: _created!,
        message: text,
        history: _messages,
      );
      if (mounted) {
        setState(() {
          _messages.add(LiveAgentMessage(role: 'assistant', content: reply));
          _tested = true;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _messages.add(
            LiveAgentMessage(
              role: 'assistant',
              content: '⚠️ ${_edgeDiagnostic('$error')}',
            ),
          );
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save({
    required bool activate,
    bool replaceExisting = false,
  }) async {
    final agent = _created;
    if (agent == null) return;
    if (activate && !_tested) {
      _notice('Testez au moins une fois l’Agent IA avant son activation.');
      return;
    }
    if (activate && _selectedSession == null) {
      _notice('Choisissez une session WhatsApp connectée.');
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.repository.deploy(
        agent: agent,
        sessionName: activate ? _selectedSession : null,
        replaceExisting: replaceExisting,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (error) {
      final message = '$error';
      if (activate && message.contains('déjà utilisée')) {
        final replace = await _confirmReplace(message);
        if (replace == true && mounted) {
          await _save(activate: true, replaceExisting: true);
          return;
        }
      }
      _notice(message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<bool?> _confirmReplace(String message) => showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Remplacer l’Agent actif ?'),
      content: Text(
        '$message\n\nL’ancien Agent sera mis en pause sur cette ligne.',
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.pop(dialogContext, false),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(dialogContext, true),
          child: const Text('Remplacer'),
        ),
      ],
    ),
  );

  void _notice(String text, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: success ? const Color(0xFF159B65) : _agentInk,
        content: Text(text.replaceFirst('LiveWhatsAppIaException: ', '')),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => WaouhIaThemeScope(
    child: Scaffold(
      backgroundColor: const Color(0xFFF6F9F7),
      appBar: AppBar(
        surfaceTintColor: Colors.white,
        backgroundColor: Colors.white,
        foregroundColor: _agentInk,
        elevation: 0,
        titleSpacing: 12,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Nouvel Agent IA · ${_page + 1}/3',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 2),
            Text(
              _page == 0
                  ? 'Identité & comportement'
                  : _page == 1
                  ? 'Sources & connaissances'
                  : 'Tester & activer',
              style: const TextStyle(
                color: _agentMuted,
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(9),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              children: List<Widget>.generate(
                3,
                (index) => Expanded(
                  child: Container(
                    height: 5,
                    margin: EdgeInsets.only(right: index == 2 ? 0 : 6),
                    decoration: BoxDecoration(
                      color: index <= _page
                          ? _agentBright
                          : const Color(0xFFE5ECE8),
                      borderRadius: BorderRadius.circular(9),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
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
    ),
  );

  Widget _basePage() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      const _SectionTitle(
        title: 'Votre activité',
        subtitle: 'Définissez ce que l’Agent IA représente pour vos clients.',
      ),
      const SizedBox(height: 14),
      _field(
        controller: _name,
        label: 'Nom de l’activité ou de l’agent',
        hint: 'Ex. Boutique Chic Cotonou',
      ),
      const SizedBox(height: 18),
      const Text(
        'Source de connaissance',
        style: TextStyle(
          color: _agentInk,
          fontWeight: FontWeight.w900,
          fontSize: 16,
        ),
      ),
      const SizedBox(height: 9),
      Row(
        children: _types.map((type) {
          final selected = _draft.agentType == type['id'];
          return Expanded(
            child: Padding(
              padding: EdgeInsets.only(right: type['id'] == 'website' ? 0 : 8),
              child: _ChoiceCard(
                compact: true,
                selected: selected,
                icon: type['icon'] as IconData,
                title: type['label'] as String,
                subtitle: type['description'] as String,
                onTap: () =>
                    setState(() => _draft.agentType = type['id'] as String),
              ),
            ),
          );
        }).toList(),
      ),
      const SizedBox(height: 18),
      const Text(
        'Secteur d’activité',
        style: TextStyle(
          color: _agentInk,
          fontWeight: FontWeight.w900,
          fontSize: 16,
        ),
      ),
      const SizedBox(height: 9),
      GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.72,
          mainAxisSpacing: 9,
          crossAxisSpacing: 9,
        ),
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
      const SizedBox(height: 10),
      _InlineHint(text: _sectorGuidance),
      const SizedBox(height: 8),
      OutlinedButton.icon(
        onPressed: _applySectorRecommendation,
        icon: const Icon(Icons.auto_awesome_outlined, size: 18),
        label: const Text('Adapter l’Agent à ce secteur'),
      ),
      const SizedBox(height: 22),
      const _SectionTitle(
        title: 'Personnalité',
        subtitle:
            'La manière dont votre assistant accueille et accompagne vos clients.',
      ),
      const SizedBox(height: 14),
      _field(
        controller: _persona,
        label: 'Prénom de votre assistant IA',
        hint: 'Ex. Aïcha',
      ),
      const SizedBox(height: 12),
      _field(
        controller: _tone,
        label: 'Ton / personnalité',
        hint: 'Ex. Chaleureux, professionnel et vendeur',
      ),
      const SizedBox(height: 8),
      SwitchListTile.adaptive(
        contentPadding: EdgeInsets.zero,
        title: const Text(
          'Utiliser des emojis',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: const Text(
          'Des réponses plus expressives, adaptées à WhatsApp.',
          style: TextStyle(fontSize: 12, color: _agentMuted),
        ),
        value: _draft.emojis,
        activeColor: _agentBright,
        onChanged: (value) => setState(() => _draft.emojis = value),
      ),
      const Divider(height: 22),
      const Text(
        'Ce que l’Agent peut faire',
        style: TextStyle(
          color: _agentInk,
          fontWeight: FontWeight.w900,
          fontSize: 16,
        ),
      ),
      const SizedBox(height: 5),
      ...const <(String, String, String)>[
        ('qa', 'Répondre aux questions', 'Répond à partir de vos sources.'),
        (
          'sell',
          'Présenter et vendre',
          'Met en avant les produits et services.',
        ),
        (
          'appointments',
          'Prendre des rendez-vous',
          'Collecte les demandes de rendez-vous.',
        ),
        (
          'qualify',
          'Qualifier les prospects',
          'Recueille besoin, budget et urgence.',
        ),
        (
          'handoff',
          'Passer la main à un humain',
          'Signale les demandes nécessitant votre intervention.',
        ),
      ].map(
        (item) => SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          title: Text(
            item.$2,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
          ),
          subtitle: Text(
            item.$3,
            style: const TextStyle(fontSize: 11.5, color: _agentMuted),
          ),
          value: _draft.capabilities[item.$1] == true,
          activeColor: _agentBright,
          onChanged: (value) =>
              setState(() => _draft.capabilities[item.$1] = value),
        ),
      ),
    ],
  );

  Widget _sourcePage() {
    final commerce = _draft.agentType == 'commerce';
    final docs = _draft.agentType == 'docs';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _SectionTitle(
          title: commerce
              ? 'Catalogue & connaissances'
              : docs
              ? 'Documents & connaissances'
              : 'Site web & connaissances',
          subtitle: commerce
              ? 'Choisissez ce que votre Agent présente à vos clients.'
              : docs
              ? 'Importez des PDF, Word, TXT ou MD : l’Agent répondra uniquement selon leur contenu.'
              : 'Indiquez le site que l’Agent doit analyser.',
        ),
        const SizedBox(height: 14),
        if (commerce) ..._commerceSources(),
        if (docs) _documentSources(),
        if (_draft.agentType == 'website') ...<Widget>[
          _field(
            controller: _websiteUrl,
            label: 'URL du site web',
            hint: 'https://mon-site.com',
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 5),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'Explorer plusieurs pages',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            subtitle: const Text(
              'Analyse jusqu’à 15 pages : plus complet, mais plus long.',
              style: TextStyle(fontSize: 12, color: _agentMuted),
            ),
            value: _draft.crawlSite,
            activeColor: _agentBright,
            onChanged: (value) => setState(() => _draft.crawlSite = value),
          ),
        ],
        const SizedBox(height: 18),
        const Divider(height: 1),
        const SizedBox(height: 18),
        const Text(
          'Informations pratiques',
          style: TextStyle(
            color: _agentInk,
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'Horaires, livraison, paiement, zone couverte et FAQ : l’Agent IA les utilisera pour répondre plus précisément.',
          style: TextStyle(color: _agentMuted, fontSize: 12.5, height: 1.32),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _knowledge,
          minLines: 5,
          maxLines: 8,
          decoration: const InputDecoration(
            hintText:
                'Ex. Livraison Cotonou/Calavi. Paiement Mobile Money. Retours sous 48h.',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 12),
        _field(
          controller: _knowledgeUrl,
          label: 'Page complémentaire (optionnel)',
          hint: 'https://...',
          keyboardType: TextInputType.url,
        ),
      ],
    );
  }

  Widget _documentSources() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFDDEBE4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Row(
              children: <Widget>[
                Icon(Icons.lock_outline_rounded, color: _agentGreen),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Sources privées et sécurisées',
                    style: TextStyle(
                      color: _agentInk,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Les fichiers sont transférés dans votre stockage Supabase privé, puis indexés pour ce seul Agent IA.',
              style: TextStyle(color: _agentMuted, fontSize: 12.2, height: 1.3),
            ),
            const SizedBox(height: 13),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _busy ? null : _pickDocuments,
                icon: const Icon(Icons.upload_file_rounded),
                label: const Text('Ajouter PDF, Word, TXT ou MD'),
              ),
            ),
            const SizedBox(height: 5),
            const Text(
              '20 Mo maximum par fichier.',
              style: TextStyle(color: _agentMuted, fontSize: 11.5),
            ),
          ],
        ),
      ),
      if (_draft.documents.isNotEmpty) ...<Widget>[
        const SizedBox(height: 10),
        ..._draft.documents.asMap().entries.map(
          (entry) => _DocumentTile(
            document: entry.value,
            busy: _busy,
            onDelete: () => _removeDocument(entry.key),
          ),
        ),
      ],
    ],
  );

  List<Widget> _commerceSources() {
    final selected = _draft.selectedPartnerProductIds;
    return <Widget>[
      if (_partnerProducts.isEmpty)
        const _InlineHint(
          text:
              'Aucun produit Partenaire disponible. Ajoutez votre catalogue par dictée, photo ou saisie manuelle.',
        )
      else ...<Widget>[
        const Text(
          'Produits synchronisés',
          style: TextStyle(
            color: _agentInk,
            fontSize: 16,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFDCE8E2)),
          ),
          child: Column(
            children: _partnerProducts.take(30).map((product) {
              final isSelected = selected.contains(product.id);
              return CheckboxListTile(
                value: isSelected,
                controlAffinity: ListTileControlAffinity.leading,
                activeColor: const Color(0xFF159B65),
                title: Text(
                  product.name,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(
                  '${product.priceLabel}${product.description?.isNotEmpty == true ? ' · ${product.description}' : ''}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _agentMuted, fontSize: 11.5),
                ),
                onChanged: (value) => setState(() {
                  if (value == true) {
                    selected.add(product.id!);
                  } else {
                    selected.remove(product.id);
                  }
                }),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 7),
        Text(
          '${selected.length} produit(s) partenaire sélectionné(s)',
          style: const TextStyle(color: _agentMuted, fontSize: 12),
        ),
      ],
      const SizedBox(height: 18),
      const Text(
        'Ajouter un article',
        style: TextStyle(
          color: _agentInk,
          fontSize: 16,
          fontWeight: FontWeight.w900,
        ),
      ),
      const SizedBox(height: 9),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: <Widget>[
          OutlinedButton.icon(
            onPressed: _busy ? null : _toggleVoice,
            style: OutlinedButton.styleFrom(
              foregroundColor: _recording
                  ? const Color(0xFFD94747)
                  : _agentGreen,
              side: BorderSide(
                color: _recording
                    ? const Color(0xFFF0B5B5)
                    : const Color(0xFFC4E5D5),
              ),
            ),
            icon: Icon(
              _recording ? Icons.stop_circle_outlined : Icons.mic_none_rounded,
            ),
            label: Text(_recording ? 'Arrêter la dictée' : 'Dicter'),
          ),
          OutlinedButton.icon(
            onPressed: _busy ? null : _parseImage,
            icon: const Icon(Icons.photo_camera_back_outlined),
            label: const Text('Photo'),
          ),
          OutlinedButton.icon(
            onPressed: _busy
                ? null
                : () => setState(
                    () => _draft.manualProducts.add(
                      const LiveAgentProduct(name: ''),
                    ),
                  ),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Manuel'),
          ),
        ],
      ),
      if (_recording) ...<Widget>[
        const SizedBox(height: 10),
        const _RecordingHint(),
      ],
      if (_draft.manualProducts.isNotEmpty) ...<Widget>[
        const SizedBox(height: 10),
        ..._draft.manualProducts.asMap().entries.map(
          (entry) => _ManualProductEditor(
            product: entry.value,
            onChanged: (updated) =>
                setState(() => _draft.manualProducts[entry.key] = updated),
            onDelete: () =>
                setState(() => _draft.manualProducts.removeAt(entry.key)),
          ),
        ),
      ],
    ];
  }

  Widget _testPage() {
    final connected = widget.sessions.where((item) => item.isWorking).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFEAF9F2),
            borderRadius: BorderRadius.circular(17),
            border: Border.all(color: const Color(0xFFC5EBD9)),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(Icons.shield_outlined, color: _agentGreen),
              SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Test sécurisé',
                      style: TextStyle(
                        color: _agentGreen,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Aucun message n’est envoyé sur WhatsApp avant l’activation.',
                      style: TextStyle(
                        color: Color(0xFF476C61),
                        fontSize: 12.5,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 7,
          runSpacing: 7,
          children: <Widget>[
            _PromptChip(
              label: 'Que vendez-vous ?',
              onTap: () => _preview.text = 'Bonjour, que vendez-vous ?',
            ),
            _PromptChip(
              label: 'Quel est le prix ?',
              onTap: () => _preview.text = 'Quel est le prix ?',
            ),
            _PromptChip(
              label: 'Je veux un humain',
              onTap: () => _preview.text = 'Je veux parler à une personne.',
            ),
          ],
        ),
        const SizedBox(height: 11),
        SizedBox(
          height: 320,
          child: _ChatPanel(messages: _messages, busy: _busy),
        ),
        const SizedBox(height: 10),
        Row(
          children: <Widget>[
            Expanded(
              child: TextField(
                controller: _preview,
                enabled: !_busy,
                onSubmitted: (_) => _sendSandbox(),
                decoration: const InputDecoration(
                  hintText: 'Écrivez comme un client WhatsApp…',
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _busy ? null : _sendSandbox,
              style: IconButton.styleFrom(backgroundColor: _agentGreen),
              icon: const Icon(Icons.send_rounded),
            ),
          ],
        ),
        const SizedBox(height: 24),
        const Text(
          'Activer sur WhatsApp',
          style: TextStyle(
            color: _agentInk,
            fontSize: 17,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'Une seule IA active est autorisée par ligne.',
          style: TextStyle(color: _agentMuted, fontSize: 12.5),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: _selectedSession,
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.forum_outlined),
          ),
          hint: const Text('Choisir une session connectée'),
          items: connected
              .map(
                (session) => DropdownMenuItem<String>(
                  value: session.name,
                  child: Text(
                    '${waouhIaSessionLabel(session)}${session.phone == null ? '' : ' · ${session.displayPhone}'}',
                  ),
                ),
              )
              .toList(),
          onChanged: _busy
              ? null
              : (value) => setState(() => _selectedSession = value),
        ),
        if (connected.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: _InlineHint(
              text:
                  'Aucune ligne connectée. Enregistrez cet Agent comme brouillon puis activez-le plus tard.',
            ),
          ),
        const SizedBox(height: 14),
        _SummaryCard(
          draft: _draft,
          tested: _tested,
          linkedSession: _studioSessionLabel(widget.sessions, _selectedSession),
        ),
      ],
    );
  }

  Widget _footer() => SafeArea(
    top: false,
    child: Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2EBE6))),
      ),
      child: Row(
        children: <Widget>[
          if (_page > 0)
            TextButton.icon(
              onPressed: _busy ? null : () => setState(() => _page--),
              icon: const Icon(Icons.chevron_left_rounded),
              label: const Text('Précédent'),
            )
          else
            const SizedBox(width: 8),
          const Spacer(),
          if (_page < 2)
            FilledButton.icon(
              onPressed: _busy ? null : _next,
              style: FilledButton.styleFrom(
                backgroundColor: _agentGreen,
                foregroundColor: Colors.white,
                minimumSize: const Size(132, 48),
              ),
              icon: _busy
                  ? const _TinyLoader()
                  : const Icon(Icons.chevron_right_rounded),
              label: Text(_page == 1 ? 'Créer et tester' : 'Suivant'),
            )
          else ...<Widget>[
            OutlinedButton(
              onPressed: _busy ? null : () => _save(activate: false),
              child: const Text('Brouillon'),
            ),
            const SizedBox(width: 8),
            FilledButton.icon(
              onPressed: _busy || _selectedSession == null
                  ? null
                  : () => _save(activate: true),
              style: FilledButton.styleFrom(
                backgroundColor: _agentBright,
                foregroundColor: Colors.white,
                minimumSize: const Size(0, 48),
              ),
              icon: _busy
                  ? const _TinyLoader()
                  : const Icon(Icons.rocket_launch_rounded, size: 18),
              label: const Text('Activer'),
            ),
          ],
        ],
      ),
    ),
  );

  Widget _field({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType? keyboardType,
  }) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Text(
        label,
        style: const TextStyle(
          color: _agentInk,
          fontWeight: FontWeight.w900,
          fontSize: 14.5,
        ),
      ),
      const SizedBox(height: 7),
      TextField(
        controller: controller,
        keyboardType: keyboardType,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(hintText: hint),
      ),
    ],
  );
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
      final nextStatus = _agent.isActive ? 'paused' : 'active';
      await widget.repository.setPaused(_agent, _agent.isActive);
      if (mounted) setState(() => _agent = _agent.copyWith(status: nextStatus));
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _editAgent() async {
    final value = await showModalBottomSheet<LiveWhatsAppIaAgentEditValue>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (_) => _OwnedAgentEditSheet(agent: _agent),
    );
    if (value == null || !mounted) return;

    setState(() => _busy = true);
    try {
      final saved = await widget.repository.updateOwnedAgent(
        agent: _agent,
        value: value,
      );
      if (mounted) {
        setState(() => _agent = saved);
        _notice('Agent IA modifié.');
      }
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmDeleteAgent() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Supprimer cet Agent IA ?'),
        content: Text(
          '« ${_agent.name} » sera supprimé avec ses produits, conversations et connaissances indexées. Cette action est irréversible.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFD94747),
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await widget.repository.deleteOwnedAgent(_agent);
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notice(String text) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(text.replaceFirst('LiveWhatsAppIaException: ', ''))),
  );

  @override
  Widget build(BuildContext context) => WaouhIaThemeScope(
    child: Scaffold(
      backgroundColor: const Color(0xFFF6F9F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        foregroundColor: _agentInk,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              _agent.name,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
            ),
            Text(
              '${_agent.personaName} · ${_agent.isActive ? 'Actif' : _agent.status}',
              style: const TextStyle(color: _agentMuted, fontSize: 11.5),
            ),
          ],
        ),
        actions: <Widget>[
          IconButton(
            onPressed: _busy ? null : _toggle,
            tooltip: _agent.isActive ? 'Mettre en pause' : 'Activer',
            icon: Icon(
              _agent.isActive
                  ? Icons.pause_circle_outline_rounded
                  : Icons.play_circle_outline_rounded,
            ),
          ),
          PopupMenuButton<String>(
            enabled: !_busy,
            tooltip: 'Gérer cet Agent IA',
            onSelected: (value) {
              if (value == 'edit') {
                _editAgent();
              } else if (value == 'delete') {
                _confirmDeleteAgent();
              }
            },
            itemBuilder: (context) => const <PopupMenuEntry<String>>[
              PopupMenuItem<String>(
                value: 'edit',
                child: ListTile(
                  dense: true,
                  leading: Icon(Icons.edit_outlined),
                  title: Text('Modifier'),
                ),
              ),
              PopupMenuDivider(),
              PopupMenuItem<String>(
                value: 'delete',
                child: ListTile(
                  dense: true,
                  leading: Icon(
                    Icons.delete_outline_rounded,
                    color: Color(0xFFD94747),
                  ),
                  title: Text(
                    'Supprimer',
                    style: TextStyle(color: Color(0xFFD94747)),
                  ),
                ),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          labelColor: _agentGreen,
          indicatorColor: _agentGreen,
          tabs: const <Widget>[
            Tab(text: 'Résumé'),
            Tab(text: 'Test'),
            Tab(text: 'Direct'),
            Tab(text: 'Stats'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: <Widget>[
          _AgentSummary(
            agent: _agent,
            sessionLabel: _studioSessionLabel(
              widget.sessions,
              _agent.wahaSessionName,
            ),
          ),
          _AgentSandboxTab(repository: widget.repository, agent: _agent),
          _AgentDirectTab(repository: widget.repository, agent: _agent),
          _AgentStatsTab(repository: widget.repository, agent: _agent),
        ],
      ),
    ),
  );
}

class _AgentSummary extends StatelessWidget {
  const _AgentSummary({required this.agent, required this.sessionLabel});

  final LiveWhatsAppAiAgent agent;
  final String? sessionLabel;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: <Widget>[
      _AgentHero(agent: agent),
      const SizedBox(height: 12),
      _InfoPanel(
        title: 'Canal WhatsApp',
        icon: Icons.forum_outlined,
        child: Text(
          sessionLabel == null
              ? 'Brouillon — aucune ligne WhatsApp associée.'
              : 'Actif sur « $sessionLabel ».',
          style: const TextStyle(height: 1.35),
        ),
      ),
      const SizedBox(height: 12),
      _InfoPanel(
        title: 'Personnalité',
        icon: Icons.person_outline_rounded,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              agent.personaName,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 3),
            Text(agent.tone, style: const TextStyle(color: _agentMuted)),
          ],
        ),
      ),
      const SizedBox(height: 12),
      _InfoPanel(
        title: 'Capacités',
        icon: Icons.auto_awesome_rounded,
        child: Wrap(
          spacing: 7,
          runSpacing: 7,
          children: agent.capabilities.entries
              .where((item) => item.value)
              .map(
                (item) => _Pill(
                  label: _capabilityLabel(item.key),
                  color: _agentGreen,
                ),
              )
              .toList(),
        ),
      ),
      const SizedBox(height: 12),
      _InfoPanel(
        title: 'Pilotage métier',
        icon: Icons.insights_outlined,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const Text(
              'Analysez les conversations et maintenez le catalogue proposé par cet Agent IA.',
              style: TextStyle(color: _agentMuted, height: 1.35),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                OutlinedButton.icon(
                  onPressed: () => context.push(
                    '/app/whatsapp/agent/${Uri.encodeComponent(agent.id)}/insights?name=${Uri.encodeQueryComponent(agent.name)}',
                  ),
                  icon: const Icon(Icons.analytics_outlined, size: 18),
                  label: const Text('BI / Analyse'),
                ),
                OutlinedButton.icon(
                  onPressed: () => context.push(
                    '/app/whatsapp/agent/${Uri.encodeComponent(agent.id)}/catalogue',
                  ),
                  icon: const Icon(Icons.menu_book_outlined, size: 18),
                  label: const Text('Catalogue'),
                ),
              ],
            ),
          ],
        ),
      ),
    ],
  );
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
  final List<LiveAgentMessage> _messages = <LiveAgentMessage>[];
  bool _busy = false;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
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
      final reply = await widget.repository.sandbox(
        agent: widget.agent,
        message: message,
        history: _messages,
      );
      if (mounted) {
        setState(
          () => _messages.add(
            LiveAgentMessage(role: 'assistant', content: reply),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _messages.add(
            LiveAgentMessage(
              role: 'assistant',
              content: '⚠️ ${_edgeDiagnostic('$error')}',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(16),
    child: Column(
      children: <Widget>[
        const _InlineHint(
          text:
              'Test interne : aucun message n’est transmis à vos clients WhatsApp.',
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _ChatPanel(messages: _messages, busy: _busy),
        ),
        const SizedBox(height: 10),
        Row(
          children: <Widget>[
            Expanded(
              child: TextField(
                controller: _input,
                onSubmitted: (_) => _send(),
                decoration: const InputDecoration(
                  hintText: 'Écrivez comme un client…',
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _busy ? null : _send,
              style: IconButton.styleFrom(backgroundColor: _agentGreen),
              icon: const Icon(Icons.send_rounded),
            ),
          ],
        ),
      ],
    ),
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
  RealtimeChannel? _channel;
  List<LiveAgentConversation> _conversations = const <LiveAgentConversation>[];
  LiveAgentConversation? _selected;
  final _reply = TextEditingController();
  bool _loading = true;
  bool _sending = false;
  late Set<String> _paused = <String>{...widget.agent.pausedContacts};

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _load(silent: true),
    );
    _channel = widget.repository.client
        .channel('waouh_agent_conversations_${widget.agent.id}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'waouh_ai_agent_conversations',
          callback: (_) => _load(silent: true),
        )
        .subscribe();
  }

  @override
  void dispose() {
    _poll?.cancel();
    if (_channel != null)
      unawaited(widget.repository.client.removeChannel(_channel!));
    _reply.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent && mounted) setState(() => _loading = true);
    try {
      final values = await widget.repository.conversations(widget.agent.id);
      if (!mounted) return;
      setState(() {
        _conversations = values;
        if (_selected != null) {
          LiveAgentConversation? refreshed;
          for (final item in values) {
            if (item.id == _selected!.id) {
              refreshed = item;
              break;
            }
          }
          _selected = refreshed;
        }
      });
    } catch (_) {
      // The empty state remains more useful than exposing a raw transport error.
    } finally {
      if (!silent && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _takeover() async {
    final selected = _selected;
    if (selected == null) return;
    setState(() => _sending = true);
    try {
      await widget.repository.manual(
        agent: widget.agent,
        phone: selected.phone,
        mode: selected.humanTakeover ? 'release' : 'takeover',
      );
      await _load(silent: true);
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _togglePause() async {
    final selected = _selected;
    if (selected == null) return;
    final willPause = !_paused.contains(selected.phone);
    setState(() => _sending = true);
    try {
      await widget.repository.manual(
        agent: widget.agent,
        phone: selected.phone,
        mode: willPause ? 'pause' : 'resume',
      );
      if (mounted) {
        setState(() {
          if (willPause) {
            _paused.add(selected.phone);
          } else {
            _paused.remove(selected.phone);
          }
        });
      }
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _sending = false);
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
        mode: selected.humanTakeover ? null : 'takeover',
      );
      _reply.clear();
      await _load(silent: true);
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _notice(String text) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(text.replaceFirst('LiveWhatsAppIaException: ', ''))),
  );

  @override
  Widget build(BuildContext context) {
    if (_selected == null) return _conversationList();
    return _conversationDetail();
  }

  Widget _conversationList() => ListView(
    padding: const EdgeInsets.all(16),
    children: <Widget>[
      Row(
        children: <Widget>[
          const Expanded(
            child: Text(
              'Conversations en direct',
              style: TextStyle(
                color: _agentInk,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
          ),
          IconButton(
            onPressed: () => _load(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      const SizedBox(height: 8),
      if (_loading)
        const Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: CircularProgressIndicator()),
        )
      else if (_conversations.isEmpty)
        const _EmptyDirect()
      else
        ..._conversations.map(
          (conversation) => _ConversationTile(
            conversation: conversation,
            paused: _paused.contains(conversation.phone),
            onTap: () => setState(() => _selected = conversation),
          ),
        ),
    ],
  );

  Widget _conversationDetail() {
    final conversation = _selected!;
    final paused = _paused.contains(conversation.phone);
    return Column(
      children: <Widget>[
        Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          color: Colors.white,
          child: Row(
            children: <Widget>[
              IconButton(
                onPressed: () => setState(() => _selected = null),
                icon: const Icon(Icons.arrow_back_rounded),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      conversation.name ?? conversation.phone,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    Text(
                      conversation.phone,
                      style: const TextStyle(
                        color: _agentMuted,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: paused ? 'Réactiver le bot' : 'Mettre le bot en pause',
                onPressed: _sending ? null : _togglePause,
                icon: Icon(
                  paused ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                ),
              ),
              IconButton(
                tooltip: conversation.humanTakeover
                    ? 'Rendre la main au bot'
                    : 'Prendre la main',
                onPressed: _sending ? null : _takeover,
                icon: Icon(
                  conversation.humanTakeover
                      ? Icons.smart_toy_outlined
                      : Icons.person_pin_circle_outlined,
                ),
              ),
            ],
          ),
        ),
        if (conversation.needsHandoff) const _HandoffBanner(),
        Expanded(
          child: _ChatPanel(messages: conversation.messages, busy: _sending),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
          color: Colors.white,
          child: Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  controller: _reply,
                  onSubmitted: (_) => _send(),
                  decoration: InputDecoration(
                    hintText: conversation.humanTakeover
                        ? 'Répondre manuellement…'
                        : 'Répondre → vous prenez la main',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _sending ? null : _send,
                style: IconButton.styleFrom(backgroundColor: _agentGreen),
                icon: const Icon(Icons.send_rounded),
              ),
            ],
          ),
        ),
      ],
    );
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
  bool _asking = false;
  final _question = TextEditingController();
  String? _answer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _question.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await widget.repository.insights(widget.agent.id);
      if (mounted) setState(() => _data = data);
    } catch (_) {
      // The screen still shows stored agent counters when insight service fails.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _ask() async {
    final question = _question.text.trim();
    if (question.isEmpty) return;
    setState(() {
      _asking = true;
      _answer = null;
    });
    try {
      final answer = await widget.repository.askInsights(
        widget.agent.id,
        question,
      );
      if (mounted) setState(() => _answer = answer);
    } catch (error) {
      if (mounted) setState(() => _answer = _edgeDiagnostic('$error'));
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data ?? const <String, dynamic>{};
    final keywords = data['top_keywords'] is List
        ? data['top_keywords'] as List
        : const <dynamic>[];
    final products = data['top_products'] is List
        ? data['top_products'] as List
        : const <dynamic>[];
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Row(
            children: <Widget>[
              const Expanded(
                child: Text(
                  'Statistiques & insights',
                  style: TextStyle(
                    color: _agentInk,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
              ),
              IconButton(
                onPressed: _loading ? null : _load,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            )
          else ...<Widget>[
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 1.7,
              children: <Widget>[
                _Kpi(
                  value: '${data['total_conversations'] ?? 0}',
                  label: 'Conversations',
                ),
                _Kpi(
                  value:
                      '${data['total_messages'] ?? widget.agent.messagesHandled}',
                  label: 'Messages traités',
                ),
                _Kpi(
                  value: '${data['unique_contacts'] ?? 0}',
                  label: 'Contacts uniques',
                ),
                _Kpi(
                  value: '${data['total_handoffs'] ?? widget.agent.handoffs}',
                  label: 'Transferts humains',
                ),
              ],
            ),
            const SizedBox(height: 14),
            _InsightList(
              title: 'Mots-clés fréquents',
              icon: Icons.key_rounded,
              values: keywords,
            ),
            const SizedBox(height: 12),
            _InsightList(
              title: 'Produits les plus demandés',
              icon: Icons.shopping_bag_outlined,
              values: products,
            ),
            const SizedBox(height: 12),
            _InfoPanel(
              title: 'Interroger vos données',
              icon: Icons.auto_awesome_rounded,
              child: Column(
                children: <Widget>[
                  TextField(
                    controller: _question,
                    onSubmitted: (_) => _ask(),
                    decoration: const InputDecoration(
                      hintText: 'Ex. Quel produit est le plus demandé ?',
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _asking ? null : _ask,
                      style: FilledButton.styleFrom(
                        backgroundColor: _agentGreen,
                      ),
                      icon: _asking
                          ? const _TinyLoader()
                          : const Icon(Icons.insights_rounded),
                      label: const Text('Analyser'),
                    ),
                  ),
                  if (_answer != null) ...<Widget>[
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5FAF8),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _answer!,
                        style: const TextStyle(height: 1.35),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Text(
        title,
        style: const TextStyle(
          color: _agentInk,
          fontSize: 21,
          fontWeight: FontWeight.w900,
        ),
      ),
      const SizedBox(height: 4),
      Text(
        subtitle,
        style: const TextStyle(
          color: _agentMuted,
          fontSize: 12.5,
          height: 1.32,
        ),
      ),
    ],
  );
}

class _ChoiceCard extends StatelessWidget {
  const _ChoiceCard({
    required this.selected,
    required this.title,
    required this.onTap,
    this.emoji,
    this.icon,
    this.subtitle,
    this.compact = false,
  });

  final bool selected;
  final String title;
  final VoidCallback onTap;
  final String? emoji;
  final IconData? icon;
  final String? subtitle;
  final bool compact;

  @override
  Widget build(BuildContext context) => Material(
    color: selected ? const Color(0xFFEAF9F2) : Colors.white,
    borderRadius: BorderRadius.circular(16),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: EdgeInsets.all(compact ? 10 : 11),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? _agentBright : const Color(0xFFDCE8E2),
            width: selected ? 1.8 : 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            if (emoji != null)
              Text(emoji!, style: const TextStyle(fontSize: 19))
            else if (icon != null)
              Icon(
                icon,
                color: selected ? _agentGreen : const Color(0xFF62756D),
                size: 20,
              ),
            const SizedBox(width: 7),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Text(
                    title,
                    maxLines: compact ? 1 : 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _agentInk,
                      fontWeight: FontWeight.w900,
                      fontSize: 12.5,
                    ),
                  ),
                  if (subtitle != null) ...<Widget>[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _agentMuted,
                        fontSize: 10.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (selected)
              const Icon(
                Icons.check_circle_rounded,
                color: _agentGreen,
                size: 17,
              ),
          ],
        ),
      ),
    ),
  );
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
      color: color.withValues(alpha: .12),
      borderRadius: BorderRadius.circular(99),
    ),
    child: Text(
      label,
      style: TextStyle(
        color: color,
        fontSize: 10.5,
        fontWeight: FontWeight.w900,
      ),
    ),
  );
}

class _InlineHint extends StatelessWidget {
  const _InlineHint({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: const Color(0xFFF5FAF8),
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: Text(
      text,
      style: const TextStyle(color: _agentMuted, fontSize: 12.2, height: 1.32),
    ),
  );
}

class _EmptyAgents extends StatelessWidget {
  const _EmptyAgents({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: Column(
      children: <Widget>[
        Container(
          width: 58,
          height: 58,
          decoration: const BoxDecoration(
            color: Color(0xFFE6FAF0),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.smart_toy_rounded,
            color: _agentGreen,
            size: 29,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Votre premier Agent IA',
          style: TextStyle(
            color: _agentInk,
            fontWeight: FontWeight.w900,
            fontSize: 17,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'Il apprend vos produits, documents ou site web, puis répond sur WhatsApp.',
          textAlign: TextAlign.center,
          style: TextStyle(color: _agentMuted, fontSize: 12.5, height: 1.3),
        ),
        const SizedBox(height: 15),
        FilledButton.icon(
          onPressed: onCreate,
          style: FilledButton.styleFrom(backgroundColor: _agentBright),
          icon: const Icon(Icons.auto_awesome_rounded),
          label: const Text('Créer un Agent IA'),
        ),
      ],
    ),
  );
}

class _AgentVisualStatus {
  const _AgentVisualStatus({
    required this.label,
    required this.detail,
    required this.color,
  });

  final String label;
  final String detail;
  final Color color;
}

_AgentVisualStatus _agentVisualStatus(
  LiveWhatsAppAiAgent agent,
  List<LiveWhatsAppSession> sessions,
) {
  final technical = agent.wahaSessionName?.trim() ?? '';
  if (technical.isEmpty) {
    return _AgentVisualStatus(
      label: agent.isActive ? 'À relier' : 'Brouillon',
      detail: 'Aucune ligne WhatsApp associée',
      color: agent.isActive ? const Color(0xFFE8A121) : const Color(0xFF7D8C86),
    );
  }

  LiveWhatsAppSession? linked;
  for (final session in sessions) {
    if (session.name == technical) {
      linked = session;
      break;
    }
  }

  if (linked == null || !linked.isWorking) {
    return const _AgentVisualStatus(
      label: 'En attente',
      detail: 'Connexion WhatsApp à terminer',
      color: Color(0xFFE8A121),
    );
  }

  if (agent.isActive) {
    return _AgentVisualStatus(
      label: 'Actif',
      detail: 'Actif sur ${waouhIaSessionLabel(linked)}',
      color: const Color(0xFF159B65),
    );
  }

  return _AgentVisualStatus(
    label: _agentStatusLabel(agent.status),
    detail: 'Ligne prête : ${waouhIaSessionLabel(linked)}',
    color: const Color(0xFF2F6BFF),
  );
}

class _AgentCard extends StatelessWidget {
  const _AgentCard({
    required this.agent,
    required this.sessions,
    required this.onTap,
  });

  final LiveWhatsAppAiAgent agent;
  final List<LiveWhatsAppSession> sessions;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final visual = _agentVisualStatus(agent, sessions);
    final color = visual.color;
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
            border: Border.all(color: color.withValues(alpha: .28)),
          ),
          child: Column(
            children: <Widget>[
              Row(
                children: <Widget>[
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: .12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(_agentTypeIcon(agent.agentType), color: color),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          agent.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: _agentInk,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${agent.personaName} · ${_agentTypeLabel(agent.agentType)}',
                          style: const TextStyle(
                            color: _agentMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _Pill(label: visual.label, color: color),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      visual.detail,
                      style: const TextStyle(
                        color: Color(0xFF536A60),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: _agentMuted),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: <Widget>[
                  _MetricMini(
                    icon: Icons.chat_bubble_outline_rounded,
                    value: '${agent.messagesHandled}',
                    label: 'messages',
                  ),
                  const SizedBox(width: 16),
                  _MetricMini(
                    icon: Icons.person_outline_rounded,
                    value: '${agent.handoffs}',
                    label: 'handoffs',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DocumentTile extends StatelessWidget {
  const _DocumentTile({
    required this.document,
    required this.busy,
    required this.onDelete,
  });

  final LiveAgentDocument document;
  final bool busy;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.fromLTRB(11, 9, 6, 9),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: Row(
      children: <Widget>[
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: const Color(0xFFEAF9F2),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(
            Icons.description_outlined,
            color: _agentGreen,
            size: 19,
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                document.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12.5,
                ),
              ),
              Text(
                '${document.sizeLabel} · prêt pour indexation',
                style: const TextStyle(color: _agentMuted, fontSize: 11),
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: busy ? null : onDelete,
          icon: const Icon(Icons.close_rounded),
          color: const Color(0xFFD94747),
        ),
      ],
    ),
  );
}

class _ManualProductEditor extends StatefulWidget {
  const _ManualProductEditor({
    required this.product,
    required this.onChanged,
    required this.onDelete,
  });

  final LiveAgentProduct product;
  final ValueChanged<LiveAgentProduct> onChanged;
  final VoidCallback onDelete;

  @override
  State<_ManualProductEditor> createState() => _ManualProductEditorState();
}

class _ManualProductEditorState extends State<_ManualProductEditor> {
  late final TextEditingController _name = TextEditingController(
    text: widget.product.name,
  );
  late final TextEditingController _price = TextEditingController(
    text: widget.product.price?.toString() ?? '',
  );
  late final TextEditingController _description = TextEditingController(
    text: widget.product.description ?? '',
  );

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _description.dispose();
    super.dispose();
  }

  void _emit() => widget.onChanged(
    LiveAgentProduct(
      name: _name.text,
      price: int.tryParse(_price.text.replaceAll(RegExp(r'[^0-9]'), '')),
      description: _description.text,
    ),
  );

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: Column(
      children: <Widget>[
        Row(
          children: <Widget>[
            const Icon(
              Icons.inventory_2_outlined,
              color: _agentGreen,
              size: 18,
            ),
            const SizedBox(width: 7),
            const Expanded(
              child: Text(
                'Article manuel',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
            IconButton(
              onPressed: widget.onDelete,
              icon: const Icon(Icons.delete_outline_rounded),
              color: const Color(0xFFD94747),
            ),
          ],
        ),
        TextField(
          controller: _name,
          onChanged: (_) => _emit(),
          decoration: const InputDecoration(
            hintText: 'Nom du produit ou service',
          ),
        ),
        const SizedBox(height: 7),
        Row(
          children: <Widget>[
            SizedBox(
              width: 120,
              child: TextField(
                controller: _price,
                onChanged: (_) => _emit(),
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(hintText: 'Prix FCFA'),
              ),
            ),
            const SizedBox(width: 7),
            Expanded(
              child: TextField(
                controller: _description,
                onChanged: (_) => _emit(),
                decoration: const InputDecoration(
                  hintText: 'Description courte',
                ),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class _RecordingHint extends StatelessWidget {
  const _RecordingHint();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF2F2),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: const Color(0xFFF2C9C9)),
    ),
    child: const Row(
      children: <Widget>[
        Icon(Icons.mic_rounded, color: Color(0xFFD94747)),
        SizedBox(width: 8),
        Expanded(
          child: Text(
            'Enregistrement en cours… décrivez vos articles, prix et disponibilités.',
            style: TextStyle(
              color: Color(0xFF8A3D3D),
              fontWeight: FontWeight.w700,
              fontSize: 12.2,
            ),
          ),
        ),
      ],
    ),
  );
}

class _ImageSourceSheet extends StatelessWidget {
  const _ImageSourceSheet({required this.onCamera, required this.onGallery});

  final VoidCallback onCamera;
  final VoidCallback onGallery;

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 42,
            height: 5,
            decoration: BoxDecoration(
              color: const Color(0xFFD2E0DA),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Ajouter une photo de catalogue',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 14),
          _SheetAction(
            icon: Icons.camera_alt_outlined,
            title: 'Prendre une photo',
            subtitle: 'Capturez un menu, une liste de prix ou un catalogue.',
            onTap: onCamera,
          ),
          const SizedBox(height: 8),
          _SheetAction(
            icon: Icons.photo_library_outlined,
            title: 'Choisir dans la galerie',
            subtitle: 'Utilisez une image déjà enregistrée.',
            onTap: onGallery,
          ),
        ],
      ),
    ),
  );
}

class _SheetAction extends StatelessWidget {
  const _SheetAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDDEBE4)),
      ),
      child: Row(
        children: <Widget>[
          Icon(icon, color: _agentGreen),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(color: _agentMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: _agentMuted),
        ],
      ),
    ),
  );
}

class _PromptChip extends StatelessWidget {
  const _PromptChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ActionChip(
    label: Text(
      label,
      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
    ),
    onPressed: onTap,
    backgroundColor: const Color(0xFFF0F8F4),
    side: const BorderSide(color: Color(0xFFCBE8DA)),
  );
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
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: messages.isEmpty
        ? const Center(
            child: Text(
              'Commencez une conversation de test.',
              style: TextStyle(color: _agentMuted),
            ),
          )
        : ListView.builder(
            padding: const EdgeInsets.all(11),
            itemCount: messages.length + (busy ? 1 : 0),
            itemBuilder: (_, index) {
              if (index == messages.length) {
                return const Padding(
                  padding: EdgeInsets.all(8),
                  child: Text(
                    'L’Agent réfléchit…',
                    style: TextStyle(color: _agentMuted, fontSize: 12),
                  ),
                );
              }
              final item = messages[index];
              final fromUser = item.role == 'user';
              final operator = item.role == 'operator';
              return Align(
                alignment: fromUser
                    ? Alignment.centerLeft
                    : Alignment.centerRight,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 9,
                  ),
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
                        : null,
                  ),
                  child: Text(
                    item.content,
                    style: TextStyle(
                      color: fromUser || operator ? _agentInk : Colors.white,
                      height: 1.3,
                      fontSize: 13,
                    ),
                  ),
                ),
              );
            },
          ),
  );
}

class _EmptyDirect extends StatelessWidget {
  const _EmptyDirect();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(26),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: const Column(
      children: <Widget>[
        Icon(Icons.forum_outlined, color: _agentGreen, size: 34),
        SizedBox(height: 10),
        Text(
          'Aucune conversation en direct',
          style: TextStyle(color: _agentInk, fontWeight: FontWeight.w900),
        ),
        SizedBox(height: 5),
        Text(
          'Les messages apparaîtront ici quand l’Agent actif recevra une conversation WhatsApp.',
          textAlign: TextAlign.center,
          style: TextStyle(color: _agentMuted, fontSize: 12.5, height: 1.3),
        ),
      ],
    ),
  );
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({
    required this.conversation,
    required this.paused,
    required this.onTap,
  });

  final LiveAgentConversation conversation;
  final bool paused;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final last = conversation.messages.isEmpty
        ? null
        : conversation.messages.last;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(17),
          child: Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(17),
              border: Border.all(color: const Color(0xFFDDEBE4)),
            ),
            child: Row(
              children: <Widget>[
                Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEAF9F2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.person_outline_rounded,
                    color: _agentGreen,
                  ),
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
                              conversation.name ?? conversation.phone,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          if (conversation.needsHandoff)
                            const _Pill(label: 'SOS', color: Color(0xFFD94747)),
                          if (conversation.humanTakeover)
                            const Padding(
                              padding: EdgeInsets.only(left: 4),
                              child: _Pill(
                                label: 'MANUEL',
                                color: Color(0xFFE78A15),
                              ),
                            ),
                          if (paused)
                            const Padding(
                              padding: EdgeInsets.only(left: 4),
                              child: _Pill(
                                label: 'PAUSE',
                                color: Color(0xFF7D8C86),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${last?.role == 'user'
                            ? 'Client'
                            : last?.role == 'operator'
                            ? 'Vous'
                            : 'Agent'} · ${last?.content ?? 'Nouvelle conversation'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: _agentMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: _agentMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HandoffBanner extends StatelessWidget {
  const _HandoffBanner();

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(10),
    color: const Color(0xFFFFF4DF),
    child: const Row(
      children: <Widget>[
        Icon(Icons.priority_high_rounded, color: Color(0xFFB56A00)),
        SizedBox(width: 7),
        Expanded(
          child: Text(
            'Le client a demandé une intervention humaine.',
            style: TextStyle(
              color: Color(0xFF7B5312),
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    ),
  );
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
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        Text(
          value,
          style: const TextStyle(
            color: _agentGreen,
            fontSize: 23,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: _agentMuted,
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    ),
  );
}

class _InsightList extends StatelessWidget {
  const _InsightList({
    required this.title,
    required this.icon,
    required this.values,
  });

  final String title;
  final IconData icon;
  final List values;

  @override
  Widget build(BuildContext context) {
    final normalized = values
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    final max = normalized.fold<int>(
      1,
      (previous, item) =>
          previous > _asInt(item['count']) ? previous : _asInt(item['count']),
    );
    return _InfoPanel(
      title: title,
      icon: icon,
      child: normalized.isEmpty
          ? const Text(
              'Pas encore assez de données.',
              style: TextStyle(color: _agentMuted),
            )
          : Column(
              children: normalized.take(6).map((item) {
                final count = _asInt(item['count']);
                final label = '${item['word'] ?? item['name'] ?? '—'}';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 9),
                  child: Column(
                    children: <Widget>[
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: Text(
                              label,
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          Text(
                            '$count',
                            style: const TextStyle(
                              color: _agentMuted,
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      LinearProgressIndicator(
                        value: count / max,
                        minHeight: 6,
                        color: _agentGreen,
                        backgroundColor: const Color(0xFFE7F0EB),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }
}

class _InfoPanel extends StatelessWidget {
  const _InfoPanel({
    required this.title,
    required this.icon,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            Icon(icon, color: _agentGreen, size: 19),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                color: _agentInk,
                fontWeight: FontWeight.w900,
                fontSize: 15.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        child,
      ],
    ),
  );
}

class _MetricMini extends StatelessWidget {
  const _MetricMini({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    children: <Widget>[
      Icon(icon, color: _agentGreen, size: 15),
      const SizedBox(width: 4),
      Text(
        '$value $label',
        style: const TextStyle(
          color: _agentMuted,
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    ],
  );
}

class _AgentHero extends StatelessWidget {
  const _AgentHero({required this.agent});

  final LiveWhatsAppAiAgent agent;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(17),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: <Color>[Color(0xFF063F38), Color(0xFF0C6D5E)],
      ),
      borderRadius: BorderRadius.circular(22),
    ),
    child: Row(
      children: <Widget>[
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .14),
            borderRadius: BorderRadius.circular(17),
          ),
          child: const Icon(
            Icons.smart_toy_rounded,
            color: Color(0xFFB8FFE3),
            size: 30,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                agent.personaName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                agent.tone,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFFD5F8EA),
                  fontSize: 12.5,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 8),
              _Pill(
                label: _agentStatusLabel(agent.status),
                color: const Color(0xFFB8FFE3),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.draft,
    required this.tested,
    required this.linkedSession,
  });

  final LiveAgentDraft draft;
  final bool tested;
  final String? linkedSession;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(17),
      border: Border.all(color: const Color(0xFFDDEBE4)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Text(
          'Récapitulatif',
          style: TextStyle(
            color: _agentInk,
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 8),
        _line('Agent', draft.name),
        _line('Source', _agentTypeLabel(draft.agentType)),
        _line('Assistant', draft.personaName),
        if (draft.agentType == 'commerce')
          _line(
            'Catalogue',
            '${draft.selectedPartnerProductIds.length} partenaire(s) + ${draft.manualProducts.where((item) => item.name.trim().isNotEmpty).length} manuel(s)',
          ),
        if (draft.agentType == 'docs')
          _line('Documents', '${draft.documents.length} fichier(s)'),
        if (draft.agentType == 'website') _line('Site', draft.websiteUrl),
        _line('Test', tested ? 'Validé' : 'À effectuer'),
        _line('Session', linkedSession ?? 'Brouillon'),
      ],
    ),
  );

  Widget _line(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Text(
      '• $label : $value',
      style: const TextStyle(color: Color(0xFF536A60), fontSize: 12.5),
    ),
  );
}

class _TinyLoader extends StatelessWidget {
  const _TinyLoader();

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 17,
    height: 17,
    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
  );
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

String _extension(String name) {
  final bits = name.toLowerCase().split('.');
  return bits.length < 2 ? '' : bits.last;
}

String _documentMime(String extension) => switch (extension) {
  'pdf' => 'application/pdf',
  'docx' =>
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'txt' => 'text/plain',
  'md' => 'text/markdown',
  _ => 'application/octet-stream',
};

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
    : 'Catalogue';

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
    'Q: Quels produits proposez-vous ?\nR: Je peux vous présenter les produits disponibles et vous accompagner dans votre choix.',
};

String _edgeDiagnostic(String raw) {
  final lower = raw.toLowerCase();
  if (lower.contains('ai_provider_missing') ||
      lower.contains('gemini_api_key') ||
      lower.contains('google_api_key') ||
      lower.contains('gemini')) {
    return 'Le moteur IA Gemini ne répond pas pour le moment. Réessayez dans quelques instants.';
  }
  if (lower.contains('function_not_deployed') ||
      lower.contains('failed to send a request') ||
      lower.contains('function not found')) {
    return 'Le service Agent IA doit être finalisé côté serveur. Réessayez après la synchronisation.';
  }
  if (lower.contains('unauthorized') ||
      lower.contains('401') ||
      lower.contains('token')) {
    return 'Votre session n’est plus autorisée. Reconnectez-vous puis réessayez.';
  }
  if (lower.contains('timeout')) {
    return 'Le moteur IA a dépassé le délai de réponse. Réessayez dans quelques instants.';
  }
  if (lower.contains('provider') ||
      lower.contains('embedding') ||
      lower.contains('transcription')) {
    return 'Le moteur IA ne répond pas correctement pour le moment. Réessayez dans quelques instants.';
  }
  return raw.replaceFirst('LiveWhatsAppIaException: ', '');
}
