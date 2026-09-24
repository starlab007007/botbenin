import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_agent_insights_models.dart';

class WaouhAgentInsightsRepository {
  const WaouhAgentInsightsRepository(this.client);

  final SupabaseClient client;

  Future<WaouhAgentInsights> loadOverview(String agentId) async {
    final data = await _invoke('waouh-agent-insights', {
      'agent_id': agentId,
      'mode': 'overview',
    });
    return WaouhAgentInsights.fromJson(data);
  }

  Future<String> ask(String agentId, String question) async {
    final clean = question.trim();
    if (clean.isEmpty)
      throw ArgumentError.value(question, 'question', 'Question obligatoire');
    final data = await _invoke('waouh-agent-insights', {
      'agent_id': agentId,
      'mode': 'query',
      'question': clean,
    });
    final answer = '${data['answer'] ?? ''}'.trim();
    if (answer.isEmpty) throw StateError('Aucune réponse analytique reçue.');
    return answer;
  }

  Future<Map<String, dynamic>> _invoke(
    String name,
    Map<String, dynamic> body,
  ) async {
    final response = await client.functions.invoke(name, body: body);
    final raw = response.data;
    if (raw is! Map) throw StateError('Réponse $name invalide.');
    final data = Map<String, dynamic>.from(raw);
    final error = '${data['error'] ?? ''}'.trim();
    if (error.isNotEmpty) throw StateError(error);
    return data;
  }
}
