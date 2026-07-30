import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

class StudioPickedImage {
  const StudioPickedImage({
    required this.name,
    required this.bytes,
    required this.contentType,
  });

  final String name;
  final Uint8List bytes;
  final String contentType;
}

class StudioProductImagePicker {
  const StudioProductImagePicker._();

  static const bool available = true;

  static Future<StudioPickedImage?> pick() async {
    final result = await FilePicker.pickFiles(
      type: FileType.image,
      allowMultiple: false,
      withData: true,
    );

    if (result == null || result.files.isEmpty) {
      return null;
    }

    final file = result.files.first;
    final bytes = file.bytes;

    if (bytes == null || bytes.isEmpty) {
      return null;
    }

    return StudioPickedImage(
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
      default:
        return 'image/jpeg';
    }
  }
}
