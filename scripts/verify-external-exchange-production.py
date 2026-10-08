"""Exercise the deployed guest/owner exchange with an isolated, disposable account.

No external transport, payment or real-user message is invoked. All test records
are removed in finally, including notifications for the disposable account.
Credentials stay in memory and never appear in output.
"""
import json
import os
import secrets
import urllib.error
import urllib.request
import uuid
import sys

project = os.environ["SUPABASE_PROJECT_REF"]
management_headers = {"Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"], "Content-Type": "application/json"}
base = f"https://{project}.supabase.co"


def request(url, method="GET", data=None, headers=None):
    req = urllib.request.Request(url, method=method, headers=headers or {}, data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        # Do not print provider bodies, which may contain credentials or request data.
        return error.code, None


def expect(status, body, label):
    assert status in (200, 201) and body is not None, f"{label} failed (HTTP {status})"
    return body


status, keys = request(f"https://api.supabase.com/v1/projects/{project}/api-keys", headers=management_headers)
keys = expect(status, keys, "Project keys")
anon = next(row["api_key"] for row in keys if row.get("name") == "anon")
service = next(row["api_key"] for row in keys if row.get("name") == "service_role")
service_headers = {"apikey": service, "Authorization": "Bearer " + service, "Content-Type": "application/json"}


def query(sql):
    status, body = request(f"https://api.supabase.com/v1/projects/{project}/database/query", "POST", {"query": sql}, management_headers)
    return expect(status, body, "Fixture database operation")


def invoke(action, payload, token=anon):
    return request(base + "/functions/v1/waouh-studio-e2e-v21465", "POST", {"action": action, "payload": payload}, {"apikey": anon, "Authorization": "Bearer " + token, "Content-Type": "application/json"})


def action(name, payload, token=anon):
    status, body = invoke(name, payload, token)
    result = expect(status, body, name)
    assert result.get("ok"), f"{name} did not confirm success"
    return result["data"]


status, configured = request(f"https://api.supabase.com/v1/projects/{project}/secrets", headers=management_headers)
if status == 200 and isinstance(configured,list):
    names = {item.get("name") for item in configured}
    print("::notice title=External channel configuration::WhatsApp provider configured: " + str("WAHA_BASE_URL" in names).lower() + "; Email provider configured: " + str("RESEND_API_KEY" in names).lower() + "; Email sender configured: " + str("WAOUH_EMAIL_FROM" in names).lower() + "; WhatsApp receipt secret configured: " + str("WAHA_WEBHOOK_SECRET" in names).lower())

owner = None
journey = str(uuid.uuid4())
signal = str(uuid.uuid4())
queue = str(uuid.uuid4())
counterparty = str(uuid.uuid4())
whatsapp_mode = '--whatsapp' in sys.argv
phone = '00000000000000000000' + str(uuid.uuid4().int)
reference = 'WA-' + journey.replace('-','')[:8].upper()
try:
    email = f"exchange-test-{uuid.uuid4()}@example.invalid"
    password = secrets.token_urlsafe(48)
    status, user = request(base + "/auth/v1/admin/users", "POST", {"email": email, "password": password, "email_confirm": True, "user_metadata": {"purpose": "external_exchange_release_verification"}}, service_headers)
    owner = str(uuid.UUID(expect(status, user, "Disposable account")["id"]))
    status, session = request(base + "/auth/v1/token?grant_type=password", "POST", {"email": email, "password": password}, {"apikey": anon, "Content-Type": "application/json"})
    token = expect(status, session, "Disposable session")["access_token"]
    query(f"insert into public.waouh_opportunity_journeys(id,owner_id,fabric_id,mode,stage,subject,metadata) values('{journey}','{owner}','external:{signal}','buy','waiting_reply','Test de publication · échange invité','{{\"release_verification\":true}}');")
    if whatsapp_mode:
        payload = json.dumps({'journey_id':journey,'signal_id':signal,'fabric_id':'external:'+signal,'initiated_by_auth_user':owner,'waha_session':'WaouhApp','release_verification':True})
        query(f"insert into public.waouh_external_commerce_signals(id,submitted_by,source_key,intent,product_name) values('{signal}','{owner}','release_verification','SELL','Test de publication'); insert into public.waouh_users(id,phone_number,channel,city) values('{counterparty}','{phone}','whatsapp','Cotonou'); insert into public.waouh_outbound_queue(id,to_phone,template,payload,status) values('{queue}','{phone}','nexus_discovery_outreach','{payload}'::jsonb,'read');")
    def whatsapp(text):
        status, body = request(base + '/functions/v1/waouh-webhook', 'POST', {'phone_number':phone,'text':text,'channel':'whatsapp','user_id':counterparty,'waha_session':'WaouhApp','message_id':str(uuid.uuid4()),'external_exchange_only':True}, service_headers)
        result = expect(status, body, 'WhatsApp exchange command')
        assert result.get('handled') in ('external_exchange_command','external_exchange_command_help'), 'WhatsApp command fell through generic chat'
        return result
    access = {"journey_id": journey}
    invitation = action("nexus.external.invite", access, token)
    guest = {"token": invitation["url"].split("#", 1)[1]}
    visible = action("nexus.guest.read", guest)
    assert visible["journey"]["id"] == journey and "owner_id" not in visible["journey"]
    result = action("nexus.guest.message", {**guest, "request_id": str(uuid.uuid4()), "text": "Disponible. Livraison à Cotonou."})
    assert any(message["text"] == "Disponible. Livraison à Cotonou." for message in result["messages"])
    if whatsapp_mode:
        result = whatsapp('PROPOSER ' + reference + ' 24000 FCFA | 1 | Cotonou | Après réception')
        assert result.get('handled') == 'external_exchange_command'
        result = action('nexus.external.read', access, token)
        assert result['agreement']['terms']['amount'] == 24000 and result['agreement']['proposed_by'] == 'counterparty'
    result = action("nexus.external.propose", {**access, "request_id": str(uuid.uuid4()), "terms": {"amount": 25000, "quantity": 1, "delivery": "Cotonou · vendredi", "payment": "Après réception"}}, token)
    agreement = result["agreement"]["id"]
    version = 'VERSION-' + agreement.replace('-','')[:8].upper()
    if whatsapp_mode:
        result = whatsapp('ACCEPTER ' + reference + ' VERSION-00000000')
        assert result.get('handled') == 'external_exchange_command_help', 'Stale WhatsApp agreement version accepted'
        result = whatsapp('ACCEPTER ' + reference + ' ' + version)
        assert result.get('handled') == 'external_exchange_command'
        result = action('nexus.external.read', access, token)
    else:
        result = action("nexus.guest.accept", {**guest, "request_id": str(uuid.uuid4()), "agreement_id": agreement})
    assert result["journey"]["stage"] == "agreed"
    status, _ = invoke("nexus.guest.receipt", {**guest, "request_id": str(uuid.uuid4()), "agreement_id": agreement})
    assert status == 409, "Seller must not confirm buyer receipt"
    for operation, actor, credential in [("shipment", guest, anon), ("receipt", access, token), ("payment", access, token), ("payment_received", guest, anon)]:
        if whatsapp_mode and actor is guest:
            command = {'shipment':'EXPEDIE','payment_received':'PAIEMENT RECU'}[operation]
            reply = whatsapp(command + ' ' + reference + ' ' + version)
            assert reply.get('handled') == 'external_exchange_command'
            result = action('nexus.external.read', access, token)
        else:
            result = action(f"nexus.{'guest' if actor is guest else 'external'}.{operation}", {**actor, "request_id": str(uuid.uuid4()), "agreement_id": agreement}, credential)
    assert result["journey"]["stage"] == "completed"
    if whatsapp_mode:
        assert 'Terminé' in whatsapp('SUIVI ' + reference)['reply']
        print('::notice title=WhatsApp exchange production scenario::Proposals, stale-version rejection, exact agreement acceptance, role-specific shipment/payment confirmations and completed journey lookup passed through the deployed WhatsApp engine. Invalid fixture number; no external transport invoked.')
    action("nexus.external.revoke", access, token)
    status, _ = invoke("nexus.guest.read", guest)
    assert status == 404, "Revoked invitation remains usable"
    print("Production external exchange passed: owner authentication, guest reply, bilateral agreement, participant roles, receipt/payment declarations, completion and revocation. No external messages or payments sent.")
finally:
    if owner:
        # Scope every deletion to the disposable account and the generated test journey.
        if whatsapp_mode:
            query(f"delete from public.waouh_outbound_queue where id='{queue}'; delete from public.waouh_conversations where user_id='{counterparty}'; delete from public.waouh_users where id='{counterparty}'; delete from public.waouh_external_commerce_signals where id='{signal}' and submitted_by='{owner}';")
        query(f"delete from public.waouh_conversation_bus_events where journey_id='{journey}' and owner_id='{owner}'; delete from public.waouh_notifications where user_id in (select id from public.waouh_users where auth_user_id='{owner}'); delete from public.waouh_opportunity_journeys where id='{journey}' and owner_id='{owner}'; delete from public.waouh_users where auth_user_id='{owner}';")
        status, _ = request(base + f"/auth/v1/admin/users/{owner}", "DELETE", headers=service_headers)
        assert status in (200, 204), f"Disposable account cleanup failed (HTTP {status})"
