"""Test de fumée de l'APK WAOUH publié sur un émulateur Android.

Pilote l'application par adb (arbre d'accessibilité + captures d'écran) :
lancement, connexion e-mail avec un compte de test jetable, recherche, écran des
résultats et principaux onglets. Aucune action qui contacterait un vrai vendeur
(« Intéressé », « Bot ») n'est déclenchée.

Sorties dans OUT_DIR : captures PNG, arbres XML, logcat, report.json, summary.md.
"""
import json
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

PKG = "bj.bot.waouhapp"
OUT = os.environ.get("OUT_DIR", "emulator-out")
EMAIL = os.environ.get("TEST_EMAIL", "")
PASSWORD = os.environ.get("TEST_PASSWORD", "")
os.makedirs(OUT, exist_ok=True)
steps = []


def sh(*args, check=False, timeout=120):
    r = subprocess.run(["adb", *args], capture_output=True, text=True, timeout=timeout)
    if check and r.returncode != 0:
        raise RuntimeError(f"adb {' '.join(args)} -> {r.stdout}{r.stderr}")
    return r.stdout


def shot(name):
    path = os.path.join(OUT, f"{len(steps) + 1:02d}_{name}.png")
    with open(path, "wb") as f:
        f.write(subprocess.run(["adb", "exec-out", "screencap", "-p"], capture_output=True, timeout=60).stdout)
    return path


def dump(name=None):
    for _ in range(3):
        sh("shell", "uiautomator", "dump", "/sdcard/ui.xml", timeout=60)
        raw = sh("shell", "cat", "/sdcard/ui.xml")
        if raw.strip().startswith("<?xml"):
            if name:
                with open(os.path.join(OUT, f"{len(steps) + 1:02d}_{name}.xml"), "w") as f:
                    f.write(raw)
            try:
                parsed = ET.fromstring(raw)
            except ET.ParseError:
                parsed = None
            if parsed is not None and dismiss_system_dialogs(parsed):
                continue
            if parsed is not None:
                return parsed
        time.sleep(2)
    return None


def dismiss_system_dialogs(root):
    """Fenêtre système de l'émulateur (« … isn't responding ») : on attend, sans fermer l'app testée."""
    if root is None or find(root, r"isn.t responding|ne répond pas") is None:
        return False
    btn = find(root, r"^\s*(Wait|Attendre)\s*$")
    if btn is not None:
        tap(btn)
    else:
        sh("shell", "input", "keyevent", "4")
    time.sleep(2)
    return True


def nodes(root):
    return [] if root is None else list(root.iter("node"))


def label(n):
    return (n.get("text") or "") + " " + (n.get("content-desc") or "")


def visible_text(root):
    seen = []
    for n in nodes(root):
        t = " ".join(label(n).split())
        if t and t not in seen:
            seen.append(t)
    return seen


def center(n):
    a, b, c, d = map(int, re.findall(r"\d+", n.get("bounds", "[0,0][0,0]")))
    return (a + c) // 2, (b + d) // 2


def find(root, pattern, cls=None):
    rx = re.compile(pattern, re.I)
    for n in nodes(root):
        if cls and cls not in (n.get("class") or ""):
            continue
        if rx.search(label(n)):
            return n
    return None


def find_lowest(root, pattern):
    rx = re.compile(pattern, re.I)
    hits = [n for n in nodes(root) if rx.search(label(n)) and "EditText" not in (n.get("class") or "")]
    return max(hits, key=lambda n: center(n)[1]) if hits else None


def tap(n):
    x, y = center(n)
    sh("shell", "input", "tap", str(x), str(y))


def type_text(value):
    # adb « input text » : les espaces s'écrivent %s.
    sh("shell", "input", "text", value.replace(" ", "%s"))


def alive():
    return bool(sh("shell", "pidof", PKG).strip())


def wait_for(pattern, timeout=60, name=None):
    end = time.time() + timeout
    root = None
    while time.time() < end:
        root = dump()
        if root is not None and find(root, pattern) is not None:
            break
        time.sleep(3)
    if name:
        dump(name)
    return root


def step(name, ok, detail, root=None, critical=False):
    image = shot(name)
    texts = visible_text(root)[:25] if root is not None else []
    steps.append({"step": name, "ok": bool(ok), "critical": critical, "detail": detail,
                  "screenshot": os.path.basename(image), "visible": texts, "app_running": alive()})
    print(("OK   " if ok else "FAIL ") + f"{name}: {detail}", flush=True)


