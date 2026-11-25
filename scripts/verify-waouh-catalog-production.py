"""Verify the unified catalogue without publishing or messaging anyone."""
import json
import os
import sys
import urllib.error
import urllib.request

project = os.environ['SUPABASE_PROJECT_REF']
management = 'https://api.supabase.com/v1/projects/' + project
management_headers = {'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json'}

def request(url, body=None, headers=None):
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers=headers or management_headers)
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, None

status, keys = request(management + '/api-keys')
assert status == 200, 'Cannot obtain project credentials'
service = next(row['api_key'] for row in keys if row['name'] == 'service_role')
edge_headers = {'Authorization': 'Bearer ' + service, 'apikey': service, 'Content-Type': 'application/json'}
endpoint = 'https://' + project + '.supabase.co/functions/v1/waouh-radar-site-scraper'
status, _ = request(endpoint, {'action': 'collection.catalog.overview'}, {'Content-Type': 'application/json'})
assert status in (401, 403), 'Anonymous catalogue administration must be denied'
status, overview = request(endpoint, {'action': 'collection.catalog.overview'}, edge_headers)
assert status == 200 and overview.get('ok'), 'Authenticated catalogue administration unavailable'
assert len(overview['entries']) == 50 and len(overview['platforms']) == 37
assert overview['indexed_documents'] > 0
for host in ('bj.coinafrique.com', 'bj.afribaba.com', 'bj.classi4u.com'):
    assert next(p for p in overview['platforms'] if p['hostname'] == host)['transport'] in ('apify', 'serpapi')
status, search = request(endpoint, {'action': 'collection.catalog.search', 'query': 'iphone', 'offset': 0}, edge_headers)
assert status == 200 and search.get('indexed') and isinstance(search.get('records'), list)
print(json.dumps({'registry_entries': len(overview['entries']), 'platforms': len(overview['platforms']),
    'indexed_documents': overview['indexed_documents'], 'search_total': search['total'], 'admin_access': 'protected', 'published': 0}))

if '--api-preview' in sys.argv:
    status, preview = request(endpoint, {'action': 'collection.catalog.test', 'entry_no': 1}, edge_headers)
    assert status == 200 and preview.get('ok') and preview.get('published') == 0, 'API preview command unavailable'
    print(json.dumps({'provider': 'apify', 'preview_passed': preview.get('passed'), 'reason': preview.get('reason'),
        'records': preview.get('records'), 'photos': [len(p.get('photos', [])) for p in preview.get('preview', [])], 'published': 0}))
