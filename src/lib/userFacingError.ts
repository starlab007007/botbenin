/**
 * Converts technical/runtime errors into stable user-facing messages.
 * Full errors must stay in logs/monitoring; UI gets only actionable language.
 */
export type UiErrorContext =
  | "load"
  | "save"
  | "send"
  | "upload"
  | "delete"
  | "auth"
  | "logout"
  | "network"
  | "generic";

export type UiErrorMessage = {
  title: string;
  description: string;
};

const offline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

export function toUserFacingError(
  error: unknown,
  context: UiErrorContext = "generic",
): UiErrorMessage {
  const anyError = error as any;
  const raw = String(
    typeof error === "string"
      ? error
      : anyError?.message ?? anyError?.details ?? anyError?.error ?? "",
  ).toLowerCase();
  const code = String(anyError?.code ?? anyError?.error_code ?? "").toLowerCase();
  const status = Number(anyError?.status ?? anyError?.statusCode ?? 0);

  if (
    offline() ||
    raw.includes("failed to fetch") ||
    raw.includes("network request failed") ||
    raw.includes("networkerror") ||
    raw.includes("socket") ||
    raw.includes("connection refused")
  ) {
    return {
      title: "Connexion internet indisponible",
      description: "Vérifiez votre connexion puis réessayez.",
    };
  }

  if (
    raw.includes("timeout") ||
    raw.includes("timed out") ||
    code.includes("timeout")
  ) {
    return {
      title: "Le service met trop de temps à répondre",
      description: "Réessayez dans quelques instants.",
    };
  }

  if (status === 401 || code === "401" || raw.includes("jwt expired")) {
    return {
      title: "Session expirée",
      description: "Reconnectez-vous pour continuer.",
    };
  }

  if (
    status === 403 ||
    code === "42501" ||
    raw.includes("permission denied") ||
    raw.includes("not authorized") ||
    raw.includes("unauthorized")
  ) {
    return {
      title: "Action non autorisée",
      description: "Votre compte n'a pas accès à cette action.",
    };
  }

  if (status === 404 || raw.includes("not found")) {
    return {
      title: "Élément introuvable",
      description: "Ce contenu n'est plus disponible ou a été déplacé.",
    };
  }

  if (
    status === 409 ||
    code === "23505" ||
    raw.includes("duplicate key") ||
    raw.includes("already exists")
  ) {
    return {
      title: "Déjà enregistré",
      description: "Cette information existe déjà. Vérifiez puis réessayez.",
    };
  }

  if (status === 413 || raw.includes("payload too large")) {
    return {
      title: "Fichier trop volumineux",
      description: "Choisissez un fichier plus léger puis réessayez.",
    };
  }

  if (status === 429 || raw.includes("rate limit") || raw.includes("too many requests")) {
    return {
      title: "Trop de tentatives",
      description: "Patientez quelques instants avant de réessayer.",
    };
  }

  if (status >= 500 || raw.includes("internal server") || raw.includes("server error")) {
    return {
      title: "Service temporairement indisponible",
      description: "Réessayez dans quelques instants.",
    };
  }

  const defaults: Record<UiErrorContext, UiErrorMessage> = {
    load: {
      title: "Chargement impossible",
      description: "Impossible de charger ces informations. Réessayez.",
    },
    save: {
      title: "Enregistrement impossible",
      description: "Vos modifications n'ont pas été enregistrées. Réessayez.",
    },
    send: {
      title: "Envoi impossible",
      description: "Le message n'a pas pu être envoyé. Réessayez.",
    },
    upload: {
      title: "Import impossible",
      description: "Le fichier n'a pas pu être envoyé. Réessayez.",
    },
    delete: {
      title: "Suppression impossible",
      description: "Cet élément n'a pas pu être supprimé. Réessayez.",
    },
    auth: {
      title: "Connexion impossible",
      description: "Vérifiez vos informations puis réessayez.",
    },
    logout: {
      title: "Déconnexion impossible",
      description: "Réessayez dans quelques instants.",
    },
    network: {
      title: "Connexion indisponible",
      description: "Vérifiez votre connexion puis réessayez.",
    },
    generic: {
      title: "Une action n'a pas abouti",
      description: "Réessayez. Si le problème persiste, contactez le support.",
    },
  };

  return defaults[context];
}

export const userFacingErrorText = (
  error: unknown,
  context: UiErrorContext = "generic",
) => toUserFacingError(error, context).description;