def skip_intro():
    """Écran d'accueil (3 pages) affiché au premier lancement : « Passer »."""
    for _ in range(3):
        root = dump()
        btn = find(root, r"^\s*Passer\s*$") if root is not None else None
        if btn is None:
            return root
        tap(btn)
        time.sleep(3)
    return dump()


def deep_link(path):
    sh("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW",
       "-d", f"https://bot.bj{path}", PKG, timeout=90)
    time.sleep(3)
    skip_intro()


def main():
    apk = sys.argv[1]
    out = sh("install", "-r", "-g", apk, timeout=600)
    installed = "Success" in out
    print(out)
    sh("logcat", "-c")
    if not installed:
        steps.append({"step": "installation", "ok": False, "critical": True, "detail": out.strip()[-400:]})
        return finish()

    sh("shell", "am", "start", "-W", "-n", f"{PKG}/.MainActivity", timeout=120)
    root = wait_for(r"WaouhApp|Continuer|Avatar|Bot|Passer", 120, "launch")
    step("lancement", alive() and root is not None and len(visible_text(root)) > 0,
         "Application ouverte, premier écran affiché" if alive() else "L'application s'est fermée au lancement",
         root, critical=True)
    if not alive():
        return finish()

    root = skip_intro()
    step("accueil_passe", root is not None and find(root, r"^\s*Passer\s*$") is None,
         "Écran de bienvenue passé", root)

    # Connexion e-mail avec le compte de test jetable.
    if EMAIL and PASSWORD:
        if not find(root, r"Continuer avec Email"):
            deep_link("/app/auth")
            root = wait_for(r"Continuer avec Email", 45)
        btn = find(root, r"Continuer avec Email")
        if btn is not None:
            tap(btn)
            root = wait_for(r"Mot de passe", 45, "auth_email")
            # Écran d'inscription par défaut ? Basculer sur la connexion si proposé.
            switch = find(root, r"^(?!.*Continuer).*(Se connecter|J.ai déjà un compte|Connexion)")
            if switch is not None and find(root, r"Confirmer le mot de passe"):
                tap(switch)
                root = wait_for(r"Mot de passe", 20)
            fields = [n for n in nodes(root) if "EditText" in (n.get("class") or "")]
            email_field = find(root, r"E-?mail", "EditText") or (fields[0] if fields else None)
            pass_field = find(root, r"Mot de passe", "EditText") or (fields[1] if len(fields) > 1 else None)
            if email_field is not None and pass_field is not None:
                tap(email_field); time.sleep(1); type_text(EMAIL)
                tap(pass_field); time.sleep(1); type_text(PASSWORD)
                sh("shell", "input", "keyevent", "111")  # fermer le clavier
                time.sleep(1)
                root = dump()
                submit = find_lowest(root, r"^\s*Se connecter\s*$") or find_lowest(root, r"Se connecter|Connexion")
                if submit is not None:
                    tap(submit)
                root = wait_for(r"Avatar|Acheter|Vendre|Missions|Que cherchez|Bonjour", 60, "after_login")
                logged = root is not None and not find(root, r"Mot de passe")
                step("connexion", logged, "Connexion avec le compte de test" if logged else "Écran de connexion toujours affiché", root)
            else:
                step("connexion", False, "Champs e-mail / mot de passe introuvables", root)
        else:
            step("connexion", False, "Bouton « Continuer avec Email » introuvable", root)

    # Recherche d'un produit puis écran des résultats.
    deep_link("/app/avatar/acheter")
    root = wait_for(r"cherche|Acheter|Que", 45, "acheter")
    step("parcours_acheter", alive() and root is not None, "Écran d'achat ouvert", root, critical=True)
    field = next((n for n in nodes(root) if "EditText" in (n.get("class") or "")), None)
    if field is not None:
        tap(field); time.sleep(1); type_text("iPhone 13 Cotonou")
        sh("shell", "input", "keyevent", "66")
        time.sleep(3)
        root = dump()
        go = find(root, r"^\s*(Rechercher|Chercher|Envoyer|Lancer)")
        if go is not None:
            tap(go)
        root = wait_for(r"Intéressé|Demander un devis|Postuler|Confier|Aucun vendeur|Bot recommande", 120, "results")
        has_results = root is not None and find(root, r"Intéressé|Confier|Aucun vendeur joignable|Bot recommande") is not None
        step("resultats", has_results,
             "Résultats affichés avec les actions (Intéressé / Bot)" if has_results else "Aucun résultat visible après 2 minutes", root)
    else:
        step("resultats", False, "Champ de recherche introuvable sur l'écran d'achat", root)

    # Recherche depuis l'écran d'échange : le raisonnement doit s'afficher en direct.
    deep_link("/app/deal-room")
    root = wait_for(r"Que cherchez-vous", 45)
    fields = [n for n in nodes(root) if "EditText" in (n.get("class") or "")]
    if len(fields) >= 2:
        tap(fields[0]); time.sleep(1); type_text("un bic")
        tap(fields[1]); time.sleep(1)
        sh("shell", "input", "keyevent", "123")  # fin du champ
        for _ in range(30):
            sh("shell", "input", "keyevent", "67")  # efface la ville
        type_text("Abomey-Calavi")
        sh("shell", "input", "keyevent", "111")
        time.sleep(1)
        go = find_lowest(dump(), r"^\s*Rechercher\s*$")
        if go is not None:
            tap(go)
        time.sleep(5)
        root = dump("reasoning_live")
        live = root is not None and find(root, r"Bot réfléchit|Mon raisonnement") is not None
        step("raisonnement_en_direct", live,
             "Le raisonnement de Bot s'affiche pendant la recherche" if live else "Aucun raisonnement visible pendant la recherche", root)
        root = wait_for(r"Bilan|Aucune offre assez proche", 120, "reasoning_done")
        done = root is not None and find(root, r"Bilan|Aucune offre assez proche") is not None
        step("raisonnement_bilan", done, "Bilan de la recherche affiché" if done else "Pas de bilan après 2 minutes", root)
    else:
        step("raisonnement_en_direct", False, "Champs de recherche de l'échange introuvables", root)

    for path, name, rx in [("/app/missions", "missions", r"Mission|Suivi|Bot"),
                           ("/app/chat", "chat", r"Chat|Message|Discussion|WAOUH"),
                           ("/app/notifications", "notifications", r"Notification|Aucune"),
                           ("/app/deal-room", "deal_room", r"échange|Recherche|Que cherchez")]:
        deep_link(path)
        root = wait_for(rx, 40, name)
        step(name, alive() and root is not None and len(visible_text(root)) > 0, f"Écran {path} affiché", root, critical=True)
    return finish()


