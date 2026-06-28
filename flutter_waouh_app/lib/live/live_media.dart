import 'dart:io';
import 'dart:math';

import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_models.dart';

class LiveMediaService {
  const LiveMediaService(this.client);

  final SupabaseClient client;

  Future<LiveAttachment> prepareImage({
    required XFile file,
    required String bucket,
    required String folder,
    required bool online,
  }) async {
    if (online) return uploadImage(file: file, bucket: bucket, folder: folder);
    final bytes = await file.readAsBytes();
    final details = _validate(file.name, bytes.lengthInBytes);
    final directory = await getApplicationDocumentsDirectory();
    final queueDir = Directory('${directory.path}/waouh_outbox/$folder');
    await queueDir.create(recursive: true);
    final local = File('${queueDir.path}/${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1 << 20)}.${details.extension}');
    await local.writeAsBytes(bytes, flush: true);
    return LiveAttachment(url: Uri.file(local.path).toString(), type: details.contentType);
  }

  Future<LiveAttachment> resolveAttachment({
    required LiveAttachment attachment,
    required String bucket,
    required String folder,
  }) async {
    if (!attachment.url.startsWith('file:')) return attachment;
    final local = File(Uri.parse(attachment.url).toFilePath());
    if (!await local.exists()) throw StateError('Une image en attente est introuvable. Ajoutez-la de nouveau.');
    final file = XFile(local.path, name: local.uri.pathSegments.last);
    return uploadImage(file: file, bucket: bucket, folder: folder);
  }

  Future<List<String>> persistFiles(List<XFile> files, {required String folder}) async {
    final directory = await getApplicationDocumentsDirectory();
    final queueDir = Directory('${directory.path}/waouh_outbox/$folder');
    await queueDir.create(recursive: true);
    final paths = <String>[];
    for (final file in files) {
      final bytes = await file.readAsBytes();
      final details = _validate(file.name, bytes.lengthInBytes);
      final target = File('${queueDir.path}/${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1 << 20)}.${details.extension}');
      await target.writeAsBytes(bytes, flush: true);
      paths.add(target.path);
    }
    return paths;
  }

  Future<LiveAttachment> uploadImage({
    required XFile file,
    required String bucket,
    required String folder,
  }) async {
    final bytes = await file.readAsBytes();
    final details = _validate(file.name, bytes.lengthInBytes);
    final nonce = Random.secure().nextInt(0x7fffffff).toRadixString(36);
    final path = '$folder/${DateTime.now().microsecondsSinceEpoch}_$nonce.${details.extension}';
    await client.storage.from(bucket).uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(contentType: details.contentType, upsert: false),
        );
    return LiveAttachment(
      url: client.storage.from(bucket).getPublicUrl(path),
      type: details.contentType,
    );
  }

  _MediaDetails _validate(String name, int byteLength) {
    if (byteLength <= 0) throw StateError('Le fichier image est vide.');
    if (byteLength > 5 * 1024 * 1024) throw StateError('Chaque image doit faire au maximum 5 Mo.');
    final pieces = name.toLowerCase().split('.');
    final extension = pieces.length > 1 ? pieces.last : 'jpg';
    if (!const {'jpg', 'jpeg', 'png', 'webp'}.contains(extension)) {
      throw StateError('Formats acceptes : JPG, PNG ou WebP.');
    }
    final contentType = switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => 'image/jpeg',
    };
    return _MediaDetails(extension, contentType);
  }
}

class _MediaDetails {
  const _MediaDetails(this.extension, this.contentType);
  final String extension;
  final String contentType;
}
