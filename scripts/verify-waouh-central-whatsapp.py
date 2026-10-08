"""Inspect the explicitly authorized central WAHA account without printing secrets."""
import json
import os
import urllib.request
import urllib.error
import secrets
import sys
import time

project = os.environ['SUPABASE_PROJECT_REF']
management = 'https://api.supabase.com/v1/projects/' + project
headers = {'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json'}

def request(url, data=None, auth=None):
    req = urllib.request.Request(url, headers=auth or headers, data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        return error.code, None

status, keys = request(management + '/api-keys')
assert status == 200, 'Cannot obtain project credentials'
service = next(row['api_key'] for row in keys if row['name'] == 'service_role')
edge_headers = {'Authorization': 'Bearer ' + service, 'apikey': service, 'Content-Type': 'application/json'}
status, data = request('https://' + project + '.supabase.co/functions/v1/waouh-waha-control', {'action': 'session-status', 'session': 'WaouhApp'}, edge_headers)
assert status == 200 and isinstance(data, dict), f'Central WAHA status failed HTTP {status}'
phone = ''.join(c for c in str((data.get('me') or {}).get('id', '')) .split('@')[0] if c.isdigit())
matched = phone in ('22965653468', '2290165653468')
print('::notice title=Central WhatsApp::Session WaouhApp; state=' + str(data.get('status')) + '; expected number matches=' + str(matched).lower())
hooks = (data.get('config') or {}).get('webhooks') or []
from urllib.parse import urlparse
print('::notice title=Central webhooks::' + json.dumps([{'path': urlparse(h.get('url', '')).path, 'events': h.get('events', [])} for h in hooks]))
assert data.get('status') == 'WORKING', 'Central WhatsApp session requires reconnection'
assert matched, 'Connected session identity does not match the authorized central number'

if '--connect' in sys.argv:
    status, configured = request(management + '/secrets')
    assert status == 200 and isinstance(configured,list), 'Cannot inspect central webhook secret configuration'
    names = {item.get('name') for item in configured}
    settings = [{'name':'WAHA_SESSION','value':'WaouhApp'}, {'name':'WAOUH_BUSINESS_PHONE','value':'22965653468'}]
    if 'WAHA_WEBHOOK_SECRET' not in names:
        settings.append({'name':'WAHA_WEBHOOK_SECRET','value':secrets.token_urlsafe(48)})
    status, _ = request(management + '/secrets', settings)
    assert status in (200,201), f'Central runtime configuration failed HTTP {status}'
    # Setting a missing secret creates a real configuration change; allow its propagation.
    result = None
    for attempt in range(12):
        status, result = request('https://' + project + '.supabase.co/functions/v1/waouh-waha-control', {'action':'central-connect'}, edge_headers)
        if status == 200 and result and result.get('identity_matches') and result.get('webhook_ready') and result.get('status') == 'WORKING':
            break
        time.sleep(5)
    assert status == 200 and result and result.get('identity_matches') and result.get('webhook_ready') and result.get('status') == 'WORKING', f'Central WhatsApp linkage verification failed HTTP {status}'
    print('::notice title=Central WhatsApp connected::WaouhApp · +229 65653468 verified; authenticated messages, replies, acknowledgements and session events configured. No external messages sent.')
    # Anonymous callers must not inject WhatsApp messages or delivery receipts.
    status, _ = request('https://' + project + '.supabase.co/functions/v1/waha-webhook',
        {'event':'message.any','session':'WaouhApp','payload':{'id':'release-denied','from':'22965653468@c.us','fromMe':False,'body':'unauthorized test'}},
        {'Content-Type':'application/json'})
    assert status == 401, f'Unauthenticated WhatsApp injection not denied HTTP {status}'
    print('::notice title=Central webhook protection::Unauthenticated central WhatsApp event denied.')
