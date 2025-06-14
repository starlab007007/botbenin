
export interface Bot {
  id: string;
  name: string;
  is_active: boolean;
}

export interface BotSession {
  id: string;
  session_token: string;
  last_activity: string;
  started_at: string;
  is_active: boolean;
  entry_point: string;
  user_agent: string | null;
  ip_address: string | null;
  bot_user_id: string | null;
}

export interface Message {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string; // 'bot' | 'user'
}

export interface BotMessageHistoryItem {
  message_id: string;
  bot_id: string;
  bot_user_id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  message_timestamp: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  user_name?: string;
  user_email?: string;
  session_id?: string;
  user_first_seen?: string;
  user_last_active?: string;
  bot_name: string;
  owner_id: string;
}
