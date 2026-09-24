import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { randomCode, sha256Hex } from "./crypto.ts";
import { enqueueTelMessage } from "./db.ts";
import type { TelOutboundPayload, TelSettings } from "./types.ts";

export type RoomCommand =
  | { type: "create"; name: string }
  | { type: "join"; code: string }
  | { type: "leave"; code: string }
  | { type: "post"; code: string; text: string }
  | null;

function cleanCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function parseRoomCommand(text: string): RoomCommand {
  const value = text.trim();
  const create = value.match(/^GROUPE\s+(.{1,80})$/i);
  if (create) return { type: "create", name: create[1].trim() };
  const join = value.match(/^REJOINDRE\s+([A-Z0-9-]{4,16})$/i);
  if (join) return { type: "join", code: cleanCode(join[1]) };
  const leave = value.match(/^QUITTER\s+([A-Z0-9-]{4,16})$/i);
  if (leave) return { type: "leave", code: cleanCode(leave[1]) };
  const post = value.match(/^#([A-Z0-9-]{4,16})\s+([\s\S]{1,4000})$/i);
  if (post) {
    return {
      type: "post",
      code: cleanCode(post[1]),
      text: post[2].trim().slice(0, 1600),
    };
  }
  return null;
}

function systemPayload(text: string): TelOutboundPayload {
  return { schema: "waouh.tel.outbound.v1", text };
}

async function roomByCode(admin: SupabaseClient, code: string) {
  const codeHash = await sha256Hex(cleanCode(code));
  const { data, error } = await admin.from("waouh_tel_rooms").select("*").eq(
    "code_hash",
    codeHash,
  ).eq("status", "active").maybeSingle();
  if (error) throw new Error(`room_lookup_failed:${error.message}`);
  return data;
}

export async function executeRoomCommand(options: {
  admin: SupabaseClient;
  command: Exclude<RoomCommand, null>;
  settings: TelSettings;
  telUser: any;
  thread: any;
  sourceMessageId?: string | null;
}) {
  const { admin, command, settings, telUser, thread } = options;
  if (!settings.virtual_groups_enabled) {
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      payload: systemPayload(
        "Les groupes virtuels WAOUH ne sont pas encore activés.",
      ),
    });
  }
  if (command.type === "create") {
    let code = "";
    let room: any = null;
    for (let attempt = 0; attempt < 4 && !room; attempt += 1) {
      code = randomCode(6);
      const { data, error } = await admin.from("waouh_tel_rooms").insert({
        code_hash: await sha256Hex(code),
        code_hint: code,
        name: command.name,
        owner_tel_user_id: telUser.id,
        mode: "virtual",
      }).select("*").single();
      if (!error) room = data;
      else if (error.code !== "23505") {
        throw new Error(`room_create_failed:${error.message}`);
      }
    }
    if (!room) throw new Error("room_code_generation_failed");
    const { error: ownerError } = await admin.from("waouh_tel_room_members")
      .insert({
        room_id: room.id,
        tel_user_id: telUser.id,
        role: "owner",
        status: "active",
      });
    if (ownerError) {
      throw new Error(`room_owner_create_failed:${ownerError.message}`);
    }
    const joinUrl = `${settings.public_base_url.replace(/\/$/, "")}?room=${
      encodeURIComponent(code)
    }`;
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      payload: systemPayload(
        `Groupe « ${command.name} » créé. Code : ${code}\nInvitez vos proches : ${joinUrl}\nPour écrire : #${code} votre message`,
      ),
    });
  }

  const room = await roomByCode(admin, command.code);
  if (!room) {
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      payload: systemPayload("Groupe introuvable ou archivé."),
    });
  }
  if (command.type === "join") {
    const { count, error: countError } = await admin.from(
      "waouh_tel_room_members",
    ).select(
      "room_id",
      { count: "exact", head: true },
    ).eq("room_id", room.id).eq("status", "active");
    if (countError) {
      throw new Error(`room_member_count_failed:${countError.message}`);
    }
    if ((count || 0) >= 50) {
      return enqueueTelMessage(admin, {
        targetUserId: telUser.id,
        targetThreadId: thread.id,
        bypassConsent: true,
        messageKind: "system",
        payload: systemPayload("Ce groupe a atteint sa limite de 50 membres."),
      });
    }
    const { error: joinError } = await admin.from("waouh_tel_room_members")
      .upsert({
        room_id: room.id,
        tel_user_id: telUser.id,
        role: room.owner_tel_user_id === telUser.id ? "owner" : "member",
        status: "active",
        joined_at: new Date().toISOString(),
        left_at: null,
      }, { onConflict: "room_id,tel_user_id" });
    if (joinError) throw new Error(`room_join_failed:${joinError.message}`);
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      payload: systemPayload(
        `Vous avez rejoint « ${room.name} ». Envoyez #${room.code_hint} suivi de votre message.`,
      ),
    });
  }
  if (command.type === "leave") {
    if (room.owner_tel_user_id === telUser.id) {
      return enqueueTelMessage(admin, {
        targetUserId: telUser.id,
        targetThreadId: thread.id,
        bypassConsent: true,
        messageKind: "system",
        payload: systemPayload(
          "Le propriétaire ne peut pas quitter son groupe. Archivez-le depuis l’administration WAOUH.",
        ),
      });
    }
    const { error: leaveError } = await admin.from("waouh_tel_room_members")
      .update({
        status: "left",
        left_at: new Date().toISOString(),
      }).eq("room_id", room.id).eq("tel_user_id", telUser.id);
    if (leaveError) throw new Error(`room_leave_failed:${leaveError.message}`);
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      payload: systemPayload(`Vous avez quitté « ${room.name} ».`),
    });
  }

  const { data: membership, error: membershipError } = await admin.from(
    "waouh_tel_room_members",
  )
    .select("status").eq("room_id", room.id).eq("tel_user_id", telUser.id)
    .maybeSingle();
  if (membershipError) {
    throw new Error(`room_membership_lookup_failed:${membershipError.message}`);
  }
  if (membership?.status !== "active") {
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      payload: systemPayload(
        `Envoyez REJOINDRE ${room.code_hint} avant de participer.`,
      ),
    });
  }
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const [recentResult, hourlyResult] = await Promise.all([
    admin.from("waouh_tel_room_messages").select("id", {
      count: "exact",
      head: true,
    })
      .eq("sender_tel_user_id", telUser.id).gte("created_at", oneMinuteAgo),
    admin.from("waouh_tel_room_messages").select("id", {
      count: "exact",
      head: true,
    })
      .eq("sender_tel_user_id", telUser.id).gte("created_at", oneHourAgo),
  ]);
  if (recentResult.error) {
    throw new Error(
      `room_minute_rate_lookup_failed:${recentResult.error.message}`,
    );
  }
  if (hourlyResult.error) {
    throw new Error(
      `room_hour_rate_lookup_failed:${hourlyResult.error.message}`,
    );
  }
  const recentPosts = recentResult.count;
  const hourlyPosts = hourlyResult.count;
  if ((recentPosts || 0) >= 5 || (hourlyPosts || 0) >= 20) {
    return enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      bypassConsent: true,
      messageKind: "system",
      payload: systemPayload(
        "Limite de messages de groupe atteinte. Patientez avant de réessayer.",
      ),
    });
  }
  const { data: roomMessage, error } = await admin.from(
    "waouh_tel_room_messages",
  ).insert({
    room_id: room.id,
    sender_tel_user_id: telUser.id,
    source_message_id: options.sourceMessageId ?? null,
    body_text: command.text,
  }).select("id").single();
  if (error) throw new Error(`room_message_create_failed:${error.message}`);
  const { data: members, error: membersError } = await admin.from(
    "waouh_tel_room_members",
  ).select("tel_user_id").eq("room_id", room.id).eq("status", "active");
  if (membersError) {
    throw new Error(`room_members_lookup_failed:${membersError.message}`);
  }
  const sender = telUser.display_name ||
    `Membre ••••${telUser.phone_last4 || ""}`;
  const fanoutPayload: TelOutboundPayload = {
    schema: "waouh.tel.outbound.v1",
    text: `[${room.name}] ${sender} : ${command.text}`,
    room: { code_hint: room.code_hint, name: room.name, sender_name: sender },
  };
  await Promise.all(
    (members || []).filter((member) => member.tel_user_id !== telUser.id).map((
      member,
    ) =>
      enqueueTelMessage(admin, {
        targetUserId: member.tel_user_id,
        payload: fanoutPayload,
        channelPreference: "auto",
        messageKind: "message",
      })
    ),
  );
  return {
    room,
    room_message_id: roomMessage.id,
    delivered_to: Math.max(0, (members || []).length - 1),
    bot_mentioned: /^WAOUH\b/i.test(command.text),
  };
}

export async function broadcastRoomBotReply(
  admin: SupabaseClient,
  room: any,
  payload: TelOutboundPayload,
) {
  const { data: members, error } = await admin.from("waouh_tel_room_members")
    .select("tel_user_id")
    .eq("room_id", room.id).eq("status", "active").limit(50);
  if (error) throw new Error(`room_members_lookup_failed:${error.message}`);
  const roomPayload: TelOutboundPayload = {
    ...payload,
    text: `[${room.name}] WAOUH : ${payload.text}`,
    room: { code_hint: room.code_hint, name: room.name, sender_name: "WAOUH" },
  };
  await Promise.all((members || []).map((member) =>
    enqueueTelMessage(admin, {
      targetUserId: member.tel_user_id,
      payload: roomPayload,
      channelPreference: "auto",
      messageKind: "message",
    })
  ));
  return (members || []).length;
}
