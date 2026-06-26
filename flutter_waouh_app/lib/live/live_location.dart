import 'package:geolocator/geolocator.dart';

class LiveLocation {
  const LiveLocation({this.latitude, this.longitude});

  final double? latitude;
  final double? longitude;

  bool get available => latitude != null && longitude != null;
}

class LiveLocationService {
  Future<LiveLocation> requestCurrent() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return const LiveLocation();
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return const LiveLocation();
    }
    try {
      final value = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 12),
        ),
      );
      return LiveLocation(latitude: value.latitude, longitude: value.longitude);
    } catch (_) {
      return const LiveLocation();
    }
  }
}
