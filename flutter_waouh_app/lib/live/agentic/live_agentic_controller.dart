import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';

import 'live_agentic_contracts.dart';
import 'live_agentic_models.dart';
import 'live_agentic_repository.dart';

class LiveAgenticController extends ChangeNotifier {
  LiveAgenticController({required this.repository});

  final LiveAgenticRepository repository;
  final Random _random = Random.secure();

  String? _scope;
  bool _initialized = false;
  bool _loading = false;
  List<WaouhMission> _missions = <WaouhMission>[];
  List<WaouhPriceWatch> _watches = <WaouhPriceWatch>[];
  List<WaouhApprovalRequest> _approvals = <WaouhApprovalRequest>[];
  List<WaouhActivityEntry> _activity = <WaouhActivityEntry>[];

  bool get initialized => _initialized;
  bool get loading => _loading;
  List<WaouhMission> get missions => List.unmodifiable(_missions);
  List<WaouhPriceWatch> get watches => List.unmodifiable(_watches);
  List<WaouhApprovalRequest> get approvals => List.unmodifiable(_approvals);
  List<WaouhActivityEntry> get activity => List.unmodifiable(_activity);
  int get activeMissionCount => _missions.where((item) => item.active).length;
  int get activeWatchCount => _watches.where((item) => item.enabled).length;
  int get pendingApprovalCount =>
      _approvals.where((item) => item.pending).length;

  Future<void> initialize(String scope) async {
    if (_initialized && _scope == scope) return;
    _scope = scope;
    _loading = true;
    notifyListeners();
    final local = await repository.loadLocal(scope);
    _replace(local);
    _initialized = true;
    _loading = false;
    notifyListeners();

    // Refresh with server truth when the new endpoint is available, but never
    // erase local recovery state with an empty response.
    unawaited(_refreshRemote(scope));
  }

  Future<void> switchScope(String scope) => initialize(scope);

  Future<void> _refreshRemote(String expectedScope) async {
    final remote = await repository.loadRemote();
    if (remote == null || _scope != expectedScope) return;
    _missions = _mergeById(
      _missions,
      remote.missions,
      (item) => item.id,
      (item) => item.updatedAt,
    );
    _watches = _mergeById(
      _watches,
      remote.watches,
      (item) => item.id,
      (item) => item.updatedAt,
    );
    _approvals = _mergeById(
      _approvals,
      remote.approvals,
      (item) => item.id,
      (item) => item.createdAt,
    );
    _activity = _mergeById(
      _activity,
      remote.activity,
      (item) => item.id,
      (item) => item.createdAt,
    );
    _sort();
    await _persistLocal();
    notifyListeners();
  }

  List<T> _mergeById<T>(
    List<T> local,
    List<T> remote,
    String Function(T) idOf,
    DateTime Function(T) dateOf,
  ) {
    final values = <String, T>{for (final item in local) idOf(item): item};
    for (final item in remote) {
      final previous = values[idOf(item)];
      if (previous == null || !dateOf(item).isBefore(dateOf(previous))) {
        values[idOf(item)] = item;
      }
    }
    return values.values.toList(growable: true);
  }

  void _replace(WaouhAgenticSnapshot snapshot) {
    _missions = List<WaouhMission>.from(snapshot.missions);
    _watches = List<WaouhPriceWatch>.from(snapshot.watches);
    _approvals = List<WaouhApprovalRequest>.from(snapshot.approvals);
    _activity = List<WaouhActivityEntry>.from(snapshot.activity);
    _sort();
  }

  void _sort() {
    _missions.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    _watches.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    _approvals.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    _activity.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    if (_activity.length > 250) {
      _activity = _activity.take(250).toList(growable: true);
    }
  }

  String _id(String prefix) =>
      '$prefix-${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(1 << 20).toRadixString(36)}';

