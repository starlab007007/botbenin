"""Export only the dedicated runtime credential for the existing VPS deployment."""
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

RETRYABLE = {408, 429, 500, 502, 503, 504, 520, 522, 524, 544}
DELAYS = (5, 15, 30)

def fetch_token():
    request = urllib.request.Request(
        'https://api.supabase.com/v1/projects/mvynepqulhflxtyymtzs/database/query',
        data=json.dumps({'query':"select decrypted_secret as token from vault.decrypted_secrets where name='waouh_collection_engine_secret' limit 1"}).encode(),
        headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'})
    for attempt in range(len(DELAYS) + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                rows = json.load(response)
            break
        except urllib.error.HTTPError as error:
            status = error.code
            error.close()
            if status not in RETRYABLE or attempt == len(DELAYS):
                raise RuntimeError(f'Collection credential lookup failed (HTTP {status})') from None
            print(f'Collection credential lookup HTTP {status}; retry {attempt + 1}/{len(DELAYS)}', flush=True)
        except (urllib.error.URLError, TimeoutError):
            if attempt == len(DELAYS):
                raise RuntimeError('Collection credential lookup unavailable after retries') from None
            print(f'Collection credential lookup unavailable; retry {attempt + 1}/{len(DELAYS)}', flush=True)
        time.sleep(DELAYS[attempt])
    token = rows[0].get('token') if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not isinstance(token, str) or len(token) != 64 or not token.isascii() or not token.isalnum():
        raise ValueError('invalid runtime credential')
    return token

def main():
    token = fetch_token()
    fd = os.open(Path(sys.argv[1]), os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as output:
        os.fchmod(output.fileno(), 0o600)
        output.write(token+'\n')
    print('Dedicated collection runtime credential prepared')

if __name__ == '__main__':
    main()
