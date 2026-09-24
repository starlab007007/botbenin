import 'package:flutter_test/flutter_test.dart';

import '../lib/features/fa_ia/data/fa_ia_catalog.dart';
import '../lib/features/fa_ia/domain/fa_document_models.dart';
import '../lib/features/fa_ia/domain/fa_ia_engine.dart';
import '../lib/features/fa_ia/domain/fa_ia_models.dart';
import '../lib/features/fa_ia/services/fa_document_chat_service.dart';

void main() {
  group('FA IA engine', () {
    test('contains the 16 base signs and 256 ordered combinations', () {
      final engine = FaIaEngine();
      expect(FaIaCatalog.baseSigns, hasLength(16));
      expect(engine.allSigns, hasLength(256));
      expect(
        engine.allSigns.map((sign) => sign.reference).toSet(),
        hasLength(256),
      );
    });

    test('uses column A from Y and column B from X', () {
      final engine = FaIaEngine();
      final sign = engine.signByReference('1-2');
      expect(sign.columnA, FaIaCatalog.baseSigns[1].pattern);
      expect(sign.columnB, FaIaCatalog.baseSigns[0].pattern);
      expect(sign.canonicalName, 'Gbé - GOUDA');
    });

    test('maps open to I and closed to II', () {
      expect(FaFaceState.open.trait, FaTrait.one);
      expect(FaFaceState.open.trait.symbol, 'I');
      expect(FaFaceState.closed.trait, FaTrait.two);
      expect(FaFaceState.closed.trait.symbol, 'II');
    });

    test('resolves exactly eight faces', () {
      final engine = FaIaEngine();
      final faces = <FaFaceState>[
        FaFaceState.open,
        FaFaceState.open,
        FaFaceState.open,
        FaFaceState.closed,
        FaFaceState.open,
        FaFaceState.open,
        FaFaceState.open,
        FaFaceState.open,
      ];
      final sign = engine.resolveFaces(faces);
      expect(sign.reference, '1-2');
    });
  });

  group('FA IA document-grounded conversation', () {
    test('builds a detailed payload grounded in the validated FA knowledge', () {
      final engine = FaIaEngine();
      final sign = engine.signByReference('1-1');
      const entry = FaDocumentEntry(
        available: true,
        reference: '1-1',
        canonicalName: 'GBÉ-Mêji',
        x: 'GBÉ',
        y: 'GBÉ',
        sourceFile: '256 signe de fa(1).pdf',
        sourceText: 'Le document décrit ce signe comme un signe d’ouverture.',
        documentTitle: '1-GBE MEDJI/DJO GBE',
        documentNumber: 1,
        pageStart: 69,
        pageEnd: 69,
      );
      final service = FaDocumentChatService(
        sign: sign,
        entry: entry,
        category: 'Travail et vocation',
        intention: 'Comprendre un projet',
      );
      final payload = service.buildPayload(
        userMessage: 'Explique-moi simplement',
        history: const <FaChatMessage>[],
      );
      expect((payload['sign'] as Map)['reference'], '1-1');
      final constraints = payload['constraints'] as Map;
      expect(constraints['document_only'], isTrue);
      expect(constraints['hide_sources'], isTrue);
      expect(constraints['speak_as_fa_knowledge'], isTrue);
      expect(constraints['detail_level'], 'exhaustive');
      expect(constraints['max_words'], 900);
      expect((payload['corpus'] as Map)['source_file'],
          '256 signe de fa(1).pdf');
      expect(
        FaDocumentChatService.initialQuickReplies
            .where((item) => item.toLowerCase().contains('source')),
        isEmpty,
      );
    });

    test('journal conversation remains backward compatible', () {
      final consultation = FaConsultation(
        id: 'test',
        createdAt: DateTime(2026, 7, 22),
        category: 'Question libre',
        intention: 'Une situation',
        faces: const <FaFaceState>[
          FaFaceState.open,
          FaFaceState.open,
          FaFaceState.open,
          FaFaceState.open,
          FaFaceState.open,
          FaFaceState.open,
          FaFaceState.open,
          FaFaceState.open,
        ],
        signReference: '1-1',
        signName: 'GBÉ-Mêji',
        reading: const FaReading(
          essentialMessage: '',
          traditionalCore: '',
          contextualReading: '',
          visibleSituation: '',
          deepDynamic: '',
          light: '',
          shadow: '',
          temporality: '',
          conditions: '',
          actions: <String>[],
          validationNotice: '',
        ),
        conversation: const <Map<String, String>>[
          <String, String>{'role': 'assistant', 'content': 'Message'},
        ],
      );
      final decoded = FaConsultation.fromJson(consultation.toJson());
      expect(decoded.conversation, hasLength(1));
      expect(decoded.conversation.first['content'], 'Message');
    });
  });
}
