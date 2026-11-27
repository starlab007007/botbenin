"""Production Android recipe: test account only, no outbound transport.
The runner creates a private unconfirmed room and a single in-app notification.
No customer data is read or modified. All synthetic room data is cleaned up.
"""
import json
import os
import urllib.request
import uuid

PROJECT = "mvynepqulhflxtyymtzs"

def identity():
    uid = str(uuid.UUID(os.environ["TEST_USER_ID"]))
    run = str(int(os.environ["GITHUB_RUN_ID"]))
    email = f"android-ci-{run}@waouh.test"
    if os.environ.get("TEST_EMAIL") != email or os.environ.get("SUPABASE_PROJECT_REF") != PROJECT:
        raise RuntimeError("QA account or project mismatch")
    return uid, email, run

def query(sql):
    token = os.environ["SUPABASE_ACCESS_TOKEN"]
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        data=json.dumps({"query": sql}).encode(), method="POST",
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as res:
        result = json.load(res)
    if not isinstance(result, list):
        raise RuntimeError("QA database response invalid")
    return result

def guarded_sql(body):
    uid, email, run = identity()
    return f"""begin;
set local lock_timeout='3s';set local statement_timeout='25s';
select set_config('request.jwt.claim.role','service_role',true);
do $guard$ begin
 if not exists(select 1 from auth.users where id='{uid}' and email='{email}' and raw_app_meta_data->>'waouh_validation'='true') then raise exception 'QA account guard';end if;
 if not exists(select 1 from public.waouh_avatar_prefs where auth_user_id='{uid}' and autonomy_settings->>'paused'='true' and autonomy_settings->>'allow_contact'='false' and autonomy_settings->>'allow_whatsapp'='false') then raise exception 'QA autonomy guard';end if;
end $guard$;
{body}
commit;"""

def create():
    uid, _, run = identity()
    marker = f"QA reprise {run}"
    title = f"QA Deal Room {run}"
    result = query(guarded_sql(f"""
create temp table qa_created(room_id uuid,notification_id uuid);
do $qa$ declare prof uuid;room uuid; nid uuid; x jsonb; begin
 select id into prof from public.waouh_users where auth_user_id='{uid}' order by created_at limit 1;
 if prof is null then insert into public.waouh_users(auth_user_id,display_name,channel) values('{uid}','QA Android','waouh_app') returning id into prof;end if;
 x=public.waouh_room_command('{uid}','open',jsonb_build_object('request_id',gen_random_uuid(),'source',jsonb_build_object('source_ref','external:qa-recovery:{uid}','title','{title}','kind','product','amount',150000,'source_snapshot','{{}}'::jsonb),'city','Cotonou','confirmed',false));
 room=(x->>'deal_room_id')::uuid;
 if room is null or exists(select 1 from public.waouh_convergence_components where id=room and provider_id is not null) then raise exception 'unsafe QA room';end if;
 if not exists(select 1 from public.waouh_deal_room_links where id=room and owner_id='{uid}' and control_mode='manual') then raise exception 'unsafe QA control mode';end if;
 insert into public.waouh_notifications(user_id,notification_type,photos,payload,channel,delivery_status,dedupe_key)
 values(prof,'avatar_mission_progress','{{}}',jsonb_build_object('text','{marker}','room_id',room,'actions',jsonb_build_array(jsonb_build_object('id','open_room','label','Suivre','kind','navigate','route','/app/chat?room_id='||room))),'waouh_app','queued','qa-recovery:{uid}') returning id into nid;
 insert into qa_created values(room,nid);
end $qa$;
select * from qa_created;"""))
    row = next((r for r in result if r.get("room_id") and r.get("notification_id")), None)
    if row is None:
        raise RuntimeError("QA room or notification missing")
    return {"marker": marker, "title": title, "room_id": str(uuid.UUID(row["room_id"])), "notification_id": str(uuid.UUID(row["notification_id"]))}

def opened(fixture):
    uid, _, _ = identity()
    nid = str(uuid.UUID(fixture["notification_id"]))
    rows = query(guarded_sql(f"""select count(*)=1 and bool_and(n.opened and n.read_at is not null) as opened
from public.waouh_notifications n join public.waouh_users u on u.id=n.user_id
where n.id='{nid}' and n.dedupe_key='qa-recovery:{uid}' and u.auth_user_id='{uid}';"""))
    return any(r.get("opened") is True for r in rows)

def cleanup():
    uid, _, _ = identity()
    query(guarded_sql(f"""
delete from public.waouh_notifications n using public.waouh_users u where n.user_id=u.id and u.auth_user_id='{uid}' and n.dedupe_key='qa-recovery:{uid}';
create temp table qa_rooms as select l.id,c.mission_id from public.waouh_deal_room_links l join public.waouh_convergence_components c on c.id=l.id where l.owner_id='{uid}' and l.source_ref='external:qa-recovery:{uid}';
delete from public.waouh_room_events where room_id in(select id from qa_rooms);
delete from public.waouh_deal_room_links where id in(select id from qa_rooms) and owner_id='{uid}';
delete from public.waouh_convergence_events where mission_id in(select mission_id from qa_rooms);
delete from public.waouh_convergence_pool_members where mission_id in(select mission_id from qa_rooms);
delete from public.waouh_convergence_missions where id in(select mission_id from qa_rooms) and owner_id='{uid}';
"""))

if __name__ == "__main__":
    cleanup()
