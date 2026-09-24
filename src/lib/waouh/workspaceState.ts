import type { WaouhMuseMode, WaouhMusePhase } from "@/components/waouh/WaouhMuseAvatar";

export type WaouhWorkspaceAgentState = {
  goal: string;
  mode: WaouhMuseMode;
  phase: WaouhMusePhase;
  resultCount: number;
  sources: string[];
  contactLevel: string | null;
};

export type WaouhWorkspaceDealState = {
  active: boolean;
  title?: string | null;
  role?: "buyer" | "seller" | null;
  contactLevel?: string | null;
  intent?: string | null;
  closed?: boolean;
  price?: number | null;
  city?: string | null;
};

export const EMPTY_WAOUH_WORKSPACE_STATE: WaouhWorkspaceAgentState = {
  goal: "",
  mode: "neutral",
  phase: "idle",
  resultCount: 0,
  sources: [],
  contactLevel: null,
};
