import 'package:geolocator/geolocator.dart';

class LiveLocation {
  const LiveLocation({
    this.latitude,
    this.longitude,
    this.errorMessage,
    this.serviceDisabled = false,
    this.permissionDenied = false,
    this.permissionDeniedForever = false,
  });

  final double? latitude;
  final double? longitude;
  final String? errorMessage;
  final bool serviceDisabled;
  final bool permissionDenied;
  final bool permissionDeniedForever;

  bool get available => latitude != null && longitude != null;
}

class LiveLocationService {
  Future<LiveLocation> requestCurrent() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      return const LiveLocation(
        serviceDisabled: true,
        errorMessage: 'Activez la localisation GPS du téléphone, puis réessayez.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      return const LiveLocation(
        permissionDeniedForever: true,
        errorMessage: 'La permission de localisation est bloquée dans les paramètres Android.',
      );
    }
    if (permission == LocationPermission.denied) {
      return const LiveLocation(
        permissionDenied: true,
        errorMessage: 'La permission de localisation a été refusée.',
      );
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 18),
        ),
      );
      return LiveLocation(latitude: position.latitude, longitude: position.longitude);
    } catch (error) {
      // A freshly started Android GPS can time out. A recent cached position is
      // still useful for city/quarter prefill and is preferable to failing with
      // an empty form.
      try {
        final last = await Geolocator.getLastKnownPosition();
        if (last != null) {
          return LiveLocation(latitude: last.latitude, longitude: last.longitude);
        }
      } catch (_) {}
      return LiveLocation(errorMessage: 'Position introuvable : $error');
    }
  }

  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();
  Future<bool> openAppSettings() => Geolocator.openAppSettings();
}
