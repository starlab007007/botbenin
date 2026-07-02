import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_agent_ia_models.dart';

class LiveAgentIaService {
  const LiveAgentIaService(this.client);
  final SupabaseClient client;

  User get user {
    final current = client.auth.currentUser;
    if (current == null) throw const LiveAgentException('Connectez-vous pour gérer vos Agents IA.');
    return current;
  }

  Future<List<LiveAiAgent>> listAgents() async {
    final rows = await client
        .from('waouh_ai_agents')
        .select('id,name,agent_type,status,sector,persona,capabilities,stats,waha_session_name,website_url,created_at')
        .eq('user_id', user.id)
        .order('created_at', ascending: false);
    return (rows as List)
        .whereType<Map>()
        .map((row) => LiveAiAgent.fromJson(Map<String, Object?>.from(row)))
        .toList();
  }

  Future<LiveAiAgent> create({
    required String name,
    required LiveAgentType type,
    required String sector,
    required String assistantName,
    required String tone,
    required bool emojis,
    required Map<String, bool> capabilities,
    String? websiteUrl,
  }) async {
    if (name.trim().isEmpty) throw const LiveAgentException('Le nom de l’agent est requis.');
    final row = await client.from('waouh_ai_agents').insert({
      'user_id': user.id,
      'name': name.trim(),
      'sector': sector.trim().isEmpty ? 'other' : sector.trim(),
      'agent_type': type.value,
      'website_url': type == LiveAgentType.website ? websiteUrl?.trim() : null,
      'persona': {'name': assistantName.trim(), 'tone': tone.trim(), 'emojis': emojis},
      'capabilities': capabilities,
      'status': 'testing',
    }).select('id,name,agent_type,status,sector,persona,capabilities,stats,waha_session_name,website_url').single();
    return LiveAiAgent.fromJson(Map<String, Object?>.from(row));
  }

  Future<void> setStatus(String id, String status) async {
    await client.from('waouh_ai_agents').update({'status': status}).eq('id', id).eq('user_id', user.id);
  }

  Future<void> deploy(String id, String? sessionName) async {
    await client.from('waouh_ai_agents').update({
      'waha_session_name': sessionName?.trim().isEmpty == false ? sessionName!.trim() : null,
      'status': sessionName?.trim().isEmpty == false ? 'active' : 'draft',
    }).eq('id', id).eq('user_id', user.id);
  }

  Future<void> delete(String id) async {
    await client.from('waouh_ai_agents').delete().eq('id', id).eq('user_id', user.id);
  }

  Future<String> test(String agentId, String message, List<Map<String, String>> history) async {
    final response = await client.functions.invoke('waouh-agent-chat', body: {
      'agent_id': agentId,
      'message': message.trim(),
      'history': history,
      'persist': false,
    });
    final data = response.data is Map ? Map<String, Object?>.from(response.data as Map) : const <String, Object?>{};
    if (data['error'] != null) throw LiveAgentException('${data['error']}');
    return '${data['reply'] ?? 'Aucune réponse produite.'}';
  }
}
