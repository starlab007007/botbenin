import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

class SmartPickedDocument {
  const SmartPickedDocument({
    required this.name,
    required this.bytes,
    required this.size,
    required this.contentType,
  });

  final String name;
  final Uint8List bytes;
  final int size;
  final String contentType;
}

class SmartDocumentPicker {
  const SmartDocumentPicker._();

  static const bool available = true;

  static Future<List<SmartPickedDocument>> pickDocuments() async {
    final result = await FilePicker.pickFiles(
      allowMultiple: true,
      withData: true,
      type: FileType.custom,
      allowedExtensions: <String>[
        'pdf',
        'docx',
        'txt',
        'md',
      ],
    );

    if (result == null) {
      return const <SmartPickedDocument>[];
    }

    final documents = <SmartPickedDocument>[];

    for (final file in result.files) {
      final bytes = file.bytes;
      if (bytes == null || bytes.isEmpty) continue;

      documents.add(
        SmartPickedDocument(
          name: file.name,
          bytes: bytes,
          size: file.size,
          contentType: _contentType(file.extension),
        ),
      );
    }

    return documents;
  }

  static String _contentType(String? extension) {
    switch ((extension ?? '').toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'md':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  }
}
