import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_model.dart';
import 'core/media_service.dart';
import 'domain/status_models.dart';

class StatusModel extends ChangeNotifier {
  StatusModel(this.auth, this.media, this.client);
  final AuthModel auth;
  final MediaService media;
  final SupabaseClient client;
  bool busy = false;

  Stream<List<WaouhStatus>> stream() => client
      .from('waouh_statuses')
      .stream(primaryKey: ['id'])
      .order('created_at', ascending: false)
      .map((rows) => rows
          .map((row) => WaouhStatus.fromJson(Map<String, dynamic>.from(row)))
          .where((item) => item.active)
          .toList());

  Future<void> publish({
    required String type,
    required String title,
    String caption = '',
    num? price,
    String location = '',
    List<XFile> images = const [],
  }) async {
    if (!auth.signedIn) throw StateError('Connexion requise.');
    busy = true; notifyListeners();
    try {
      final urls = <String>[];
      for (final image in images.take(2)) {
        final item = await media.uploadImage(
          image: image,
          folder: auth.user!.id,
          identity: auth.user!.id,
          bucket: 'waouh-statuses',
        );
        urls.add(item.url);
      }
      await client.functions.invoke('waouh-status-publish', body: {
        'type': type,
        'title': title.trim(),
        'caption': caption.trim().isEmpty ? null : caption.trim(),
        'price_fcfa': price,
        'location': location.trim().isEmpty ? null : location.trim(),
        'media_urls': urls,
        'media_kind': urls.isEmpty ? null : 'image',
        'author_name': auth.user!.userMetadata?['full_name'] ?? auth.user!.email,
      });
    } finally { busy = false; notifyListeners(); }
  }
}
