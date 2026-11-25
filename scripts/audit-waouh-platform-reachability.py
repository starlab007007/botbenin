"""Bounded network audit of the 50 registered entries; never qualifies or publishes listings."""
import concurrent.futures
import datetime
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / 'supabase/migrations/20261125080858_waouh_source_registry.sql'

def probe(item):
    number, label, url = item
    result = {'entry_no': number, 'label': label, 'url': url, 'stage': 'reachability', 'qualified': False}
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'WAOUHBot/1.0 (+https://bot.bj/)', 'Accept': 'text/html'})
        with urllib.request.urlopen(request, timeout=15) as response:
            body = response.read(65536).decode('utf-8', errors='replace')
            title = re.search(r'<title[^>]*>(.*?)</title>', body, re.I | re.S)
            result.update(status=response.status, final_url=response.url, title=re.sub(r'\s+', ' ', title.group(1)).strip()[:180] if title else None)
    except urllib.error.HTTPError as error:
        result.update(status=error.code, reason='http_error')
    except Exception as error:
        result.update(status=None, reason=type(error).__name__)
    return result

if __name__ == '__main__':
    rows = re.findall(r"values\((\d+),'[^']+','((?:[^']|'')*)','(https://[^']+)'", SOURCE.read_text())
    entries = [(int(n), label.replace("''", "'"), url) for n, label, url in rows]
    assert len(entries) == 50
    unique = {url: (n, label, url) for n, label, url in entries}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        checked = {r['url']: r for r in executor.map(probe, unique.values())}
    results = [{**checked[url], 'entry_no': n, 'label': label} for n, label, url in entries]
    print(json.dumps({'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'entries': results}, ensure_ascii=False, indent=2))
