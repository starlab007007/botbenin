
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface DebugInfo {
  [key: string]: any;
}

interface DebugPanelProps {
  debugInfo: DebugInfo | null;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, onClose }) => {
  const [showRaw, setShowRaw] = useState(false);
  if (!debugInfo) return null;

  return (
    <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
      <div className="font-medium mb-1">Debug Info:</div>
      {/* Attempt to display key high-level counts, fallback to string */}
      {typeof debugInfo === "object" ? (
        <div className="space-y-1">
          {Object.keys(debugInfo).filter(k => k !== "final_result" && typeof debugInfo[k] === "object" && debugInfo[k]?.count !== undefined).map(k => (
            <div key={k}>
              {k.replace(/_/g, " ")}: <span className="font-mono">{debugInfo[k]?.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div>{String(debugInfo)}</div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="mt-1"
      >
        Masquer
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="mt-1 ml-2"
        onClick={() => setShowRaw(r => !r)}
      >
        {showRaw ? "Cacher le JSON" : "Voir JSON brut"}
      </Button>
      {showRaw && (
        <pre className="mt-1 p-2 bg-gray-200 rounded overflow-x-auto max-h-32">{JSON.stringify(debugInfo, null, 2)}</pre>
      )}
    </div>
  );
};
