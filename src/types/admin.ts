
export interface AdminDashboardStats {
  total_users: number;
  active_users_24h: number;
  active_users_7d: number;
  new_users_30d: number;
  total_bots: number;
  active_bots: number;
  total_campaigns: number;
  active_campaigns: number;
  total_messages_24h: number;
  total_subscriptions: number;
  revenue_monthly: number;
}

export const defaultAdminStats: AdminDashboardStats = {
  total_users: 0,
  active_users_24h: 0,
  active_users_7d: 0,
  new_users_30d: 0,
  total_bots: 0,
  active_bots: 0,
  total_campaigns: 0,
  active_campaigns: 0,
  total_messages_24h: 0,
  total_subscriptions: 0,
  revenue_monthly: 0,
};
