#!/usr/bin/env python3
"""Add only WAOUH's exact native redirect; retain all existing Auth settings."""
import json
import os
import urllib.request

CALLBACK = 'bj.bot.waouhapp://login-callback/app/auth'
PROJECT = 'mvynepqulhflxtyymtzs'


def merge_redirects(value):
    routes = [item.strip() for item in (value or '').split(',') if item.strip()]
    if CALLBACK not in routes:
        routes.append(CALLBACK)
    return ','.join(routes)


def main():
    if os.environ['SUPABASE_PROJECT_REF'] != PROJECT:
        raise SystemExit('Unexpected project')
    url = f'https://api.supabase.com/v1/projects/{PROJECT}/config/auth'
    headers = {
        'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN'],
        'Content-Type': 'application/json',
    }

    def request(method='GET', body=None):
        req = urllib.request.Request(url, method=method, headers=headers,
            data=None if body is None else json.dumps(body).encode())
        with urllib.request.urlopen(req, timeout=40) as response:
            return json.load(response)

    current = request()
    before = current.get('uri_allow_list', '')
    after = merge_redirects(before)
    if before != after:
        request('PATCH', {'uri_allow_list': after})
    verified = request()
    assert CALLBACK in verified.get('uri_allow_list', '').split(',')
    assert set(filter(None, before.split(','))) <= set(verified['uri_allow_list'].split(','))
    # Configuration can contain provider secrets. Emit only these safe facts.
    print(json.dumps({'native_callback_allowed': True,
                      'existing_redirects_preserved': True,
                      'google_enabled': bool(verified.get('external_google_enabled'))}))


if __name__ == '__main__':
    main()
