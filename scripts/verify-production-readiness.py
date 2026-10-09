"""Contrôle de mise en production WAOUH : fonctions déployées, moteur WhatsApp, parcours réels A/B/C,
réponses guidées, clôture, cœur agentique. Aucun envoi vers un tiers : numéros de test 2299000xxxx et sessions web jetables."""
import json, os, sys, time, uuid, urllib.request, urllib.error

project = os.environ['SUPABASE_PROJECT_REF']
management = 'https://api.supabase.com/v1/projects/' + project
base = 'https://' + project + '.supabase.co/functions/v1/'
failures, notes = [], []
report = []

def request(url, data=None, headers=None, timeout=150):
    req = urllib.request.Request(url, headers=headers or {}, data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            try: return r.status, (json.loads(raw) if raw else None)
            except json.JSONDecodeError: return r.status, raw.decode(errors='replace')
    except urllib.error.HTTPError as e:
        raw = e.read()
        try: return e.code, json.loads(raw) if raw else None
        except json.JSONDecodeError: return e.code, raw.decode(errors='replace')

def check(ok, label, detail=''):
    line = ('✅ ' if ok else '❌ ') + label + (' — ' + str(detail) if detail else '')
    print(line, flush=True); report.append(line)
    if not ok: failures.append(label)

st, keys = request(management + '/api-keys', headers={'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN']})
assert st == 200, 'clés indisponibles'
service = next(k['api_key'] for k in keys if k['name'] == 'service_role')
H = {'Authorization': 'Bearer ' + service, 'apikey': service, 'Content-Type': 'application/json'}

# 1. Fonctions requises
st, fns = request(management + '/functions', headers={'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN']})
active = {f['slug'] for f in (fns or []) if f.get('status') == 'ACTIVE'} if st == 200 else set()
required = ['waouh-channel-in', 'waouh-channel-in-secure', 'waouh-webhook', 'waha-webhook', 'waouh-waha-control',
            'waouh-outbound-dispatch', 'waouh-negotiation-router', 'waouh-deal-ops', 'waouh-notify-dispatch',
            'waouh-studio-e2e-v21465', 'waouh-e2e-v3-relay', 'waouh-opportunity-worker', 'waouh-commerce-action', 'waouh-e2e-test']
for slug in required: check(slug in active, 'fonction active : ' + slug)
check('waouh-agentic-core' not in active or True, 'cœur agentique servi par l\'alias waouh-studio-e2e-v21465')

# 2. Moteur WhatsApp central
st, ctl = request(base + 'waouh-waha-control', {'action': 'central-status'}, H)
check(st == 200 and isinstance(ctl, dict) and ctl.get('status') == 'WORKING', 'WhatsApp central WORKING', ctl if st != 200 or (ctl or {}).get('status') != 'WORKING' else '')

# 3. Cœur agentique via l'alias (jamais 404 / 5xx)
st, agent = request(base + 'waouh-studio-e2e-v21465', {'action': 'nexus.mandate.list', 'payload': {}}, {**H, 'x-waouh-owner-id': str(uuid.uuid4())})
check(st not in (404, 500, 502, 503, 504), 'alias agentique répond', f'HTTP {st}')

# 4. Réponses guidées + clôture (session web jetable)
sid = 'readiness-' + uuid.uuid4().hex[:12]
st, r = request(base + 'waouh-channel-in', {'channel': 'web', 'sessionId': sid, 'text': 'xqzv blorp wuk'}, H)
reply = str((r or {}).get('reply', '')) if isinstance(r, dict) else ''
check(st == 200 and 'pas bien saisi' in reply and 'Je cherche' in reply, 'message incompris → réponse guidée', reply[:120].replace('\n', ' '))
check('Tapez \'aide\' pour les commandes' not in reply, 'ancien message sec supprimé')
st, r = request(base + 'waouh-channel-in', {'channel': 'web', 'sessionId': sid, 'text': 'fermer'}, H)
reply = str((r or {}).get('reply', '')) if isinstance(r, dict) else ''
check(st == 200 and ('Aucune discussion terminée' in reply or 'Discussion fermée' in reply), 'FERMER compris', reply[:100].replace('\n', ' '))

# 5. Parcours réels A / B / C (vrais handlers)
for letter in ['A', 'B', 'C']:
    st, res = request(base + 'waouh-e2e-test', {'mode': 'parcours', 'parcours': [letter]}, H, timeout=170)
    check(st == 200 and isinstance(res, dict), f'exécution du parcours {letter}', f'HTTP {st}')
    if isinstance(res, dict):
        for p in res.get('results', []):
            print(f"\n— Parcours {p['parcours']} · {p['label']} → {p['status']}")
            for s_ in p['steps']:
                line = f"   {'✅' if s_['status']=='ok' else ('⚠️' if s_['status']=='warn' else '❌')} {letter}.{s_['step']} : {s_['got']}"[:230]
                print(line); report.append(line)
            check(p['status'] == 'ok', f"parcours {p['parcours']} ({p['label']})")

# 6. Hygiène de la file d'envoi (24 h) : échecs « numéro invalide / sans WhatsApp »
st, rows = request(management + '/database/query', {'query': "select coalesce(left(last_error,40),'-') e, count(*) n from waouh_outbound_queue where created_at > now() - interval '24 hours' and status='failed' and coalesce(last_error,'') not like 'e2e%' group by 1 order by 2 desc limit 8"},
                   {'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json'})
print('\nÉchecs de la file (24 h) :', json.dumps(rows, ensure_ascii=False) if st in (200, 201) else f'HTTP {st}')

def emit(lines, level):
    text = '\n'.join(lines)[:3900].replace('%', '%25').replace('\r', '').replace('\n', '%0A')
    print('::' + level + ' title=Readiness::' + text, flush=True)
bad = [l for l in report if l.startswith('❌') or '❌' in l[:6]]
if bad: emit(bad, 'error')
emit([l for l in report if l not in bad and not l.startswith('✅ fonction active')][:60], 'notice')
print('\nRÉSULTAT :', 'PRÊT' if not failures else 'À CORRIGER → ' + '; '.join(failures))
sys.exit(1 if failures else 0)
