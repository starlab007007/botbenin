"""Inspect the explicitly authorized central WAHA account without printing secrets."""
import json
import os
import urllib.request
import urllib.error

project = os.environ['SUPABASE_PROJECT_REF']
management = 'https://api.supabase.com/v1/projects/' + project
headers = {'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json'}

def request(url, data=None, auth=None):
    req = urllib.request.Request(url, headers=auth or headers, data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.status, json.load(response)
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
