import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { botLine } from "@/lib/waouh/botStrategy";
import { sinceText, untilText } from "@/components/waouh/WaouhBotFollowUp";

/** Ligne Bot dans la Deal Room : dernière action et prochaine étape. */
export function WaouhBotLine({ room }: { room: Parameters<typeof botLine>[0] }) {
  const line = botLine(room);
  if (!line || (room?.control_mode === "manual" && !room?.events?.some((e) => e.event_type === "delegate"))) return null;
  return (
    <div className="my-2 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
      <BotLiveAvatar size={28} />
      <div className="min-w-0 space-y-0.5">
        <p className="font-bold text-slate-800">{line.last}{line.lastAt ? <span className="font-medium text-slate-500"> · {sinceText(line.lastAt)}</span> : null}</p>
        <p className="font-semibold text-slate-600">Ensuite : {line.next}{line.nextAt ? <span className="text-slate-500"> · {untilText(line.nextAt)}</span> : null}</p>
      </div>
    </div>
  );
}
