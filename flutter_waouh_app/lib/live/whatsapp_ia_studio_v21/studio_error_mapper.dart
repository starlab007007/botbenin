class StudioErrorMapper {
  const StudioErrorMapper._();

  static String message(
    Object error, {
    String? operation,
  }) {
    var raw = '$error'
        .replaceFirst('Bad state: ', '')
        .replaceFirst('StateError: ', '')
        .replaceFirst('Exception: ', '')
        .replaceAll(RegExp(r'FunctionException\([^)]*\)'), '')
        .replaceAll(RegExp(r'PostgrestException\([^)]*\)'), '')
        .trim();
    final value = raw.toLowerCase();

    if (_contains(value, const [
      'ai_key_missing',
    ])) {
      return 'La clé du moteur IA n’est pas configurée sur le serveur. '
          'Exécutez entièrement l’installateur V21.4.6.24 et saisissez '
          'une clé API valide.';
    }

    if (_contains(value, const [
      'ai_key_invalid',
      'api key not valid',
      'api key invalid',
      'permission denied',
    ])) {
      return 'La clé du moteur IA est invalide ou bloquée. '
          'Créez ou réactivez une clé dans Google AI Studio, puis '
          'relancez l’installation.';
    }

    if (_contains(value, const [
      'ai_quota_exceeded',
      'resource exhausted',
      'quota exceeded',
      'rate limit',
    ])) {
      return 'Le quota du moteur IA est temporairement atteint. '
          'Patientez puis réessayez, ou vérifiez les limites du projet.';
    }

    if (_contains(value, const [
      'ai_model_unavailable',
      'model not found',
      'model is not found',
      'model is not supported',
    ])) {
      return 'Le modèle IA configuré n’est pas disponible. '
          'Relancez entièrement l’installation pour rétablir le modèle stable.';
    }

    if (_contains(value, const [
      'ai_timeout',
      'génération de la réponse a dépassé le délai',
      'generation de la reponse a depasse le delai',
    ])) {
      return 'Le moteur IA met trop de temps à répondre. '
          'Vérifiez Internet puis réessayez dans quelques secondes.';
    }

    if (_contains(value, const [
      'agent_transport_not_ready',
      'transport_ready',
      'no_active_agent',
    ])) {
      return 'L’agent n’est pas encore correctement relié à la ligne. '
          'Vérifiez que la session est connectée et qu’un seul agent '
          'est actif sur cette ligne.';
    }

    if (_contains(value, const [
      'whatsapp_accounts_status_check',
      'violates check constraint',
    ])) {
      return 'Le statut technique de la ligne n’est pas compatible '
          'avec la base de données. Le correctif V21.4.6.24 doit être '
          'déployé avant de créer cette ligne.';
    }

    if (_contains(value, const [
      'pair_backend_outdated',
      'fonction dédiée au code numéro n’est pas déployée',
      "fonction dédiée au code numéro n'est pas déployée",
    ])) {
      return 'Le backend dédié au code numéro n’est pas installé. '
          'Exécutez entièrement l’installateur V21.4.6.2.';
    }

    if (_contains(value, const [
      'pair_backend_timeout',
      'backend dédié au code numéro',
    ])) {
      return 'Le service de code numéro ne répond pas. '
          'Vérifiez Internet puis réessayez.';
    }

    if (_contains(value, const [
      'pair_code_proxy_rewrite',
      'réécrit l’endpoint officiel',
      "réécrit l'endpoint officiel",
    ])) {
      return 'Le proxy WAHA utilise encore une ancienne route. '
          'Mettez à jour le proxy ou l’image WAHA, puis réessayez. '
          'Le QR Code reste disponible.';
    }

    if (_contains(value, const [
      'pair_code_unsupported',
      'ne prend pas en charge le code numéro',
    ])) {
      return 'Le serveur WAHA ou la fonction Supabase utilise une route de code incorrecte. '
          'Exécutez entièrement V21.4.6.2. Le QR Code reste disponible.';
    }

    if (_contains(value, const [
      'pair_code_empty',
      'sans fournir de code',
    ])) {
      return 'WAHA n’a retourné aucun code. Redémarrez la session et '
          'réessayez, ou utilisez le QR Code.';
    }

    if (_contains(value, const [
      'pair_code_engine_not_ready',
      "reading 'evaluate'",
      'reading "evaluate"',
      'cannot read properties of null',
      'puppage',
    ])) {
      return 'Le navigateur WhatsApp du serveur n’est pas encore prêt. '
          'Attendez le statut SCAN_QR_CODE puis réessayez. Si l’erreur '
          'persiste, mettez WAHA à jour; le QR Code reste disponible.';
    }

    if (_contains(value, const [
      'backend_outdated',
      'backend de connexion whatsapp n’est pas la version',
      "backend de connexion whatsapp n'est pas la version",
      'ne fournit pas la vérification v21.4.6',
    ])) {
      return 'Le backend de connexion WhatsApp n’est pas à jour. '
          'Exécutez complètement l’installateur V21.4.6.2 avant de '
          'générer le code.';
    }

    if (_contains(value, const [
      'backend_timeout',
      'impossible de vérifier le backend',
    ])) {
      return 'Le backend de connexion WhatsApp ne répond pas. '
          'Vérifiez Internet puis réessayez.';
    }

    if (_contains(value, const [
      'pair_code_unsupported',
      'cannot post /api/',
      'request-code',
    ])) {
      return 'Le code numéro n’est pas disponible sur ce serveur WAHA. '
          'Choisissez QR Code pour connecter cette ligne.';
    }

    if (_contains(value, const [
      'body already consumed',
      'body is unusable',
      'response body already',
    ])) {
      return 'La réponse du serveur WhatsApp a été interrompue. '
          'Actualisez la liste : si la ligne est encore visible, '
          'relancez la suppression.';
    }

    if (_contains(value, const [
      'local_delete_failed',
      'ligne locale n’a pas pu être supprimée',
      "ligne locale n'a pas pu être supprimée",
    ])) {
      return 'La session distante a été traitée, mais la ligne locale '
          'est encore présente. Actualisez puis relancez la suppression.';
    }

    if (_contains(value, const [
      'agent_delete_failed',
      'agent n’a pas pu être supprimé',
      "agent n'a pas pu être supprimé",
    ])) {
      return 'L’agent est encore présent. Actualisez puis relancez '
          'la suppression.';
    }

    if (_contains(value, const [
      'failed host lookup',
      'network is unreachable',
      'no route to host',
      'connection refused',
      'connection reset',
      'network request failed',
      'socketexception',
      'handshakeexception',
      'httpexception',
      'tls exception',
      'no address associated with hostname',
      'connection closed before full header',
      'clientexception',
      'err_internet_disconnected',
      'no internet',
      'hors connexion',
    ])) {
      return 'Aucune connexion Internet. Vérifiez les données mobiles ou le Wi-Fi, puis réessayez.';
    }

    if (_contains(value, const [
      'timeout',
      'timed out',
      'temps à répondre',
      'trop de temps',
      'waha_timeout',
      'network_timeout',
    ])) {
      return 'La connexion est trop lente. Vérifiez Internet et réessayez dans quelques secondes.';
    }

    if (_contains(value, const [
      'invalid_phone',
      'invalid phone',
      'phone number is not valid',
      'incorrect phone',
      'numéro incorrect',
      'numero incorrect',
      'format e.164',
      'e164',
      'bad phone',
    ])) {
      return 'Numéro WhatsApp incorrect. Choisissez le pays puis saisissez le numéro national sans répéter l’indicatif.';
    }

    if (_contains(value, const [
          'session_not_found',
          'unknown session',
          'session does not exist',
          'session not found',
          'session introuvable',
          'n’existe plus dans waha',
          "n'existe plus dans waha",
        ]) ||
        (value.contains('404') && value.contains('session'))) {
      return 'Cette session n’existe plus dans WAHA. Actualisez la liste, puis recréez ou supprimez la ligne locale.';
    }

    if (_contains(value, const [
      'session_disconnected',
      'not authenticated',
      'not logged',
      'already logged out',
      'scan_qr_code',
      'scan_qr',
      'whatsapp déconnecté',
      'whatsapp deconnecte',
      'session disconnected',
    ])) {
      return 'La session WhatsApp est déconnectée. Ouvrez la ligne et reconnectez-la par QR Code ou code numéro.';
    }

    if (_contains(value, const [
      'session_stopped',
      'session is stopped',
      'session arrêtée',
      'session arretee',
    ])) {
      return 'La session est arrêtée. Démarrez-la avant de générer le QR Code ou d’envoyer un message.';
    }

    if (_contains(value, const [
          'waha_unreachable',
          'waha n’a pas répondu',
          "waha n'a pas répondu",
          'waha indisponible',
          'bad gateway',
          'service unavailable',
          'gateway timeout',
        ]) ||
        value.contains('status: 502') ||
        value.contains('status: 503') ||
        value.contains('status: 504')) {
      return 'Le serveur WhatsApp est momentanément indisponible. Patientez quelques secondes puis réessayez.';
    }

    if (_contains(value, const [
      'qr expired',
      'qr code expired',
      'qr expiré',
      'qr expire',
    ])) {
      return 'Le QR Code a expiré. Générez un nouveau QR puis scannez-le immédiatement.';
    }

    if (_contains(value, const [
          'auth_required',
          'invalid_token',
          'session a expiré',
          'session expired',
        ]) ||
        value.contains('status: 401')) {
      return 'Votre connexion a expiré. Authentifiez-vous de nouveau pour continuer.';
    }

    if (value.contains('403') ||
        value.contains('forbidden') ||
        value.contains('permission refusée')) {
      return 'Accès refusé. Reconnectez-vous et gérez uniquement vos propres ressources.';
    }

    if (value.contains('n’appartient pas') ||
        value.contains("n'appartient pas")) {
      return 'Cette ressource ne vous appartient pas.';
    }

    if (_contains(value, const [
          'already exists',
          'existe déjà',
          'duplicate',
          'session_conflict',
        ]) ||
        value.contains('status: 409')) {
      return 'Cette ligne existe déjà. Actualisez la liste ou choisissez un autre nom.';
    }

    if (raw.isEmpty || raw == 'null') {
      return operation == null
          ? 'L’opération n’a pas pu être terminée. Réessayez.'
          : '$operation n’a pas pu être terminé. Réessayez.';
    }

    raw = raw
        .replaceAll(RegExp(r'\{success:[^}]*\}'), '')
        .replaceAll(RegExp(r'reasonPhrase:[^,)]+'), '')
        .replaceAll(RegExp(r'details:[^,)]+'), '')
        .trim();

    if (raw.length > 220) {
      raw = '${raw.substring(0, 220)}…';
    }

    return raw;
  }

  static bool _contains(
    String value,
    List<String> terms,
  ) {
    return terms.any(value.contains);
  }
}
