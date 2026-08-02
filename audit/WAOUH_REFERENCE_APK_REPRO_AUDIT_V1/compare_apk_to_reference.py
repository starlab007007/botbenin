#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, sys, zipfile
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"Usage: {sys.argv[0]} REFERENCE.apk CANDIDATE.apk")
ref=Path(sys.argv[1]); cand=Path(sys.argv[2])
for p in (ref,cand):
    if not p.is_file(): raise SystemExit(f"Fichier absent: {p}")
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''): h.update(c)
    return h.hexdigest()
rs,cs=sha(ref),sha(cand)
print(f"REFERENCE SHA256 : {rs}")
print(f"CANDIDAT  SHA256 : {cs}")
if rs==cs:
    print("SUCCES ABSOLU: APK identiques octet par octet.")
    raise SystemExit(0)

def entries(p):
    with zipfile.ZipFile(p) as z:
        return {i.filename:(hashlib.sha256(z.read(i.filename)).hexdigest(),i.file_size,i.compress_type,i.CRC) for i in z.infolist()}
r,c=entries(ref),entries(cand)
missing=sorted(set(r)-set(c)); added=sorted(set(c)-set(r)); changed=[]
for k in sorted(set(r)&set(c)):
    if r[k]!=c[k]: changed.append(k)
print(f"Entrées référence={len(r)}, candidat={len(c)}, absentes={len(missing)}, ajoutées={len(added)}, modifiées={len(changed)}")
if missing:
    print("\nABSENTES:"); print('\n'.join('  '+x for x in missing[:80]))
if added:
    print("\nAJOUTEES:"); print('\n'.join('  '+x for x in added[:80]))
if changed:
    print("\nMODIFIEES:")
    for x in changed[:160]: print(f"  {x}\n    ref={r[x][0]} size={r[x][1]} comp={r[x][2]}\n    new={c[x][0]} size={c[x][1]} comp={c[x][2]}")
critical=set(changed)
print("\nDIAGNOSTIC:")
if 'lib/arm64-v8a/libapp.so' in critical:
    print("- libapp.so diffère: le code Dart, pubspec.lock, les assets déclarés, les options de compilation ou le SDK Dart/Flutter ne sont pas identiques.")
if 'lib/arm64-v8a/libflutter.so' in critical:
    print("- libflutter.so diffère: la version/révision Flutter Engine n'est pas identique.")
if {'classes.dex','classes2.dex'} & critical:
    print("- classes.dex diffère: plugins Android, dépendances Gradle, AGP/Kotlin/JDK ou configuration Android différents.")
if 'AndroidManifest.xml' in critical:
    print("- AndroidManifest.xml diffère: package/version/permissions/manifest fusionné différents.")
if 'resources.arsc' in critical:
    print("- resources.arsc diffère: ressources Android ou versions de dépendances différentes.")
if not changed and not missing and not added:
    print("- Toutes les entrées décompressées sont identiques; seule la structure ZIP ou la signature diffère. Vérifier la clé de signature, l'ordre ZIP et l'outil de packaging.")
else:
    print("- Tant qu'une entrée critique diffère, le dépôt/environnement n'est pas une reproduction exacte.")
raise SystemExit(2)
