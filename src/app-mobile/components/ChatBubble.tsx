import React from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "../utils/chatGrouping";

type Status = "sending" | "sent" | "delivered" | "read";

interface Props {
  direction: "in" | "out" | string;
  createdAt: string | Date;
  grouped?: boolean;
  showMeta?: boolean;
  status?: Status;
  className?: string;
  children: React.ReactNode;
}

function StatusGlyph({ status }: { status?: Status }) {
  if (!status) return null;
  if (status === "sending") return <span className="chat-status" aria-label="envoi">⏱</span>;
  if (status === "sent") return <span className="chat-status" aria-label="envoyé">✓</span>;
  if (status === "delivered") return <span className="chat-status" aria-label="reçu">✓✓</span>;
  return <span className="chat-status read" aria-label="lu">✓✓</span>;
}

/** Unified chat bubble used across mobile, web and admin chats. */
export function ChatBubble({ direction, createdAt, grouped, showMeta = true, status, className, children }: Props) {
  const isOut = direction === "out";
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return (
    <div className={cn("flex w-full", isOut ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-2")}>
      <div
        className={cn(
          "chat-bubble",
          isOut ? "chat-bubble-out" : "chat-bubble-in",
          grouped && "is-grouped",
          className
        )}
      >
        <div className="chat-bubble-content">{children}</div>
        {showMeta && (
          <span className="chat-meta">
            <time dateTime={d.toISOString()}>{formatTime(d)}</time>
            {isOut && <StatusGlyph status={status ?? "sent"} />}
          </span>
        )}
      </div>
    </div>
  );
}

export default ChatBubble;
