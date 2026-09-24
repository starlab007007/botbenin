import 'dart:convert';

enum FaFaceState { open, closed }

enum FaTrait { one, two }

extension FaFaceStateX on FaFaceState {
  FaTrait get trait => this == FaFaceState.open ? FaTrait.one : FaTrait.two;

  String get storageValue => this == FaFaceState.open ? 'OPEN' : 'CLOSED';

  String get label => this == FaFaceState.open ? 'Ouvert' : 'Fermé';

  static FaFaceState fromStorage(String value) =>
      value.toUpperCase() == 'OPEN' ? FaFaceState.open : FaFaceState.closed;
}

extension FaTraitX on FaTrait {
  String get symbol => this == FaTrait.one ? 'I' : 'II';

  int get binary => this == FaTrait.one ? 1 : 0;

  static FaTrait fromSymbol(String value) =>
      value.trim().toUpperCase() == 'I' ? FaTrait.one : FaTrait.two;
}

class FaBaseSign {
  const FaBaseSign({
    required this.number,
    required this.canonicalName,
    required this.pattern,
    required this.theme,
    required this.light,
    required this.shadow,
    required this.action,
    this.aliases = const <String>[],
  });

  final int number;
  final String canonicalName;
  final List<FaTrait> pattern;
  final String theme;
  final String light;
  final String shadow;
  final String action;
  final List<String> aliases;

  String get patternKey => pattern.map((trait) => trait.symbol).join('-');
}

class FaCombinedSign {
  const FaCombinedSign({required this.x, required this.y});

  final FaBaseSign x;
  final FaBaseSign y;

  List<FaTrait> get columnA => y.pattern;
  List<FaTrait> get columnB => x.pattern;
  String get reference => '${x.number}-${y.number}';
  bool get isMeji => x.number == y.number;

  String get canonicalName => isMeji
      ? '${x.canonicalName}-Mêji'
      : '${x.canonicalName} - ${y.canonicalName}';

  String get matrixSignature =>
      '${columnA.map((e) => e.symbol).join('-')}|${columnB.map((e) => e.symbol).join('-')}';

  Map<String, dynamic> toJson() => <String, dynamic>{
    'reference': reference,
    'canonical_name': canonicalName,
    'x': x.canonicalName,
    'y': y.canonicalName,
    'is_meji': isMeji,
    'column_a': columnA.map((e) => e.symbol).toList(),
    'column_b': columnB.map((e) => e.symbol).toList(),
  };
}

class FaReading {
  const FaReading({
    required this.essentialMessage,
    required this.traditionalCore,
    required this.contextualReading,
    required this.visibleSituation,
    required this.deepDynamic,
    required this.light,
    required this.shadow,
    required this.temporality,
    required this.conditions,
    required this.actions,
    required this.validationNotice,
  });

  final String essentialMessage;
  final String traditionalCore;
  final String contextualReading;
  final String visibleSituation;
  final String deepDynamic;
  final String light;
  final String shadow;
  final String temporality;
  final String conditions;
  final List<String> actions;
  final String validationNotice;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'essential_message': essentialMessage,
    'traditional_core': traditionalCore,
    'contextual_reading': contextualReading,
    'visible_situation': visibleSituation,
    'deep_dynamic': deepDynamic,
    'light': light,
    'shadow': shadow,
    'temporality': temporality,
    'conditions': conditions,
    'actions': actions,
    'validation_notice': validationNotice,
  };

  factory FaReading.fromJson(Map<String, dynamic> json) => FaReading(
    essentialMessage: '${json['essential_message'] ?? ''}',
    traditionalCore: '${json['traditional_core'] ?? ''}',
    contextualReading: '${json['contextual_reading'] ?? ''}',
    visibleSituation: '${json['visible_situation'] ?? ''}',
    deepDynamic: '${json['deep_dynamic'] ?? ''}',
    light: '${json['light'] ?? ''}',
    shadow: '${json['shadow'] ?? ''}',
    temporality: '${json['temporality'] ?? ''}',
    conditions: '${json['conditions'] ?? ''}',
    actions: (json['actions'] as List<dynamic>? ?? const <dynamic>[])
        .map((item) => '$item')
        .toList(),
    validationNotice: '${json['validation_notice'] ?? ''}',
  );
}

class FaConsultation {
  const FaConsultation({
    required this.id,
    required this.createdAt,
    required this.category,
    required this.intention,
    required this.faces,
    required this.signReference,
    required this.signName,
    required this.reading,
    this.conversation = const <Map<String, String>>[],
  });

  final String id;
  final DateTime createdAt;
  final String category;
  final String intention;
  final List<FaFaceState> faces;
  final String signReference;
  final String signName;
  final FaReading reading;
  final List<Map<String, String>> conversation;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'created_at': createdAt.toIso8601String(),
    'category': category,
    'intention': intention,
    'faces': faces.map((face) => face.storageValue).toList(),
    'sign_reference': signReference,
    'sign_name': signName,
    'reading': reading.toJson(),
    'conversation': conversation,
  };

  String encode() => jsonEncode(toJson());

  factory FaConsultation.fromJson(Map<String, dynamic> json) => FaConsultation(
    id: '${json['id'] ?? ''}',
    createdAt:
        DateTime.tryParse('${json['created_at'] ?? ''}') ?? DateTime.now(),
    category: '${json['category'] ?? 'Question libre'}',
    intention: '${json['intention'] ?? ''}',
    faces: (json['faces'] as List<dynamic>? ?? const <dynamic>[])
        .map((item) => FaFaceStateX.fromStorage('$item'))
        .toList(),
    signReference: '${json['sign_reference'] ?? ''}',
    signName: '${json['sign_name'] ?? ''}',
    reading: FaReading.fromJson(
      Map<String, dynamic>.from(
        json['reading'] as Map<dynamic, dynamic>? ?? const <dynamic, dynamic>{},
      ),
    ),
    conversation: (json['conversation'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map>()
        .map(
          (item) => Map<String, String>.from(
            item.map((key, value) => MapEntry('$key', '$value')),
          ),
        )
        .toList(growable: false),
  );

  factory FaConsultation.decode(String value) => FaConsultation.fromJson(
    Map<String, dynamic>.from(jsonDecode(value) as Map),
  );
}
