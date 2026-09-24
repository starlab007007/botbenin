import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

class StudioPickedCatalogMedia {
  const StudioPickedCatalogMedia({
    required this.name,
    required this.bytes,
    required this.contentType,
  });

  final String name;
  final Uint8List bytes;
  final String contentType;

  bool get isVideo => contentType.startsWith('video/');
  bool get isImage => contentType.startsWith('image/');
  bool get isDocument => !isVideo && !isImage;
}

class StudioCatalogMediaPicker {
  const StudioCatalogMediaPicker._();

  static const bool available = true;
  static const int maxImageBytes = 12 * 1024 * 1024;
  static const int maxVideoBytes = 18 * 1024 * 1024;
  static const int maxImportBytes = 12 * 1024 * 1024;

  static Future<List<StudioPickedCatalogMedia>> pickImages({
    int maxFiles = 3,
  }) async {
    final result = await FilePicker.pickFiles(
      type: FileType.image,
      allowMultiple: true,
      withData: true,
    );

    if (result == null) return const <StudioPickedCatalogMedia>[];

    return result.files
        .take(maxFiles)
        .map(_fromPlatformFile)
        .whereType<StudioPickedCatalogMedia>()
        .where((item) => item.bytes.length <= maxImageBytes)
        .toList();
  }

  static Future<StudioPickedCatalogMedia?> pickVideo() async {
    final result = await FilePicker.pickFiles(
      type: FileType.video,
      allowMultiple: false,
      withData: true,
    );

    if (result == null || result.files.isEmpty) return null;
    final item = _fromPlatformFile(result.files.first);
    if (item == null || item.bytes.length > maxVideoBytes) return null;
    return item;
  }

  static Future<StudioPickedCatalogMedia?> pickImportFile() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>[
        'jpg',
        'jpeg',
        'png',
        'webp',
        'mp4',
        'mov',
        'm4v',
        'webm',
        'mp3',
        'wav',
        'm4a',
        'ogg',
        'aac',
        'pdf',
        'txt',
        'csv',
        'json',
        'md',
      ],
      allowMultiple: false,
      withData: true,
    );

    if (result == null || result.files.isEmpty) return null;
    final item = _fromPlatformFile(result.files.first);
    if (item == null || item.bytes.length > maxImportBytes) return null;
    return item;
  }

  static StudioPickedCatalogMedia? _fromPlatformFile(
    PlatformFile file,
  ) {
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) return null;

    return StudioPickedCatalogMedia(
      name: file.name,
      bytes: bytes,
      contentType: _contentType(file.extension),
    );
  }

  static String _contentType(String? extension) {
    switch ((extension ?? '').toLowerCase()) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'm4v':
        return 'video/x-m4v';
      case 'webm':
        return 'video/webm';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'm4a':
        return 'audio/mp4';
      case 'ogg':
        return 'audio/ogg';
      case 'aac':
        return 'audio/aac';
      case 'pdf':
        return 'application/pdf';
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'md':
        return 'text/markdown';
      case 'txt':
        return 'text/plain';
      default:
        return 'image/jpeg';
    }
  }
}
