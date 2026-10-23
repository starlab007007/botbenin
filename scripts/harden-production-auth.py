#!/usr/bin/env python3
"""Apply the two explicitly approved Auth hardening settings, without emitting secrets."""
import json, os, urllib.request
from pathlib import Path
project = os.environ['SUPABASE_PROJECT_REF']
if project != 'mvynepqulhflxtyymtzs':
    raise SystemExit('Refusing an unexpected production project')
url = f'https://api.supabase.com/v1/projects/{project}/config/auth'
headers = {'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json'}
keys = ['mailer_otp_exp', 'password_hibp_enabled']
def request(method='GET', data=None):
    req = urllib.request.Request(url, headers=headers, method=method, data=None if data is None else json.dumps(data).encode())
    with urllib.request.urlopen(req, timeout=40) as response:
        return json.load(response)
current = request()
before = {key: current.get(key) for key in keys}
desired = {'mailer_otp_exp': 600, 'password_hibp_enabled': True}
if any(current.get(key) != value for key, value in desired.items()):
    request('PATCH', desired)
verified = request()
after = {key: verified.get(key) for key in keys}
assert after == desired, 'Auth hardening did not persist'
result = {'project': project, 'before': before, 'after': after, 'verified': True}
Path('auth-hardening-result.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result))
