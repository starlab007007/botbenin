"""Alert when WhatsApp delivery stops: central session down, or notifications failing/stuck.

Read-only. Exits non-zero (GitHub then notifies repository watchers) only for outage signals;
data problems on a single contact (no phone, invalid phone, number not on WhatsApp) are reported
as notices because they are not an engine outage.
"""
import json
import os
import sys
import urllib.error
import urllib.request

project = os.environ['SUPABASE_PROJECT_REF']
token = os.environ['SUPABASE_ACCESS_TOKEN']
management = 'https://api.supabase.com/v1/projects/' + project
WINDOW_HOURS = 3
STUCK_MINUTES = 20
MIN_FAILURES = 5


def request(url, body=None, headers=None):
    req = urllib.request.Request(url, headers=headers or {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
                                 data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        return error.code, None


def query(sql):
    status, rows = request(management + '/database/query', {'query': sql})
    assert status in (200, 201) and isinstance(rows, list), f'Cannot read delivery statistics HTTP {status}'
    return rows


problems = []

# 1) Central WhatsApp session
status, keys = request(management + '/api-keys')
assert status == 200 and isinstance(keys, list), 'Cannot obtain project credentials'
service = next(row['api_key'] for row in keys if row['name'] == 'service_role')
edge_headers = {'Authorization': 'Bearer ' + service, 'apikey': service, 'Content-Type': 'application/json'}
status, session = request('https://' + project + '.supabase.co/functions/v1/waouh-waha-control',
                          {'action': 'session-status', 'session': 'WaouhApp'}, edge_headers)
if status != 200 or not isinstance(session, dict):
    problems.append(f'Central WAHA unreachable (HTTP {status}).')
else:
    state = str(session.get('status'))
    phone = ''.join(c for c in str((session.get('me') or {}).get('id', '')).split('@')[0] if c.isdigit())
    print(f'::notice title=Central WhatsApp::session WaouhApp state={state}; expected number={phone in ("22965653468", "2290165653468")}')
    if state != 'WORKING':
        problems.append(f'Central WhatsApp session is {state}, not WORKING.')

# 2) Notification queue health (last hours)
row = query(f"""
select
  count(*) filter (where status='sent') as sent,
  count(*) filter (where status='failed' and coalesce(last_error,'') !~* '^(no phone|invalid phone|no WA contact|central_sender|contact_permission|mandate_inactive|journey_inactive|max_attempts)') as engine_failed,
  count(*) filter (where status='failed' and coalesce(last_error,'') ~* '^(no phone|invalid phone|no WA contact)') as data_failed,
  count(*) filter (where status in ('pending','sending') and coalesce(next_attempt_at, created_at) < now() - interval '{STUCK_MINUTES} minutes') as stuck
from public.waouh_outbound_queue
where channel='whatsapp' and created_at > now() - interval '{WINDOW_HOURS} hours'""")[0]
sent, engine_failed, data_failed, stuck = (int(row[k] or 0) for k in ('sent', 'engine_failed', 'data_failed', 'stuck'))
print(f'::notice title=WhatsApp notifications ({WINDOW_HOURS} h)::sent={sent}; engine failures={engine_failed}; contact-data failures={data_failed}; stuck={stuck}')
if engine_failed >= MIN_FAILURES and sent == 0:
    problems.append(f'{engine_failed} WhatsApp notifications failed and none was delivered in {WINDOW_HOURS} h.')
if stuck >= 3:
    problems.append(f'{stuck} WhatsApp notifications have been waiting more than {STUCK_MINUTES} minutes.')

for problem in problems:
    print('::error title=WhatsApp delivery::' + problem)
sys.exit(1 if problems else 0)
