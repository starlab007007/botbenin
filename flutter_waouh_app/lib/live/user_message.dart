String waouhUserMessage(
  Object? error, {
  String action = 'generic',
}) {
  final raw = (error?.toString() ?? '').toLowerCase();

  if (raw.contains('invalid login') ||
      raw.contains('invalid credentials') ||
      raw.contains('invalid_credentials')) {
    return 'Email ou mot de passe incorrect. Vérifiez vos informations puis réessayez.';
  }

  if (raw.contains('email not confirmed') ||
      raw.contains('email_not_confirmed')) {
    return 'Confirmez votre adresse email avant de vous connecter.';
  }

  if (raw.contains('already registered') ||
      raw.contains('user already exists') ||
      raw.contains('user_already_exists')) {
    return 'Un compte existe déjà avec ces informations. Essayez de vous connecter.';
  }

  if (raw.contains('weak password') ||
      raw.contains('password should be at least')) {
    return 'Choisissez un mot de passe d’au moins 6 caractères.';
  }

  if ((raw.contains('otp') && raw.contains('expired')) ||
      raw.contains('token has expired')) {
    return 'Ce code a expiré. Demandez un nouveau code.';
  }

  if (raw.contains('invalid otp') ||
      raw.contains('otp_invalid') ||
      raw.contains('code invalide')) {
    return 'Le code saisi est incorrect. Vérifiez-le puis réessayez.';
  }

  if (raw.contains('rate limit') ||
      raw.contains('too many requests') ||
      raw.contains('status: 429') ||
      raw.contains('statuscode: 429')) {
    return 'Trop de tentatives. Patientez quelques instants avant de réessayer.';
  }

  if (raw.contains('failed to fetch') ||
      raw.contains('network') ||
      raw.contains('socketexception') ||
      raw.contains('connection refused') ||
      raw.contains('clientexception')) {
    return 'Connexion internet indisponible. Vérifiez votre réseau puis réessayez.';
  }

  if (raw.contains('timeout') || raw.contains('timed out')) {
    return 'Le service met trop de temps à répondre. Réessayez dans quelques instants.';
  }

  if (raw.contains('401') ||
      raw.contains('jwt expired') ||
      raw.contains('auth_required')) {
    return 'Votre session a expiré. Reconnectez-vous pour continuer.';
  }

  if (raw.contains('403') ||
      raw.contains('permission denied') ||
      raw.contains('unauthorized') ||
      raw.contains('not authorized')) {
    return 'Votre compte n’a pas accès à cette action.';
  }

  if (raw.contains('404') || raw.contains('not found')) {
    return 'Ce contenu n’est plus disponible ou a été déplacé.';
  }

  if (raw.contains('413') || raw.contains('payload too large')) {
    return 'Le fichier est trop volumineux. Choisissez un fichier plus léger.';
  }

  if (raw.contains('409') ||
      raw.contains('duplicate key') ||
      raw.contains('already exists')) {
    return 'Cette information existe déjà. Vérifiez puis réessayez.';
  }

  if (raw.contains('500') ||
      raw.contains('internal server') ||
      raw.contains('server error') ||
      raw.contains('service unavailable')) {
    return 'Le service est temporairement indisponible. Réessayez dans quelques instants.';
  }

  return switch (action) {
    'login' => 'Connexion impossible. Vérifiez vos informations puis réessayez.',
    'register' => 'Création du compte impossible pour le moment. Réessayez.',
    'reset' => 'La demande de réinitialisation n’a pas pu être traitée. Réessayez.',
    'logout' => 'Déconnexion impossible. Réessayez dans quelques instants.',
    'save' => 'Vos modifications n’ont pas été enregistrées. Réessayez.',
    'upload' => 'Le fichier n’a pas pu être envoyé. Réessayez.',
    'send' => 'Le message n’a pas pu être envoyé. Réessayez.',
    'load' => 'Impossible de charger ces informations. Réessayez.',
    'delete' => 'La suppression n’a pas pu être effectuée. Réessayez.',
    _ => 'Cette action n’a pas abouti. Réessayez dans quelques instants.',
  };
}

bool waouhLooksTechnical(String value) {
  final v = value.toLowerCase();
  return v.contains('exception') ||
      v.contains('postgrest') ||
      v.contains('supabase') ||
      v.contains('stack trace') ||
      v.contains('sqlstate') ||
      v.contains('pgrst') ||
      v.contains('jwt') ||
      v.contains('http://') ||
      v.contains('https://');
}
