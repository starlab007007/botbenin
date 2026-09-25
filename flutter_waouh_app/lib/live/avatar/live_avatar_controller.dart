import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum LiveAvatarPresenceState {
  idle,
  listening,
  thinking,
  searching,
  comparing,
  typing,
  watching,
  found,
  waiting,
  negotiating,
  done,
  offline,
}

enum LiveAvatarPreset {
  sky,
  aura,
  nova,
  orbit,
  sol,
  flux,
}

extension LiveAvatarPresetLabel on LiveAvatarPreset {
  String get id => name;

  String get label => switch (this) {
        LiveAvatarPreset.sky => 'Sky',
        LiveAvatarPreset.aura => 'Aura',
        LiveAvatarPreset.nova => 'Nova',
        LiveAvatarPreset.orbit => 'Orbit',
        LiveAvatarPreset.sol => 'Sol',
        LiveAvatarPreset.flux => 'Flux',
      };

  static LiveAvatarPreset fromId(String? value) {
    return LiveAvatarPreset.values.firstWhere(
      (item) => item.name == value,
      orElse: () => LiveAvatarPreset.sky,
    );
  }
}

class LiveAvatarProfile {
  const LiveAvatarProfile({
    required this.name,
    required this.preset,
    required this.personality,
    required this.proactivity,
    required this.configured,
  });

  final String name;
  final LiveAvatarPreset preset;
  final String personality;
  final String proactivity;
  final bool configured;

  LiveAvatarProfile copyWith({
    String? name,
    LiveAvatarPreset? preset,
    String? personality,
    String? proactivity,
    bool? configured,
  }) =>
      LiveAvatarProfile(
        name: name ?? this.name,
        preset: preset ?? this.preset,
        personality: personality ?? this.personality,
        proactivity: proactivity ?? this.proactivity,
        configured: configured ?? this.configured,
      );
}

class LiveAvatarController extends ChangeNotifier {
  static const _nameKey = 'waouh.avatar.name';
  static const _presetKey = 'waouh.avatar.preset';
  static const _personalityKey = 'waouh.avatar.personality';
  static const _proactivityKey = 'waouh.avatar.proactivity';
  static const _configuredKey = 'waouh.avatar.configured';

  LiveAvatarProfile _profile = const LiveAvatarProfile(
    name: 'Ayo',
    preset: LiveAvatarPreset.sky,
    personality: 'Équilibré',
    proactivity: 'Équilibré',
    configured: false,
  );

  LiveAvatarPresenceState _state = LiveAvatarPresenceState.idle;
  bool _loaded = false;
  Timer? _stateTimer;

  LiveAvatarProfile get profile => _profile;
  LiveAvatarPresenceState get state => _state;
  bool get loaded => _loaded;

  String get name => _profile.name.trim().isEmpty ? 'Ayo' : _profile.name.trim();

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _profile = LiveAvatarProfile(
      name: prefs.getString(_nameKey) ?? 'Ayo',
      preset: LiveAvatarPresetLabel.fromId(prefs.getString(_presetKey)),
      personality: prefs.getString(_personalityKey) ?? 'Équilibré',
      proactivity: prefs.getString(_proactivityKey) ?? 'Équilibré',
      configured: prefs.getBool(_configuredKey) ?? false,
    );
    _loaded = true;
    notifyListeners();
  }

  Future<void> saveProfile({
    required String name,
    required LiveAvatarPreset preset,
    required String personality,
    required String proactivity,
  }) async {
    final normalizedName = name.trim().isEmpty ? 'Ayo' : name.trim();
    _profile = LiveAvatarProfile(
      name: normalizedName,
      preset: preset,
      personality: personality,
      proactivity: proactivity,
      configured: true,
    );
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.setString(_nameKey, normalizedName),
      prefs.setString(_presetKey, preset.id),
      prefs.setString(_personalityKey, personality),
      prefs.setString(_proactivityKey, proactivity),
      prefs.setBool(_configuredKey, true),
    ]);
    notifyListeners();
  }

  Future<void> resetProfile() async {
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.remove(_nameKey),
      prefs.remove(_presetKey),
      prefs.remove(_personalityKey),
      prefs.remove(_proactivityKey),
      prefs.remove(_configuredKey),
    ]);
    _profile = const LiveAvatarProfile(
      name: 'Ayo',
      preset: LiveAvatarPreset.sky,
      personality: 'Équilibré',
      proactivity: 'Équilibré',
      configured: false,
    );
    _state = LiveAvatarPresenceState.idle;
    notifyListeners();
  }

  void showState(
    LiveAvatarPresenceState state, {
    Duration duration = const Duration(seconds: 3),
  }) {
    _stateTimer?.cancel();
    _state = state;
    notifyListeners();
    if (state == LiveAvatarPresenceState.idle ||
        state == LiveAvatarPresenceState.offline) {
      return;
    }
    _stateTimer = Timer(duration, () {
      _state = LiveAvatarPresenceState.idle;
      notifyListeners();
    });
  }

  void setPersistentState(LiveAvatarPresenceState state) {
    _stateTimer?.cancel();
    _state = state;
    notifyListeners();
  }

  @override
  void dispose() {
    _stateTimer?.cancel();
    super.dispose();
  }
}
