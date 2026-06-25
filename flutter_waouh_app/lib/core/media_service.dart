import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_config.dart';

class MediaAttachment {
  const MediaAttachment({required this.url, required this.type});

  final String url;
  final String type;

  Map<String, dynamic> toJson() => {'url': url, 'type': type};
}

class MediaService {
  MediaService(this._client);

  final SupabaseClient _client;

  Future<MediaAttachment> uploadImage({
    required XFile image,
    required String folder,
    required String identity,
    String bucket = AppConfig.mediaBucket,
  }) async {
    final bytes = await image.readAsBytes();
    _validateImage(image, bytes);
    final extension = _extension(image.name);
    final mime = _mimeFor(extension);
    final fileName = '${DateTime.now().microsecondsSinceEpoch}_${identity.hashCode.abs()}.$extension';
    final path = '$folder/$identity/$fileName';

    await _client.storage.from(bucket).uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(contentType: mime, upsert: false),
        );
    final publicUrl = _client.storage.from(bucket).getPublicUrl(path);
    return MediaAttachment(url: publicUrl, type: mime);
  }

  void _validateImage(XFile image, Uint8List bytes) {
    if (bytes.isEmpty) throw StateError('Le fichier image est vide.');
    if (bytes.lengthInBytes > AppConfig.maxImageBytes) {
      throw StateError('Chaque image doit faire au maximum 5 Mo.');
    }
    final extension = _extension(image.name);
    if (!const {'jpg', 'jpeg', 'png', 'webp'}.contains(extension)) {
      throw StateError('Formats acceptes : JPG, PNG ou WebP.');
    }
  }

  String _extension(String name) {
    final parts = name.toLowerCase().split('.');
    return parts.length > 1 ? parts.last : 'jpg';
  }

  String _mimeFor(String extension) => switch (extension) {
        'png' => 'image/png',
        'webp' => 'image/webp',
        _ => 'image/jpeg',
      };
}