def finish():
    log = sh("logcat", "-d", timeout=120)
    with open(os.path.join(OUT, "logcat.txt"), "w") as f:
        f.write(log)
    lines_all = log.splitlines()
    crashes = [l for l in lines_all if "FATAL EXCEPTION" in l or ("AndroidRuntime" in l and PKG in l)]
    # Cause du plantage : lignes AndroidRuntime / natives / chargeur de bibliothèques.
    cause = [l for l in lines_all if re.search(r"AndroidRuntime|DEBUG   :|libflutter|UnsatisfiedLink|dlopen|native_bridge|houdini|ndk_translation|Abort message|signal \d+ \(SIG", l)][:60]
    with open(os.path.join(OUT, "crash.txt"), "w") as f:
        f.write("\n".join(cause))
    flutter_errors = [l for l in log.splitlines() if re.search(r"flutter.*(Exception|Error|══╡)", l)]
    anr = [l for l in log.splitlines() if "ANR in " + PKG in l]
    ok = all(s["ok"] for s in steps if s.get("critical")) and not crashes and not anr
    report = {"ok": ok, "steps": steps, "crashes": crashes[:20], "crash_cause": cause, "anr": anr[:5],
              "flutter_errors": flutter_errors[:40]}
    with open(os.path.join(OUT, "report.json"), "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    lines = ["## Test WAOUH Android sur émulateur", "", f"Résultat global : **{'réussi' if ok else 'échec'}**", "",
             "| Étape | Résultat | Détail |", "|---|---|---|"]
    lines += [f"| {s['step']} | {'✅' if s['ok'] else '❌'} | {s['detail']} |" for s in steps]
    lines += ["", f"Plantages : {len(crashes)} · Blocages (ANR) : {len(anr)} · Erreurs Flutter journalisées : {len(flutter_errors)}"]
    with open(os.path.join(OUT, "summary.md"), "w") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(lines))
    if cause:
        print("--- Cause du plantage (extrait du journal) ---")
        print("\n".join(l[-260:] for l in cause[:40]))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
