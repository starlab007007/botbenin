
export type GuestUser = {
  id: string; // identifiant unique (UUID)
  displayName: string;
  isGuest: true;
  createdAt: string;
};

const GUEST_KEY = "botbj_guest_user";

function generateGuestName() {
  const adj = ["Curieux", "Aventureux", "Anonyme", "Sympa", "Dynamique", "Explorateur", "Créatif", "Mystère"];
  const ani = ["Chat", "Chouette", "Renard", "Abeille", "Koala", "Hérisson", "Panda", "Lynx"];
  return (
    adj[Math.floor(Math.random() * adj.length)] +
    " " +
    ani[Math.floor(Math.random() * ani.length)]
  );
}

function generateUUID() {
  // Simple UUIDv4 polyfill
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class GuestAuthService {
  static getGuestUser(): GuestUser {
    // Si déjà en localStorage => on relit.
    const raw = window?.localStorage?.getItem(GUEST_KEY);
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && user.id && user.displayName && user.isGuest) {
          return user;
        }
      } catch {}
    }
    // Créer un compte invité
    const guest: GuestUser = {
      id: generateUUID(),
      displayName: generateGuestName(),
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    window?.localStorage?.setItem(GUEST_KEY, JSON.stringify(guest));
    return guest;
  }

  static clearGuest() {
    window?.localStorage?.removeItem(GUEST_KEY);
  }
}
