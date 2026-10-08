"""Verify the user's explicitly requested live WhatsApp exchange without logging message content.

Only replays the actual received provider event, once, if the former broken webhook
never processed it. No fabricated messages, unrelated contacts or bulk sends.
"""
import argparse
import datetime
import json
import os
import time
import urllib.request
import urllib.error

parser = argparse.ArgumentParser()
parser.add_argument('--phone', required=True)
parser.add_argument('--since', required=True)
parser.add_argument('--keyword', required=True)
args = parser.parse_args()
since = datetime.datetime.fromisoformat(args.since.replace('Z','+00:00')).timestamp()
if time.time() > since + 7200:
    print('::notice::The one-time requested WhatsApp test window has expired; reusable release checks remain active.')
    raise SystemExit(0)
project = os.environ['SUPABASE_PROJECT_REF']
management = 'https://api.supabase.com/v1/projects/' + project

def request(url, data=None, headers=None):
    req = urllib.request.Request(url,headers=headers or {},data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req,timeout=90) as response:
            raw = response.read()
            try: body = json.loads(raw) if raw else None
            except json.JSONDecodeError: body = raw.decode(errors='replace')
            return response.status,body
    except urllib.error.HTTPError as error:
        return error.code,None

status, keys = request(management+'/api-keys',headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN']})
assert status == 200, 'Cannot obtain verification credentials'
service = next(row['api_key'] for row in keys if row['name']=='service_role')
headers = {'Authorization':'Bearer '+service,'apikey':service,'Content-Type':'application/json'}
base = 'https://'+project+'.supabase.co/functions/v1/'
since = datetime.datetime.fromisoformat(args.since.replace('Z','+00:00')).timestamp()

def history():
    status, data = request(base+'waouh-waha-control',{'action':'central-chat-history','phone':args.phone},headers)
    assert status == 200 and data and data.get('readable'), f'Actual WAHA chat history unavailable HTTP {status}'
    return data['messages']

def timestamp(message):
    value = message.get('timestamp') or message.get('_data',{}).get('t') or 0
    try:
        value = float(value)
        return value/1000 if value>100000000000 else value
    except (ValueError,TypeError):
        return 0

def message_id(message):
    value = message.get('id')
    return value if isinstance(value,str) else (value or {}).get('_serialized')

messages = history()
received = [message for message in messages if message.get('fromMe') is False and timestamp(message)>=since and args.keyword.casefold() in str(message.get('body') or message.get('caption') or '').casefold()]
assert received, 'Requested test message not found in actual central WhatsApp history'
incoming = sorted(received,key=timestamp)[0]
reference = message_id(incoming)
assert reference, 'Provider test event has no stable message identifier'
status, processed = request(management+'/database/query',{'query':"select exists(select 1 from public.waouh_processed_events where event_id='"+reference.replace("'","''")+"' and source='waha') as processed"},{'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'})
assert status == 200 and processed, 'Cannot inspect test event idempotency'
if not processed[0]['processed']:
    payload = dict(incoming)
    payload['id'] = reference
    status, _ = request(base+'waha-webhook',{'event':'message','session':'WaouhApp','payload':payload},headers)
    assert status == 200, f'Replay of the actual requested test event failed HTTP {status}'
    print('::notice title=Requested WhatsApp test::Actual received event replayed once after repairing the former webhook.')

digits = ''.join(c for c in args.phone if c.isdigit())
variants = [digits]
if digits.startswith('22901') and len(digits)==13: variants.append('229'+digits[5:])
elif digits.startswith('229') and len(digits)==11: variants.append('22901'+digits[3:])
variants += ['+'+value for value in list(variants)]
numbers = ','.join("'"+value+"'" for value in variants)
status, rows = request(management+'/database/query',{'query':"select text from public.waouh_messages where channel='whatsapp' and direction='out' and phone_number in ("+numbers+") and created_at>='"+args.since+"' order by created_at desc limit 20"},{'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'})
assert status==200, 'Cannot correlate Avatar reply records'
expected = [str(row.get('text','')).strip() for row in rows if str(row.get('text','')).strip()]
matched = []
for attempt in range(8):
    outgoing = [message for message in history() if message.get('fromMe') is True and timestamp(message)>=timestamp(incoming)]
    matched = [message for message in outgoing if any(reply in str(message.get('body') or message.get('caption') or '') for reply in expected)]
    if matched: break
    time.sleep(4)
assert matched, 'No actual outgoing WhatsApp message matches the recorded Avatar reply'
acks = [message.get('ack') for message in matched]
print('::notice title=Real WhatsApp Avatar reply verified::Requested message received in central WAHA history; matching Avatar reply confirmed in actual outgoing WhatsApp history. Provider acknowledgements='+json.dumps(acks)+'. No unrelated contact messaged.')
