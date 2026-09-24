import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';

class ApresBacOcrNote {
  const ApresBacOcrNote({
    required this.subject,
    required this.score,
    required this.confidence,
  });

  final String subject;
  final double score;
  final double confidence;

  Map<String, dynamic> toJson() => {
        'subject': subject,
        'score': score,
        'confidence': confidence,
      };
}

class ApresBacOcrResult {
  const ApresBacOcrResult({
    required this.text,
    required this.notes,
  });

  final String text;
  final List<ApresBacOcrNote> notes;
}

class ApresBacOcrService {
  ApresBacOcrService({
    ImagePicker? picker,
  }) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  static const _aliases = <String, String>{
    'math': 'Mathématiques',
    'mathematique': 'Mathématiques',
    'mathematiques': 'Mathématiques',
    'maths': 'Mathématiques',
    'francais': 'Français',
    'anglais': 'Anglais',
    'philo': 'Philosophie',
    'philosophie': 'Philosophie',
    'histoire geo': 'Histoire-Géographie',
    'hist geo': 'Histoire-Géographie',
    'histoire-geographie': 'Histoire-Géographie',
    'svt': 'SVT',
    'spct': 'SPCT',
    'pct': 'PCT',
    'physique chimie': 'Physique-Chimie',
    'economie': 'Économie',
    'etude de cas': 'Étude de cas',
    'comptabilite': 'Comptabilité',
    'allemand': 'Allemand',
    'espagnol': 'Espagnol',
    'agriculture generale': 'Agriculture générale',
    'rdm': 'Résistance des matériaux',
    'technologie': 'Technologie',
  };

  Future<ApresBacOcrResult?> scan({
    required ImageSource source,
  }) async {
    final image = await _picker.pickImage(
      source: source,
      imageQuality: 92,
      maxWidth: 2200,
    );

    if (image == null) return null;

    final recognizer = TextRecognizer(
      script: TextRecognitionScript.latin,
    );

    try {
      final result = await recognizer.processImage(
        InputImage.fromFilePath(image.path),
      );

      final text = result.text.trim();
      return ApresBacOcrResult(
        text: text,
        notes: parseNotes(text),
      );
    } finally {
      await recognizer.close();
    }
  }

  static List<ApresBacOcrNote> parseNotes(String source) {
    final lines = source
        .split(RegExp(r'[\r\n]+'))
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();

    final notes = <String, ApresBacOcrNote>{};
    String? pendingSubject;

    for (final line in lines) {
      final normalized = _normalize(line);
      final detectedSubject = _detectSubject(normalized);
      final score = _detectScore(line);

      if (detectedSubject != null && score != null) {
        notes[detectedSubject] = ApresBacOcrNote(
          subject: detectedSubject,
          score: score,
          confidence: 0.90,
        );
        pendingSubject = null;
        continue;
      }

      if (detectedSubject != null) {
        pendingSubject = detectedSubject;
        continue;
      }

      if (pendingSubject != null && score != null) {
        notes[pendingSubject] = ApresBacOcrNote(
          subject: pendingSubject,
          score: score,
          confidence: 0.74,
        );
        pendingSubject = null;
      }
    }

    return notes.values.toList()
      ..sort((a, b) => a.subject.compareTo(b.subject));
  }

  static String? _detectSubject(String normalizedLine) {
    final aliases = _aliases.keys.toList()
      ..sort((a, b) => b.length.compareTo(a.length));

    for (final alias in aliases) {
      if (normalizedLine.contains(alias)) {
        return _aliases[alias];
      }
    }

    return null;
  }

  static double? _detectScore(String line) {
    final matches = RegExp(
      r'(?:^|\s)(20(?:[.,]0+)?|1[0-9](?:[.,][0-9]{1,2})?|[0-9](?:[.,][0-9]{1,2})?)(?:\s*/\s*20)?(?:\s|$)',
    ).allMatches(line);

    for (final match in matches) {
      final raw = match.group(1)?.replaceAll(',', '.');
      final value = double.tryParse(raw ?? '');
      if (value != null && value >= 0 && value <= 20) {
        return value;
      }
    }

    return null;
  }

  static String _normalize(String value) {
    return value
        .toLowerCase()
        .replaceAll('à', 'a')
        .replaceAll('â', 'a')
        .replaceAll('ä', 'a')
        .replaceAll('é', 'e')
        .replaceAll('è', 'e')
        .replaceAll('ê', 'e')
        .replaceAll('ë', 'e')
        .replaceAll('î', 'i')
        .replaceAll('ï', 'i')
        .replaceAll('ô', 'o')
        .replaceAll('ö', 'o')
        .replaceAll('ù', 'u')
        .replaceAll('û', 'u')
        .replaceAll('ü', 'u')
        .replaceAll('ç', 'c')
        .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}
