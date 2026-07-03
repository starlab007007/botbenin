import 'dart:convert';
import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_agent_models.dart';
import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppAiAgentRepository {
  LiveWhatsAppAiAgentRepository(this.client);

  final SupabaseClient client;

  User get _user {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const LiveWhatsAppIaException('Connectez-vous avant de gérer vos Agents IA.');
    }
    return user;
  }

  Future<List<LiveWhatsAppAiAgent>> listAgents() async {
    final rows = await client
        .from('waouh_ai_agents')
        .select()
        .eq('user_id', _user.id)
        .order('updated_at', ascending: false);
    return (rows as List)
        .whereType<Map>()
        .map((item) => LiveWhatsAppAiAgent.fromJson(
            Map<String, dynamic>.from(item)))
        .where((item) => item.id.isNotEmpty)
        .toList();
  }

  Future<List<LiveAgentProduct>> listPartnerProducts() async {
    final rows = await client
        .from('waouh_partner_products')
        .select('id,nom,description,prix_min,disponible,business_id')
        .order('nom')
        .limit(40);
    return (rows as List)
        .whereType<Map>()
        .map((item) =>
            LiveAgentProduct.partner(Map<String, dynamic>.from(item)))
        .where((item) => item.id != null && item.name.trim().isNotEmpty)
        .toList();
  }

  Future<LiveAgentDocument> uploadDocument({
    required String name,
    required Uint8List bytes,
  }) async {
    final extension = _extension(name);
    if (!const <String>{'pdf', 'docx', 'txt', 'md'}.contains(extension)) {
      throw const LiveWhatsAppIaException(
        'Format non pris en charge. Utilisez PDF, Word, TXT ou MD.',
      );
    }
    if (bytes.isEmpty) {
      throw const LiveWhatsAppIaException('Le document sélectionné est vide.');
    }
    if (bytes.lengthInBytes > 20 * 1024 * 1024) {
      throw const LiveWhatsAppIaException('Le document dépasse 20 Mo.');
    }
    final safeName = name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final path = '${_user.id}/draft/${DateTime.now().millisecondsSinceEpoch}_$safeName';
    await client.storage.from('agent-documents').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            contentType: _documentMime(extension),
            upsert: false,
          ),
        );
    return LiveAgentDocument(
      name: name,
      storagePath: path,
      sizeBytes: bytes.lengthInBytes,
    );
  }

  Future<void> deleteDocument(LiveAgentDocument document) =>
      client.storage.from('agent-documents').remove(<String>[document.storagePath]);

  Future<LiveWhatsAppAiAgent> createTestingDraft(LiveAgentDraft draft) async {
    final name = draft.name.trim();
    if (name.isEmpty) {
      throw const LiveWhatsAppIaException('Indiquez le nom de l’activité.');
    }
    final inserted = await client
        .from('waouh_ai_agents')
        .insert(<String, dynamic>{
          'user_id': _user.id,
          'name': name,
          'sector': draft.sector,
          'agent_type': draft.agentType,
          'persona': <String, dynamic>{
            'name': draft.personaName.trim().isEmpty
                ? 'Assistant'
                : draft.personaName.trim(),
            'tone': draft.tone.trim().isEmpty
                ? 'professionnel'
                : draft.tone.trim(),
            'emojis': draft.emojis,
          },
          'capabilities': draft.capabilities,
          'knowledge_sources': <dynamic>[],
          'status': 'testing',
        })
        .select()
        .single();
    final agent = LiveWhatsAppAiAgent.fromJson(
      Map<String, dynamic>.from(inserted),
    );

    try {
      await _saveSources(agent, draft);
    } catch (_) {
      await client
          .from('waouh_ai_agents')
          .update(<String, dynamic>{'status': 'draft'}).eq('id', agent.id);
      rethrow;
    }
    return agent;
  }

  Future<void> _saveSources(
    LiveWhatsAppAiAgent agent,
    LiveAgentDraft draft,
  ) async {
    if (draft.selectedPartnerProductIds.isNotEmpty) {
      await client.from('waouh_ai_agent_partner_products').upsert(
            draft.selectedPartnerProductIds
                .map((productId) => <String, dynamic>{
                      'agent_id': agent.id,
                      'product_id': productId,
                      'user_id': _user.id,
                    })
                .toList(),
            onConflict: 'agent_id,product_id',
          );
    }

    final manual = draft.manualProducts
        .where((item) => item.name.trim().isNotEmpty)
        .toList();
    if (manual.isNotEmpty) {
      await client.from('waouh_ai_agent_products').insert(
            manual.asMap().entries.map((entry) => <String, dynamic>{
                  'agent_id': agent.id,
                  'user_id': _user.id,
                  'name': entry.value.name.trim(),
                  'price_fcfa': entry.value.price,
                  'description': entry.value.description?.trim(),
                  'position': entry.key,
                  'active': true,
                }).toList(),
          );
    }

    for (final document in draft.documents) {
      await _invoke('waouh-agent-ingest', <String, dynamic>{
        'agent_id': agent.id,
        'source_type': 'document',
        'storage_path': document.storagePath,
        'filename': document.name,
      });
    }
    if (draft.websiteUrl.trim().isNotEmpty) {
      await _invoke('waouh-agent-ingest', <String, dynamic>{
        'agent_id': agent.id,
        'source_type': 'website',
        'url': draft.websiteUrl.trim(),
        'crawl': draft.crawlSite,
      });
      await client.from('waouh_ai_agents').update(<String, dynamic>{
        'website_url': draft.websiteUrl.trim(),
      }).eq('id', agent.id);
    }
    if (draft.notes.trim().isNotEmpty) {
      await _invoke('waouh-agent-ingest', <String, dynamic>{
        'agent_id': agent.id,
        'source_type': 'notes',
        'text': draft.notes.trim(),
      });
    }
    if (draft.notesUrl.trim().isNotEmpty) {
      await _invoke('waouh-agent-ingest', <String, dynamic>{
        'agent_id': agent.id,
        'source_type': 'url',
        'url': draft.notesUrl.trim(),
      });
    }
  }

  Future<String> sandbox({
    required LiveWhatsAppAiAgent agent,
    required String message,
    List<LiveAgentMessage> history = const <LiveAgentMessage>[],
  }) async {
    final response = await _invoke('waouh-agent-chat', <String, dynamic>{
      'agent_id': agent.id,
      'message': message.trim(),
      'history': history.map((item) => item.toJson()).toList(),
      'persist': false,
    });
    final reply = '${response['reply'] ?? ''}'.trim();
    if (reply.isEmpty) {
      throw const LiveWhatsAppIaException('L’Agent IA n’a pas renvoyé de réponse.');
    }
    return reply;
  }

  Future<void> deploy({
    required LiveWhatsAppAiAgent agent,
    required String sessionName,
  }) async {
    final conflicts = await client
        .from('waouh_ai_agents')
        .select('id,name')
        .eq('user_id', _user.id)
        .eq('waha_session_name', sessionName)
        .eq('status', 'active')
        .neq('id', agent.id)
        .limit(1);
    if ((conflicts as List).isNotEmpty) {
      final existing = Map<String, dynamic>.from(conflicts.first as Map);
      throw LiveWhatsAppIaException(
        'La ligne est déjà liée à « ${existing['name'] ?? 'un autre Agent IA'} ».',
      );
    }
    await client.from('waouh_ai_agents').update(<String, dynamic>{
      'waha_session_name': sessionName,
      'status': 'active',
    }).eq('id', agent.id);
    await _invoke('waha-session-mobile', <String, dynamic>{
      'action': 'attach_ai',
      'sessionName': sessionName,
    });
  }

  Future<void> setStatus(LiveWhatsAppAiAgent agent, String status) =>
      client
          .from('waouh_ai_agents')
          .update(<String, dynamic>{'status': status})
          .eq('id', agent.id);

  Future<List<LiveAgentConversation>> conversations(String agentId) async {
    final rows = await client
        .from('waouh_ai_agent_conversations')
        .select('id,agent_id,wa_contact_phone,wa_contact_name,messages,last_activity,human_takeover,needs_handoff')
        .eq('agent_id', agentId)
        .order('last_activity', ascending: false)
        .limit(50);
    return (rows as List)
        .whereType<Map>()
        .map((item) => LiveAgentConversation.fromJson(
            Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<void> manual({
    required LiveWhatsAppAiAgent agent,
    required String phone,
    String? message,
    String? mode,
  }) =>
      _invoke('waouh-agent-manual-reply', <String, dynamic>{
        'agent_id': agent.id,
        'contact_phone': phone,
        if (message != null && message.trim().isNotEmpty)
          'message': message.trim(),
        if (mode != null) 'mode': mode,
      });

  Future<Map<String, dynamic>> insights(String agentId) =>
      _invoke('waouh-agent-insights', <String, dynamic>{
        'agent_id': agentId,
        'mode': 'overview',
      });

  Future<String> askInsights(String agentId, String question) async {
    final response = await _invoke('waouh-agent-insights', <String, dynamic>{
      'agent_id': agentId,
      'mode': 'query',
      'question': question.trim(),
    });
    return '${response['answer'] ?? 'Aucune réponse disponible.'}';
  }

  Future<List<LiveAgentProduct>> parseProductImage(XFile image) async {
    final bytes = await image.readAsBytes();
    return _parseCatalog(<String, dynamic>{
      'mode': 'image',
      'image_base64': base64Encode(bytes),
      'image_mime': image.mimeType ?? 'image/jpeg',
    });
  }

  Future<List<LiveAgentProduct>> parseCatalogText(String transcript) =>
      _parseCatalog(<String, dynamic>{
        'mode': 'text',
        'text': transcript,
      });

  Future<List<LiveAgentProduct>> _parseCatalog(
    Map<String, dynamic> body,
  ) async {
    final response = await _invoke('waouh-agent-parse-catalog', body);
    final items = response['products'] is List
        ? response['products'] as List
        : const <dynamic>[];
    return items.whereType<Map>().map((item) {
      final row = Map<String, dynamic>.from(item);
      return LiveAgentProduct(
        name: '${row['name'] ?? ''}',
        price: _asNullableInt(row['price_fcfa']),
        description: _cleanNullable(row['description']),
      );
    }).where((item) => item.name.trim().isNotEmpty).toList();
  }

  Future<Map<String, dynamic>> _invoke(
    String functionName,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await client.functions.invoke(functionName, body: body);
      if (response.data is Map) {
        final map = Map<String, dynamic>.from(response.data as Map);
        final error = '${map['error'] ?? ''}'.trim();
        if (error.isNotEmpty) {
          throw LiveWhatsAppIaException(_edgeDiagnostic(
            '${map['code'] ?? ''} $error',
          ));
        }
        return map;
      }
      throw const LiveWhatsAppIaException('Réponse Supabase inattendue.');
    } on FunctionException catch (error) {
      throw LiveWhatsAppIaException(
        _edgeDiagnostic(error.details?.toString() ?? error.toString()),
      );
    }
  }

  String _extension(String name) =>
      name.contains('.') ? name.split('.').last.toLowerCase() : '';

  String _documentMime(String extension) {
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'md':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  }
}

String _edgeDiagnostic(String raw) {
  final text = raw.trim();
  final lower = text.toLowerCase();
  if (lower.contains('ai_key_missing') || lower.contains('lovable_api_key')) {
    return 'Le service IA doit être configuré dans les secrets Supabase.';
  }
  if (lower.contains('unauthorized') || lower.contains('token')) {
    return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
  }
  if (lower.contains('agent_not_found')) {
    return 'Cet Agent IA est introuvable ou non accessible.';
  }
  if (lower.contains('knowledge_index_failed')) {
    return 'La source est enregistrée, mais son indexation IA a échoué.';
  }
  if (lower.contains('ai_provider_error')) {
    return 'Le fournisseur IA est temporairement indisponible. Réessayez.';
  }
  return text.replaceFirst('LiveWhatsAppIaException: ', '');
}

int? _asNullableInt(dynamic value) {
  if (value == null) return null;
  return value is int ? value : int.tryParse('$value');
}

String? _cleanNullable(dynamic value) {
  final text = '$value'.trim();
  return text.isEmpty || text == 'null' ? null : text;
}
