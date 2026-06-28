import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_media.dart';
import 'live_models.dart';

class LiveStatusService {
  const LiveStatusService(this.client, this.media);

  final SupabaseClient client;
  final LiveMediaService media;

  Future<List<LiveStatus>> load({String? type}) async {
    final rows = await client
        .from('waouh_statuses')
        .select('id,type,title,caption,price_fcfa,location,lat,lng,media_url,media_urls,author_name,author_avatar_url,article_id,views_count,created_at,expires_at')
        .gt('expires_at', DateTime.now().toUtc().toIso8601String())
        .order('created_at', ascending: false)
        .limit(100);
    return (rows as List)
        .map((raw) => LiveStatus.fromJson(Map<String, dynamic>.from(raw as Map)))
        .where((status) => status.active && (type == null || status.type == type))
        .toList();
  }

  Future<void> publish({
    required String type,
    required String title,
    required String caption,
    required num? price,
    required String location,
    required double? latitude,
    required double? longitude,
    required String userId,
    required String? authorName,
    required String? authorAvatarUrl,
    required List<XFile> photos,
  }) async {
    if (title.trim().isEmpty) throw StateError('Le titre est obligatoire.');
    final urls = <String>[];
    for (final photo in photos.take(2)) {
      final uploaded = await media.uploadImage(
        file: photo,
        bucket: 'waouh-statuses',
        folder: userId,
      );
      urls.add(uploaded.url);
    }
    final response = await client.functions.invoke('waouh-status-publish', body: {
      'type': type,
      'title': title.trim(),
      'caption': caption.trim().isEmpty ? null : caption.trim(),
      'price_fcfa': price,
      'location': location.trim().isEmpty ? null : location.trim(),
      'lat': latitude,
      'lng': longitude,
      'media_urls': urls,
      'media_kind': urls.isEmpty ? null : 'image',
      'author_name': authorName,
      'author_avatar_url': authorAvatarUrl,
      'waouh_code': null,
      'source': 'flutter_native',
    });
    final data = response.data;
    if (data is Map && data['error'] != null) {
      throw StateError(liveText(data['error'], 'Publication impossible'));
    }
  }
}
