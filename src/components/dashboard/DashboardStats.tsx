
import React from 'react';

export interface DashboardStats {
  totalBots: number;
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

export interface UserPermissions {
  canCreateBots: boolean;
  canCreateAutomations: boolean;
  canAccessBusiness: boolean;
  canAccessMarketing: boolean;
  canAccessManagement: boolean;
  maxBots: number;
  role: string;
}

// Re-export for use in other components
export type { DashboardStats as DashboardStatsType, UserPermissions as UserPermissionsType };