  String _uuidV4() {
    final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex =
        bytes.map((value) => value.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-'
        '${hex.substring(20)}';
  }

  bool isShoppingIntent(String text, Map<String, dynamic> meta) {
    final intent = '${meta['intent'] ?? meta['action'] ?? ''}'.toLowerCase();
    return <String>{'buy', 'search', 'shopping', 'compare', 'watch'}
            .any(intent.contains) ||
        RegExp(
          r'\b(cherche|recherche|trouve|compare|acheter|achète|prix|disponible)\b',
          caseSensitive: false,
        ).hasMatch(text);
  }

  String? ensureMissionForRequest(
    String text,
    Map<String, dynamic> meta,
  ) {
    final explicit = '${meta['mission_id'] ?? ''}'.trim();
    if (explicit.isNotEmpty) return explicit;
    if (!isShoppingIntent(text, meta)) return null;
    final idempotency = '${meta['idempotency_key'] ?? ''}'.trim();
    if (idempotency.isNotEmpty) {
      for (final mission in _missions) {
        if (mission.criteria['idempotency_key'] == idempotency) {
          return mission.id;
        }
      }
    }
    final now = DateTime.now();
    final mission = WaouhMission(
      id: _uuidV4(),
      title: _missionTitle(text),
      request: text.trim(),
      status: WaouhMissionStatus.searching,
      createdAt: now,
      updatedAt: now,
      criteria: <String, dynamic>{
        for (final key in const <String>[
          'budget_max',
          'budget_min',
          'city',
          'category',
          'condition',
          'quantity',
          'deadline',
          'idempotency_key',
        ])
          if (meta[key] != null) key: meta[key],
      },
      steps: <WaouhMissionStep>[
        WaouhMissionStep(
          id: 'understand',
          label: 'Comprendre le besoin',
          status: WaouhStepStatus.completed,
          updatedAt: now,
        ),
        WaouhMissionStep(
          id: 'search',
          label: 'Rechercher les offres',
          status: WaouhStepStatus.running,
          updatedAt: now,
        ),
        const WaouhMissionStep(
          id: 'compare',
          label: 'Comparer prix, stock et fiabilité',
        ),
        const WaouhMissionStep(
          id: 'decide',
          label: 'Présenter les options et attendre votre choix',
        ),
      ],
    );
    _missions.insert(0, mission);
    _record(
      WaouhActivityKind.mission,
      'Mission créée',
      mission.title,
      missionId: mission.id,
    );
    _changed();
    return mission.id;
  }

  Future<String?> ensureSynchronizedMissionForRequest(
    String text,
    Map<String, dynamic> meta, {
    required bool online,
  }) async {
    final localId = ensureMissionForRequest(text, meta);
    if (localId == null || !online) return localId;
    final index = _missions.indexWhere((item) => item.id == localId);
    if (index < 0) return localId;
    final local = _missions[index];
    if (local.criteria['remote_synced'] == true) return local.id;
    final row = await repository.createMission(local);
    final remoteId = '${row?['id'] ?? ''}'.trim();
    if (remoteId.isEmpty) return local.id;
    final updated = local.copyWith(
      id: remoteId,
      updatedAt: DateTime.now(),
      criteria: <String, dynamic>{
        ...local.criteria,
        'remote_synced': true,
      },
    );
    _missions[index] = updated;
    for (var activityIndex = 0;
        activityIndex < _activity.length;
        activityIndex += 1) {
      final entry = _activity[activityIndex];
      if (entry.missionId != local.id) continue;
      _activity[activityIndex] = WaouhActivityEntry(
        id: entry.id,
        kind: entry.kind,
        title: entry.title,
        detail: entry.detail,
        createdAt: entry.createdAt,
        missionId: remoteId,
        metadata: entry.metadata,
      );
    }
    _changed();
    return remoteId;
  }

  String _missionTitle(String text) {
    final clean = text.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (clean.length <= 58) return clean;
    return '${clean.substring(0, 55)}…';
  }

  void markMissionQueued(String? id) {
    if (id == null || id.isEmpty) return;
    _updateMission(
      id,
      (mission) => mission.copyWith(
        status: WaouhMissionStatus.paused,
        summary:
            'Mission enregistrée. Reprise automatique au retour du réseau.',
      ),
      activityTitle: 'Mission mise en attente',
      activityDetail:
          'La recherche reprendra dès que la connexion sera disponible.',
    );
  }

  void applyChannelResponse({
    required String requestText,
    required Map<String, dynamic> requestMeta,
    required Map<String, dynamic> response,
  }) {
    final contract = WaouhMessageContract.tryParse(response);
    final missionId =
        contract?.missionId ?? '${requestMeta['mission_id'] ?? ''}';
    if (missionId.isEmpty) return;
    final missionIndex = _missions.indexWhere((item) => item.id == missionId);
    if (missionIndex < 0) return;
    final mission = _missions[missionIndex];
    final resultCount = contract?.products.length ?? 0;
    final responseError = '${response['error'] ?? ''}'.trim();
    if (response['ok'] == false || responseError.isNotEmpty) {
      _missions[missionIndex] = mission.copyWith(
        status: WaouhMissionStatus.failed,
        updatedAt: DateTime.now(),
        error: responseError.isEmpty ? 'La recherche a échoué.' : responseError,
        steps: _stepState(mission.steps, 'search', WaouhStepStatus.failed),
      );
      _record(
        WaouhActivityKind.system,
        'Mission interrompue',
        _missions[missionIndex].error ?? 'Une erreur est survenue.',
        missionId: missionId,
      );
      _changed();
      return;
    }

    var steps = _stepState(
      mission.steps,
      'search',
      WaouhStepStatus.completed,
    );
    if (resultCount > 0) {
      steps = _stepState(steps, 'compare', WaouhStepStatus.completed);
      steps = _stepState(steps, 'decide', WaouhStepStatus.running);
    }
    final updated = mission.copyWith(
      status: resultCount > 0
          ? WaouhMissionStatus.comparing
          : WaouhMissionStatus.searching,
      updatedAt: DateTime.now(),
      steps: steps,
      resultCount: resultCount,
      summary: contract?.text.isNotEmpty == true
          ? contract!.text
          : resultCount > 0
              ? '$resultCount option${resultCount > 1 ? 's' : ''} trouvée${resultCount > 1 ? 's' : ''}.'
              : 'WAOUH poursuit la recherche.',
    );
    _missions[missionIndex] = updated;
    _record(
      resultCount > 0 ? WaouhActivityKind.comparison : WaouhActivityKind.search,
      resultCount > 0 ? 'Comparaison prête' : 'Recherche mise à jour',
      resultCount > 0
          ? '$resultCount option${resultCount > 1 ? 's' : ''} analysée${resultCount > 1 ? 's' : ''}.'
          : 'Le moteur a répondu sans offre exploitable.',
      missionId: missionId,
    );
    if (contract != null) _captureApprovals(contract, missionId);
    _changed();
  }

  List<WaouhMissionStep> _stepState(
    List<WaouhMissionStep> steps,
    String id,
    WaouhStepStatus status,
  ) =>
      steps
          .map((step) => step.id == id
              ? step.copyWith(status: status, updatedAt: DateTime.now())
              : step)
          .toList(growable: false);

  void _captureApprovals(WaouhMessageContract contract, String missionId) {
    for (final block in contract.blocks) {
      if (block.type != 'approval' && block.type != 'approval_request') {
        continue;
      }
      final action = '${block.data['action'] ?? ''}'.trim();
      final normalized = action.toLowerCase();
      // Payments are intentionally outside this implementation.
      if (RegExp(r'pay|paiement|payer|mobile.?money|checkout')
          .hasMatch(normalized)) {
        continue;
      }
      final id =
          '${block.data['approval_id'] ?? block.data['id'] ?? _id('approval')}';
      if (_approvals.any((item) => item.id == id)) continue;
      _approvals.insert(
        0,
        WaouhApprovalRequest(
          id: id,
          action: action,
          title: '${block.data['title'] ?? 'Autoriser une action'}',
          description:
              '${block.data['description'] ?? block.data['message'] ?? ''}',
          status: WaouhApprovalStatus.pending,
          createdAt: DateTime.now(),
          missionId: missionId,
          expiresAt: DateTime.tryParse('${block.data['expires_at'] ?? ''}'),
          details: Map<String, dynamic>.from(block.data),
        ),
      );
      _record(
        WaouhActivityKind.approval,
        'Votre accord est requis',
        '${block.data['title'] ?? action}',
        missionId: missionId,
      );
    }
  }

  Future<WaouhPriceWatch> addWatch({
    required String productId,
    required String title,
    num? targetPrice,
    num? currentPrice,
    String currency = 'XOF',
    bool watchStock = true,
    String? city,
    String? imageUrl,
  }) async {
    final existing = _watches.indexWhere(
      (item) => item.productId == productId && item.enabled,
    );
    final now = DateTime.now();
    final watch = WaouhPriceWatch(
      id: existing >= 0 ? _watches[existing].id : _uuidV4(),
      productId: productId,
      title: title,
      targetPrice: targetPrice,
      lastPrice: currentPrice,
      currency: currency,
      watchStock: watchStock,
      enabled: true,
      city: city,
      imageUrl: imageUrl,
      createdAt: existing >= 0 ? _watches[existing].createdAt : now,
      updatedAt: now,
    );
    if (existing >= 0) {
      _watches[existing] = watch;
    } else {
      _watches.insert(0, watch);
    }
    _record(
      WaouhActivityKind.watch,
      existing >= 0 ? 'Veille mise à jour' : 'Veille activée',
      targetPrice == null
          ? '$title : surveillance du stock.'
          : '$title : alerte à ${_formatAmount(targetPrice)} $currency.',
    );
    _changed();
    if (existing >= 0) {
      await repository.updateWatch(watch);
      return watch;
    }
    final remoteRow = await repository.createWatch(watch);
    final remoteId = '${remoteRow?['id'] ?? ''}'.trim();
    if (remoteId.isEmpty) return watch;
    final remote = WaouhPriceWatch.fromJson(<String, dynamic>{
      ...remoteRow!,
      'title': watch.title,
      'city': watch.city,
      'image_url': watch.imageUrl,
      'watch_stock': watch.watchStock,
    });
    final createdIndex = _watches.indexWhere((item) => item.id == watch.id);
    if (createdIndex >= 0) {
      _watches[createdIndex] = remote;
      _changed();
    }
    return remote;
  }

  Future<void> toggleWatch(String id, bool enabled) async {
    final index = _watches.indexWhere((item) => item.id == id);
    if (index < 0) return;
    final watch = _watches[index].copyWith(
      enabled: enabled,
      updatedAt: DateTime.now(),
    );
    _watches[index] = watch;
    _record(
      WaouhActivityKind.watch,
      enabled ? 'Veille reprise' : 'Veille en pause',
      watch.title,
    );
    _changed();
    await repository.updateWatch(watch);
  }

  Future<void> removeWatch(String id) async {
    final index = _watches.indexWhere((item) => item.id == id);
    if (index < 0) return;
    final watch = _watches.removeAt(index);
    _record(WaouhActivityKind.watch, 'Veille supprimée', watch.title);
    _changed();
    await repository.deleteWatch(id);
  }

  String resumeMission(String id) {
    final index = _missions.indexWhere((item) => item.id == id);
    if (index < 0) return '';
    final mission = _missions[index];
    final steps = mission.steps
        .map((step) => step.status == WaouhStepStatus.failed
            ? step.copyWith(status: WaouhStepStatus.running)
            : step)
        .toList(growable: false);
    final updated = mission.copyWith(
      status: WaouhMissionStatus.searching,
      updatedAt: DateTime.now(),
      steps: steps,
      summary: 'Reprise demandée depuis le journal de mission.',
    );
    _missions[index] = updated;
    _record(
      WaouhActivityKind.mission,
      'Mission reprise',
      mission.title,
      missionId: mission.id,
    );
    _changed();
    if (updated.criteria['remote_synced'] == true) {
      unawaited(repository.resumeMission(updated.id));
    }
    return 'Reprends cette mission : ${mission.request}';
  }

  void pauseMission(String id) {
    _updateMission(
      id,
      (mission) => mission.copyWith(status: WaouhMissionStatus.paused),
      activityTitle: 'Mission en pause',
      activityDetail:
          'La mission pourra être reprise sans perdre son contexte.',
    );
    final index = _missions.indexWhere((item) => item.id == id);
    if (index >= 0 && _missions[index].criteria['remote_synced'] == true) {
      unawaited(repository.pauseMission(id));
    }
  }

  void cancelMission(String id) {
    _updateMission(
      id,
      (mission) => mission.copyWith(status: WaouhMissionStatus.cancelled),
      activityTitle: 'Mission annulée',
      activityDetail: 'Aucune nouvelle action ne sera lancée.',
    );
    final index = _missions.indexWhere((item) => item.id == id);
    if (index >= 0 && _missions[index].criteria['remote_synced'] == true) {
      unawaited(repository.cancelMission(id));
    }
  }

  void _updateMission(
    String id,
    WaouhMission Function(WaouhMission) update, {
    required String activityTitle,
    required String activityDetail,
  }) {
    final index = _missions.indexWhere((item) => item.id == id);
    if (index < 0) return;
    final changed =
        update(_missions[index]).copyWith(updatedAt: DateTime.now());
    _missions[index] = changed;
    _record(
      WaouhActivityKind.mission,
      activityTitle,
      activityDetail,
      missionId: id,
    );
    _changed();
  }

  Future<void> decideApproval(String id, bool approved) async {
    final index = _approvals.indexWhere((item) => item.id == id);
    if (index < 0 || !_approvals[index].pending) return;
    final status =
        approved ? WaouhApprovalStatus.approved : WaouhApprovalStatus.refused;
    final approval = _approvals[index].copyWith(status: status);
    _approvals[index] = approval;
    _record(
      WaouhActivityKind.approval,
      approved ? 'Action autorisée' : 'Action refusée',
      approval.title,
      missionId: approval.missionId,
    );
    _changed();
    await repository.resolveApproval(approval, status);
  }

  String _formatAmount(num value) {
    final digits = value.round().toString();
    return digits.replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => ' ',
    );
  }

  void _record(
    WaouhActivityKind kind,
    String title,
    String detail, {
    String? missionId,
  }) {
    _activity.insert(
      0,
      WaouhActivityEntry(
        id: _id('activity'),
        kind: kind,
        title: title,
        detail: detail,
        createdAt: DateTime.now(),
        missionId: missionId,
      ),
    );
  }

  void _changed() {
    _sort();
    notifyListeners();
    unawaited(_persistLocal());
  }

  Future<void> _persistLocal() async {
    final scope = _scope;
    if (scope == null) return;
    await repository.saveLocal(
      scope,
      WaouhAgenticSnapshot(
        missions: _missions,
        watches: _watches,
        approvals: _approvals,
        activity: _activity,
      ),
    );
  }
}
