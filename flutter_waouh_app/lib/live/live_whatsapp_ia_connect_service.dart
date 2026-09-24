import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_repository.dart';

/// Adaptateur de connexion pour la feuille QR / code.
///
/// Les appels passent exclusivement par le repository du nouveau Studio,
/// donc par `waha-session-mobile`.
class LiveWhatsAppIaConnectService {
  const LiveWhatsAppIaConnectService(this.repository);

  final LiveWhatsAppIaRepository repository;

  Future<String> fetchQr(String sessionName) => repository.fetchQr(sessionName);

  Future<LivePairCode> pairingCode({
    required String sessionName,
    required String phone,
  }) =>
      repository.pairingCode(
        sessionName: sessionName,
        phone: phone,
      );
}
