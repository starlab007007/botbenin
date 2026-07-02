#!/usr/bin/env python3
"""Upgrade the repository Supabase config for the current Supabase CLI.

Creates a .bak copy once, then applies only schema migrations required by
Supabase CLI: IPv4 casing, local_smtp, auth.email, and edge_runtime.
"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
path = root / 'supabase' / 'config.toml'
backup = root / 'supabase' / 'config.toml.pre-cli-upgrade.bak'
text = path.read_text(encoding='utf-8')

if not backup.exists():
    backup.write_text(text, encoding='utf-8')

text = text.replace('ip_version = "ipv4"', 'ip_version = "IPv4"')
text = text.replace('ip_version = "ipv6"', 'ip_version = "IPv6"')

text = re.sub(
    r'\[inbucket\]\nenabled = true\nport = 54324\napi_port = 54325\nsmtp_port = 54326',
    '[local_smtp]\nenabled = true\nport = 54324\nsmtp_port = 54325\npop3_port = 54326',
    text,
)

text = text.replace('\nenable_confirmations = false\n\n[edge-runtime]', '\n\n[auth.email]\nenable_confirmations = false\n\n[edge_runtime]')
text = text.replace('[edge-runtime]', '[edge_runtime]')
text = re.sub(
    r'\[edge_runtime\]\nenabled = true\nip_version = "IPv4"\nport = 54327\ninspector_port = 8083',
    '[edge_runtime]\nenabled = true\npolicy = "per_worker"\ninspector_port = 8083',
    text,
)
text = re.sub(
    r'\[edge_runtime\]\nenabled = true\nip_version = "IPv6"\nport = 54327\ninspector_port = 8083',
    '[edge_runtime]\nenabled = true\npolicy = "per_worker"\ninspector_port = 8083',
    text,
)

required = {
    '[functions.waouh-agent-ingest]': 'verify_jwt = true',
    '[functions.waouh-agent-parse-catalog]': 'verify_jwt = true',
    '[functions.waouh-agent-chat]': 'verify_jwt = false',
    '[functions.waouh-agent-webhook]': 'verify_jwt = false',
    '[functions.waouh-agent-manual-reply]': 'verify_jwt = true',
    '[functions.waouh-agent-insights]': 'verify_jwt = true',
}
for section, setting in required.items():
    if section not in text:
        text += f'\n\n{section}\n{setting}\n'

path.write_text(text, encoding='utf-8')
print('Supabase config upgraded. Backup: supabase/config.toml.pre-cli-upgrade.bak')
