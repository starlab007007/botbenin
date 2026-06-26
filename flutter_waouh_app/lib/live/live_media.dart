import 'dart:math';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_models.dart';

class LiveMediaService {
  const LiveMediaService(this.client);

  final SupabaseClient client;

  Future<LiveAttachment> uploadImage({
    required XFile file,
    required String bucket,
    required String folder,
  }) async {
    final bytes = await file.readAsBytes();
    if (bytes.isEmpty) throw StateError('Le fichier image est vide.');
    if (bytes.lengthInBytes > 5 * 1024 * 1024) {
      throw StateError('Chaque image doit faire au maximum 5 Mo.');
    }
    final pieces = file.name.toLowerCase().split('.');
    final extension = pieces.length > 1 ? pieces.last : 'jpg';
    if (!const {'jpg', 'jpeg', 'png', 'webp'}.contains(extension)) {
      throw StateError('Formats acceptes : JPG, PNG ou WebP.');
    }
    final contentType = switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => 'image/jpeg',
    };
    final nonce = Random.secure().nextInt(0x7fffffff).toRadixString(36);
    final path = '$folder/${DateTime.now().microsecondsSinceEpoch}_$nonce.$extension';
    await client.storage.from(bucket).uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(contentType: contentType, upsert: false),
        );
    return LiveAttachment(
      url: client.storage.from(bucket).getPublicUrl(path),
      type: contentType,
    );
  }
}
