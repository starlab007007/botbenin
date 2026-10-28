/// Read each section independently: a temporary failure must not erase the feed.
class MissionRead<T> {
  const MissionRead(this.value, this.failed);
  final T? value;
  final bool failed;
}

Future<MissionRead<T>> readMissionPart<T>(Future<T> Function() read) async {
  try {
    return MissionRead(
      await read().timeout(const Duration(seconds: 18)),
      false,
    );
  } catch (_) {
    return MissionRead<T>(null, true);
  }
}

Duration missionRetryDelay(int attempt) => Duration(
  seconds: attempt <= 1
      ? 5
      : attempt == 2
      ? 15
      : 30,
);
