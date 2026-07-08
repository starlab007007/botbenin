/**
 * Traduit les erreurs techniques (Supabase, réseau, etc.) en messages
 * professionnels et clairs pour l'utilisateur final.
 */

export type FriendlyError = {
  title: string;
  description: string;
};

const isOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

export function friendlyAuthError(
  error: unknown,
  ctx: "login" | "register" | "reset" | "password" | "google" | "logout" | "generic" = "generic",
): FriendlyError {
  const raw =
    (typeof error === "string" ? error : (error as any)?.message) || "";
  const status = (error as any)?.status;
  const code = (error as any)?.code || (error as any)?.error_code;
  const msg = String(raw).toLowerCase();

  // Réseau / hors-ligne
  if (
    isOffline() ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed")
  ) {
    return {
      title: "Connexion internet indisponible",
      description:
        "Vérifiez votre connexion (Wi-Fi ou données mobiles) puis réessayez.",
    };
  }

  // Rate limit
  if (
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) {
    return {
      title: "Trop de tentatives",
      description:
        "Patientez quelques instants avant de réessayer, pour votre sécurité.",
    };
  }

  // Identifiants
  if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    code === "invalid_credentials"
  ) {
    return {
      title: "Identifiants incorrects",
      description:
        "L'email ou le mot de passe est incorrect. Vérifiez et réessayez.",
    };
  }

  if (msg.includes("email not confirmed") || code === "email_not_confirmed") {
    return {
      title: "Email non confirmé",
      description:
        "Ouvrez votre boîte mail et cliquez sur le lien de confirmation avant de vous connecter.",
    };
  }

  // Inscription
  if (
    msg.includes("user already registered") ||
    msg.includes("already registered") ||
    code === "user_already_exists"
  ) {
    return {
      title: "Compte déjà existant",
      description:
        "Un compte existe déjà avec cet email. Essayez de vous connecter ou de réinitialiser votre mot de passe.",
    };
  }

  if (msg.includes("password should be at least") || code === "weak_password") {
    return {
      title: "Mot de passe trop court",
      description:
        "Choisissez un mot de passe d'au moins 6 caractères (idéalement avec chiffres et symboles).",
    };
  }

  if (msg.includes("invalid email") || code === "validation_failed") {
    return {
      title: "Email invalide",
      description: "Vérifiez le format de votre adresse email (ex : nom@exemple.com).",
    };
  }

  // Réinitialisation
  if (msg.includes("email not found") || msg.includes("user not found")) {
    return {
      title: "Aucun compte trouvé",
      description:
        "Aucun compte n'est associé à cet email. Vérifiez ou créez un compte.",
    };
  }

  if (msg.includes("same password")) {
    return {
      title: "Mot de passe identique",
      description: "Le nouveau mot de passe doit être différent de l'ancien.",
    };
  }

  if (msg.includes("otp") && msg.includes("expired")) {
    return {
      title: "Code expiré",
      description: "Le code de vérification a expiré. Demandez un nouveau code.",
    };
  }

  if (msg.includes("invalid otp") || msg.includes("token has expired")) {
    return {
      title: "Code invalide",
      description: "Le code saisi est incorrect ou expiré. Réessayez.",
    };
  }

  // Serveur
  if ((typeof status === "number" && status >= 500) || msg.includes("server error")) {
    return {
      title: "Service temporairement indisponible",
      description: "Nos serveurs rencontrent un incident. Réessayez dans quelques instants.",
    };
  }

  // OAuth Google
  if (ctx === "google") {
    return {
      title: "Connexion Google impossible",
      description:
        "Impossible d'ouvrir la connexion Google. Vérifiez votre connexion puis réessayez.",
    };
  }

  // Défauts par contexte
  const defaults: Record<typeof ctx, FriendlyError> = {
    login: {
      title: "Connexion impossible",
      description: "Une erreur est survenue. Vérifiez vos informations puis réessayez.",
    },
    register: {
      title: "Inscription impossible",
      description: "Impossible de créer votre compte pour le moment. Réessayez dans un instant.",
    },
    reset: {
      title: "Réinitialisation impossible",
      description: "Impossible d'envoyer l'email de réinitialisation. Réessayez.",
    },
    password: {
      title: "Changement impossible",
      description: "Impossible de modifier votre mot de passe. Réessayez.",
    },
    google: {
      title: "Connexion Google impossible",
      description: "Réessayez dans un instant.",
    },
    logout: {
      title: "Déconnexion impossible",
      description: "Réessayez dans un instant.",
    },
    generic: {
      title: "Une erreur est survenue",
      description: "Merci de réessayer. Si le problème persiste, contactez le support.",
    },
  };

  return defaults[ctx];
}
