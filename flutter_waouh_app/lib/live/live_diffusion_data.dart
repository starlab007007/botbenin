import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_diffusion_models.dart';

class LiveDiffusionData {
  const LiveDiffusionData(this.client);
  final SupabaseClient client;

  String get userId {
    final value = client.auth.currentUser?.id;
    if (value == null || value.isEmpty) throw StateError('Connexion requise.');
    return value;
  }

  Future<List<LiveDiffusionCampaign>> campaigns() async {
    final rows = await client.from('wa_campaigns').select().eq('user_id', userId).order('created_at', ascending: false).limit(100);
    return (rows as List).map((raw) => LiveDiffusionCampaign.fromJson(Map<String, dynamic>.from(raw as Map))).toList();
  }

  Future<List<LiveDiffusionContact>> contacts({bool archived = false}) async {
    final rows = await client.from('wa_contacts').select().eq('user_id', userId).eq('archived', archived).order('created_at', ascending: false).limit(1000);
    return (rows as List).map((raw) => LiveDiffusionContact.fromJson(Map<String, dynamic>.from(raw as Map))).toList();
  }

  Future<List<LiveDiffusionList>> lists() async {
    final rows = await client.from('wa_contact_lists').select('id,name,description,color').eq('user_id', userId).order('created_at', ascending: false);
    return (rows as List).map((raw) => LiveDiffusionList.fromJson(Map<String, dynamic>.from(raw as Map))).toList();
  }

  Future<List<LiveDiffusionSession>> sessions() async {
    final rows = await client.from('whatsapp_accounts').select('id,session_name,phone_number,status,qr_code').eq('user_id', userId).order('created_at', ascending: false);
    return (rows as List).map((raw) => LiveDiffusionSession.fromJson(Map<String, dynamic>.from(raw as Map))).toList();
  }

  Future<List<LiveDiffusionApproval>> approvals() async {
    try {
      final rows = await client.from('waouh_diffusion_approvals').select('id,campaign_id,status,quota_requested,audience_snapshot,message_template,created_at').eq('requested_by', userId).order('created_at', ascending: false).limit(50);
      return (rows as List).map((raw) => LiveDiffusionApproval.fromJson(Map<String, dynamic>.from(raw as Map))).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<List<LiveAiDiffusionRequest>> aiRequests() async {
    try {
      final payload = await invokeJson('waouh-diffusion-my-requests', const {});
      final rawRequests = payload['requests'];
      if (rawRequests is List) {
        return rawRequests.whereType<Map>().map((item) => LiveAiDiffusionRequest.fromJson(Map<String, dynamic>.from(item))).toList();
      }
    } catch (_) {
      // A compact fallback keeps pending requests visible while the optional
      // tracking function is being deployed.
    }
    final rows = await client
        .from('waouh_diffusion_approvals')
        .select('id,campaign_id,status,quota_requested,quota_approved,audience_snapshot,audience_filters,message_template,media_url,reason,created_at')
        .eq('requested_by', userId)
        .order('created_at', ascending: false)
        .limit(100);
    return (rows as List).map((item) => LiveAiDiffusionRequest.fromJson(Map<String, dynamic>.from(item as Map))).toList();
  }

  Future<LiveAiDiffusionRequest> submitAiRequest({
    required String name,
    required String messageTemplate,
    required Map<String, dynamic> filters,
    required int quotaRequested,
    required LiveDiffusionAudiencePreview audience,
    String? mediaUrl,
  }) async {
    final payload = await invokeJson('waouh-diffusion-submit', {
      'name': name.trim().isEmpty ? 'Diffusion IA' : name.trim(),
      'message_template': messageTemplate.trim(),
      'media_url': mediaUrl?.trim().isEmpty == true ? null : mediaUrl?.trim(),
      'filters': filters,
      'quota_requested': quotaRequested,
      'audience_snapshot': {
        'total': audience.total,
        'breakdown': audience.breakdown,
      },
    });
    return LiveAiDiffusionRequest(
      id: '${payload['approval_id'] ?? ''}',
      campaignId: payload['campaign_id']?.toString(),
      campaignName: name.trim().isEmpty ? 'Diffusion IA' : name.trim(),
      status: 'pending',
      createdAt: DateTime.now(),
      messageTemplate: messageTemplate.trim(),
      quotaRequested: quotaRequested,
      audienceTotal: audience.total,
      mediaUrl: mediaUrl,
      filters: filters,
      breakdown: audience.breakdown,
    );
  }

  Future<void> cancelAiRequest(String approvalId) async {
    await invokeJson('waouh-diffusion-cancel', {'approval_id': approvalId});
  }

  Future<void> addContact(String phone, {String? name}) async {
    final number = liveDiffusionPhone(phone);
    if (number.isEmpty) throw StateError('Numéro invalide.');
    final local = number.replaceAll('+229', '');
    await client.from('wa_contacts').insert({
      'user_id': userId,
      'phone_e164': number,
      'phone_8': local.length == 8 ? number : null,
      'phone_10': local.length == 10 ? number : null,
      'display_name': name?.trim().isEmpty == true ? null : name?.trim(),
      'source': 'flutter_native',
    });
  }

  Future<void> updateContact(String id, {bool? optOut, bool? archived}) async {
    await client.from('wa_contacts').update({
      if (optOut != null) 'opt_out': optOut,
      if (archived != null) 'archived': archived,
    }).eq('id', id).eq('user_id', userId);
  }

  Future<void> deleteContact(String id) async {
    await client.from('wa_contacts').delete().eq('id', id).eq('user_id', userId);
  }

  Future<void> createList(String name) async {
    await client.from('wa_contact_lists').insert({'user_id': userId, 'name': name.trim()});
  }

  Future<void> addToList(String listId, List<String> ids) async {
    if (ids.isEmpty) return;
    await client.from('wa_contact_list_members').upsert(ids.map((id) => {'list_id': listId, 'contact_id': id}).toList(), onConflict: 'list_id,contact_id');
  }

  Future<LiveDiffusionCampaign> saveCampaign(Map<String, dynamic> values, {String? id}) async {
    final payload = <String, dynamic>{...values};
    final dynamic row = id == null
        ? await client.from('wa_campaigns').insert({...payload, 'user_id': userId}).select().single()
        : await client.from('wa_campaigns').update(payload).eq('id', id).eq('user_id', userId).select().single();
    return LiveDiffusionCampaign.fromJson(Map<String, dynamic>.from(row as Map));
  }

  Future<Map<String, dynamic>> invokeJson(String name, Map<String, dynamic> body) async {
    final result = await client.functions.invoke(name, body: body);
    final raw = result.data;
    if (raw is! Map) throw StateError('Réponse serveur invalide.');
    final data = Map<String, dynamic>.from(raw);
    if (data['ok'] == false) throw StateError('${data['error'] ?? 'Opération impossible'}');
    return data;
  }

  Future<void> invoke(String name, Map<String, dynamic> body) async {
    await invokeJson(name, body);
  }

  Future<LiveDiffusionAudiencePreview> preview(Map<String, dynamic> filters) async {
    final payload = await invokeJson('waouh-diffusion-audience', filters);
    return LiveDiffusionAudiencePreview.fromJson(payload);
  }

  Future<void> submitApproval(Map<String, dynamic> body) async {
    await invokeJson('waouh-diffusion-submit', body);
  }
}
