import React from "react";

interface Props { label: string; }

export function ChatDaySeparator({ label }: Props) {
  return (
    <div className="chat-day-separator" role="separator" aria-label={label}>
      <span className="pill">{label}</span>
    </div>
  );
}

export default ChatDaySeparator;
