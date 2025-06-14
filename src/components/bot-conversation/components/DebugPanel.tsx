
import React from "react";
import { Button } from "@/components/ui/button";

interface DebugInfo {
  enhancedSession: any;
  botUsers: any;
  allMessages: any;
  sessionToken: string;
  botId: string;
}

interface DebugPanelProps {
  debugInfo: DebugInfo | null;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, onClose }) => {
  if (!debugInfo) return null;

  return (
    <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
      <div className="font-medium mb-1">Debug Info:</div>
      <div>Enhanced Sessions: {debugInfo.enhancedSession?.length || 0}</div>
      <div>Bot Users: {debugInfo.botUsers?.length || 0}</div>
      <div>Messages Total: {debugInfo.allMessages?.length || 0}</div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="mt-1"
      >
        Masquer
      </Button>
    </div>
  );
};
