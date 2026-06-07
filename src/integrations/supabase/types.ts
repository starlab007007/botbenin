export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          details: Json | null
          id: string
          ip_address: string
          timestamp: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address: string
          timestamp?: string
          user_agent: string
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: string
          timestamp?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_generated_assets: {
        Row: {
          approved: boolean | null
          asset_type: string | null
          campaign_id: string | null
          created_at: string | null
          generated_content: Json
          id: string
          metadata: Json | null
          prompt_used: string | null
          quality_score: number | null
        }
        Insert: {
          approved?: boolean | null
          asset_type?: string | null
          campaign_id?: string | null
          created_at?: string | null
          generated_content: Json
          id?: string
          metadata?: Json | null
          prompt_used?: string | null
          quality_score?: number | null
        }
        Update: {
          approved?: boolean | null
          asset_type?: string | null
          campaign_id?: string | null
          created_at?: string | null
          generated_content?: Json
          id?: string
          metadata?: Json | null
          prompt_used?: string | null
          quality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ai_assets_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_sharing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          module: string
          timestamp: string
          user_id: string
        }
        Insert: {
          event_data?: Json
          event_type: string
          id?: string
          module: string
          timestamp?: string
          user_id: string
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          module?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      anonymous_visitor_sessions: {
        Row: {
          bot_id: string
          converted_to_lead: boolean | null
          ended_at: string | null
          entry_point: string | null
          fingerprint_id: string | null
          geolocation: Json | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          lead_info: Json | null
          pages_visited: number | null
          referrer_url: string | null
          session_token: string
          started_at: string | null
          time_spent_seconds: number | null
          total_interactions: number | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          bot_id: string
          converted_to_lead?: boolean | null
          ended_at?: string | null
          entry_point?: string | null
          fingerprint_id?: string | null
          geolocation?: Json | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          lead_info?: Json | null
          pages_visited?: number | null
          referrer_url?: string | null
          session_token: string
          started_at?: string | null
          time_spent_seconds?: number | null
          total_interactions?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          bot_id?: string
          converted_to_lead?: boolean | null
          ended_at?: string | null
          entry_point?: string | null
          fingerprint_id?: string | null
          geolocation?: Json | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          lead_info?: Json | null
          pages_visited?: number | null
          referrer_url?: string | null
          session_token?: string
          started_at?: string | null
          time_spent_seconds?: number | null
          total_interactions?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_visitor_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "anonymous_visitor_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "anonymous_visitor_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "anonymous_visitor_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "anonymous_visitor_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonymous_visitor_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "anonymous_visitor_sessions_fingerprint_id_fkey"
            columns: ["fingerprint_id"]
            isOneToOne: false
            referencedRelation: "visitor_fingerprints"
            referencedColumns: ["id"]
          },
        ]
      }
      ants_chat_memory: {
        Row: {
          created_at: string | null
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      ants_documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          attendees: Json
          created_at: string
          description: string | null
          end_time: string
          id: string
          location: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: Json
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          location?: string | null
          start_time: string
          status: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees?: Json
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          location?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audience_segments: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_size: number | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string
          performance_metrics: Json | null
          platforms: Json | null
          segment_criteria: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_size?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id: string
          performance_metrics?: Json | null
          platforms?: Json | null
          segment_criteria: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_size?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string
          performance_metrics?: Json | null
          platforms?: Json | null
          segment_criteria?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      automation_workflows: {
        Row: {
          actions: Json
          campaign_id: string | null
          created_at: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed: string | null
          name: string
          owner_id: string
          success_rate: number | null
          trigger_conditions: Json
          updated_at: string | null
        }
        Insert: {
          actions: Json
          campaign_id?: string | null
          created_at?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed?: string | null
          name: string
          owner_id: string
          success_rate?: number | null
          trigger_conditions: Json
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          campaign_id?: string | null
          created_at?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed?: string | null
          name?: string
          owner_id?: string
          success_rate?: number | null
          trigger_conditions?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_workflows_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_sharing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          actions: Json
          created_at: string
          execution_count: number | null
          id: string
          last_executed: string | null
          name: string
          status: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          execution_count?: number | null
          id?: string
          last_executed?: string | null
          name: string
          status: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          created_at?: string
          execution_count?: number | null
          id?: string
          last_executed?: string | null
          name?: string
          status?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_domain_assignments: {
        Row: {
          assigned_by: string | null
          bot_id: string
          confidence_score: number | null
          created_at: string
          domain_id: string
          id: string
        }
        Insert: {
          assigned_by?: string | null
          bot_id: string
          confidence_score?: number | null
          created_at?: string
          domain_id: string
          id?: string
        }
        Update: {
          assigned_by?: string | null
          bot_id?: string
          confidence_score?: number | null
          created_at?: string
          domain_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_domain_assignments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_domain_assignments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_domain_assignments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_domain_assignments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_domain_assignments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_domain_assignments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_domain_assignments_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "bot_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_domains: {
        Row: {
          context_indicators: Json | null
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          name: string
          updated_at: string
        }
        Insert: {
          context_indicators?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          updated_at?: string
        }
        Update: {
          context_indicators?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_owners: {
        Row: {
          created_at: string
          id: string
          max_bots: number
          subscription_plan: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_bots?: number
          subscription_plan?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_bots?: number
          subscription_plan?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bot_users: {
        Row: {
          bot_id: string
          created_at: string
          id: string
          is_authenticated: boolean | null
          last_active: string
          session_id: string | null
          user_email: string | null
          user_metadata: Json | null
          user_name: string | null
        }
        Insert: {
          bot_id: string
          created_at?: string
          id?: string
          is_authenticated?: boolean | null
          last_active?: string
          session_id?: string | null
          user_email?: string | null
          user_metadata?: Json | null
          user_name?: string | null
        }
        Update: {
          bot_id?: string
          created_at?: string
          id?: string
          is_authenticated?: boolean | null
          last_active?: string
          session_id?: string | null
          user_email?: string | null
          user_metadata?: Json | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_users_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_users_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_users_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_users_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "bot_users_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_users_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
        ]
      }
      bots: {
        Row: {
          api_key: string | null
          chat_context: string | null
          chat_title: string | null
          configuration: Json | null
          created_at: string
          description: string | null
          display_in_live_chat: boolean | null
          elevenlabs_agent_id: string | null
          id: string
          is_active: boolean | null
          is_personal_agent: boolean | null
          name: string
          owner_id: string | null
          public_chat_url: string | null
          share_enabled: boolean | null
          updated_at: string
          webhook_url: string | null
          widget_config: Json | null
        }
        Insert: {
          api_key?: string | null
          chat_context?: string | null
          chat_title?: string | null
          configuration?: Json | null
          created_at?: string
          description?: string | null
          display_in_live_chat?: boolean | null
          elevenlabs_agent_id?: string | null
          id?: string
          is_active?: boolean | null
          is_personal_agent?: boolean | null
          name: string
          owner_id?: string | null
          public_chat_url?: string | null
          share_enabled?: boolean | null
          updated_at?: string
          webhook_url?: string | null
          widget_config?: Json | null
        }
        Update: {
          api_key?: string | null
          chat_context?: string | null
          chat_title?: string | null
          configuration?: Json | null
          created_at?: string
          description?: string | null
          display_in_live_chat?: boolean | null
          elevenlabs_agent_id?: string | null
          id?: string
          is_active?: boolean | null
          is_personal_agent?: boolean | null
          name?: string
          owner_id?: string | null
          public_chat_url?: string | null
          share_enabled?: boolean | null
          updated_at?: string
          webhook_url?: string | null
          widget_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_performance_predictions: {
        Row: {
          actual_results: Json | null
          campaign_id: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          platform: string
          predicted_clicks: number | null
          predicted_conversions: number | null
          predicted_engagement: number | null
          predicted_reach: number | null
          prediction_factors: Json | null
        }
        Insert: {
          actual_results?: Json | null
          campaign_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          platform: string
          predicted_clicks?: number | null
          predicted_conversions?: number | null
          predicted_engagement?: number | null
          predicted_reach?: number | null
          prediction_factors?: Json | null
        }
        Update: {
          actual_results?: Json | null
          campaign_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          platform?: string
          predicted_clicks?: number | null
          predicted_conversions?: number | null
          predicted_engagement?: number | null
          predicted_reach?: number | null
          prediction_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_predictions_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_sharing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          owner_id: string
          preview_image: string | null
          tags: Json | null
          template_data: Json
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          owner_id: string
          preview_image?: string | null
          tags?: Json | null
          template_data?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          owner_id?: string
          preview_image?: string | null
          tags?: Json | null
          template_data?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          content: Json
          created_at: string
          end_date: string | null
          id: string
          metrics: Json
          name: string
          results: Json | null
          segment: Json | null
          start_date: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          end_date?: string | null
          id?: string
          metrics?: Json
          name: string
          results?: Json | null
          segment?: Json | null
          start_date: string
          status: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          end_date?: string | null
          id?: string
          metrics?: Json
          name?: string
          results?: Json | null
          segment?: Json | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_memory: {
        Row: {
          created_at: string | null
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          bot_id: string
          bot_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          message_content: string
          message_type: string
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          bot_id: string
          bot_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          message_content: string
          message_type?: string
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          bot_id?: string
          bot_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          message_content?: string
          message_type?: string
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_conversation_history"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_message_history"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "unified_conversation_history"
            referencedColumns: ["bot_user_id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          bot_id: string | null
          bot_user_id: string | null
          ended_at: string | null
          id: string
          session_metadata: Json | null
          session_token: string | null
          started_at: string
          total_messages: number | null
        }
        Insert: {
          bot_id?: string | null
          bot_user_id?: string | null
          ended_at?: string | null
          id?: string
          session_metadata?: Json | null
          session_token?: string | null
          started_at?: string
          total_messages?: number | null
        }
        Update: {
          bot_id?: string | null
          bot_user_id?: string | null
          ended_at?: string | null
          id?: string
          session_metadata?: Json | null
          session_token?: string | null
          started_at?: string
          total_messages?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_conversation_history"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_message_history"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "unified_conversation_history"
            referencedColumns: ["bot_user_id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          metadata: Json | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          metadata?: Json | null
          phone?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          metadata?: Json | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_variations: {
        Row: {
          a_b_test_variant: string | null
          ai_generated: boolean | null
          campaign_id: string
          content: string
          created_at: string | null
          hashtags: Json | null
          id: string
          media_asset_id: string | null
          platform: string | null
          predicted_performance: number | null
        }
        Insert: {
          a_b_test_variant?: string | null
          ai_generated?: boolean | null
          campaign_id: string
          content: string
          created_at?: string | null
          hashtags?: Json | null
          id?: string
          media_asset_id?: string | null
          platform?: string | null
          predicted_performance?: number | null
        }
        Update: {
          a_b_test_variant?: string | null
          ai_generated?: boolean | null
          campaign_id?: string
          content?: string
          created_at?: string | null
          hashtags?: Json | null
          id?: string
          media_asset_id?: string | null
          platform?: string | null
          predicted_performance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_variation_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_sharing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_variation_media"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_insights: {
        Row: {
          created_at: string
          data: Json
          id: string
          summary: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          summary?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          summary?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debug_session_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          function_name: string
          id: string
          parameters: Json | null
          stack_trace: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          parameters?: Json | null
          stack_trace?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          parameters?: Json | null
          stack_trace?: string | null
        }
        Relationships: []
      }
      demo_accounts: {
        Row: {
          created_at: string | null
          id: string
          is_demo: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_demo?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_demo?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      detailed_permissions: {
        Row: {
          action: string
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          fcm_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fcm_token: string
          id?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fcm_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      domain_suggestions: {
        Row: {
          action_prompt: string
          category: string
          conditions: Json | null
          created_at: string
          description: string
          domain_id: string
          icon_name: string
          id: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string
        }
        Insert: {
          action_prompt: string
          category: string
          conditions?: Json | null
          created_at?: string
          description: string
          domain_id: string
          icon_name: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          action_prompt?: string
          category?: string
          conditions?: Json | null
          created_at?: string
          description?: string
          domain_id?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_suggestions_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "bot_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_chat_sessions: {
        Row: {
          bot_id: string
          bot_messages: number | null
          bot_user_id: string | null
          ended_at: string | null
          entry_point: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          referrer_url: string | null
          session_duration_minutes: number | null
          session_metadata: Json | null
          session_token: string
          shortened_link_id: string | null
          started_at: string | null
          total_messages: number | null
          user_agent: string | null
          user_messages: number | null
        }
        Insert: {
          bot_id: string
          bot_messages?: number | null
          bot_user_id?: string | null
          ended_at?: string | null
          entry_point?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          referrer_url?: string | null
          session_duration_minutes?: number | null
          session_metadata?: Json | null
          session_token: string
          shortened_link_id?: string | null
          started_at?: string | null
          total_messages?: number | null
          user_agent?: string | null
          user_messages?: number | null
        }
        Update: {
          bot_id?: string
          bot_messages?: number | null
          bot_user_id?: string | null
          ended_at?: string | null
          entry_point?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          referrer_url?: string | null
          session_duration_minutes?: number | null
          session_metadata?: Json | null
          session_token?: string
          shortened_link_id?: string | null
          started_at?: string | null
          total_messages?: number | null
          user_agent?: string | null
          user_messages?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_conversation_history"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_message_history"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "unified_conversation_history"
            referencedColumns: ["bot_user_id"]
          },
          {
            foreignKeyName: "enhanced_chat_sessions_shortened_link_id_fkey"
            columns: ["shortened_link_id"]
            isOneToOne: false
            referencedRelation: "shortened_links"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_credentials: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          page_id: string | null
          page_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          page_id?: string | null
          page_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          page_id?: string | null
          page_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      facebook_posts: {
        Row: {
          created_at: string | null
          error_message: string | null
          facebook_post_id: string | null
          id: string
          page_id: string | null
          post_url: string | null
          published_at: string | null
          status: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          facebook_post_id?: string | null
          id?: string
          page_id?: string | null
          post_url?: string | null
          published_at?: string | null
          status?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          facebook_post_id?: string | null
          id?: string
          page_id?: string | null
          post_url?: string | null
          published_at?: string | null
          status?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_posts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "generated_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      file_folders: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          file_path: string
          id: string
          metadata: Json | null
          mime_type: string
          module: string
          name: string
          size: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          metadata?: Json | null
          mime_type: string
          module: string
          name: string
          size: number
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          module?: string
          name?: string
          size?: number
          user_id?: string
        }
        Relationships: []
      }
      final_videos: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          final_video_size_bytes: number | null
          final_video_url: string | null
          id: string
          merged_audio_duration: number | null
          merged_audio_url: string | null
          status: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          final_video_size_bytes?: number | null
          final_video_url?: string | null
          id?: string
          merged_audio_duration?: number | null
          merged_audio_url?: string | null
          status?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          final_video_size_bytes?: number | null
          final_video_url?: string | null
          id?: string
          merged_audio_duration?: number | null
          merged_audio_url?: string | null
          status?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      generated_videos: {
        Row: {
          audio_voice_id: string | null
          created_at: string | null
          description_audio_url: string | null
          description_text: string | null
          duration: number | null
          export_format: string | null
          export_resolution: string | null
          format: string | null
          id: string
          music_id: string
          optimized_for_platform: string | null
          promotional_summary: string | null
          promotional_summary_generated_at: string | null
          render_status: string | null
          rendered_video_url: string | null
          share_urls: Json | null
          shotstack_render_id: string | null
          size_bytes: number | null
          storage_path: string
          template_id: string
          thumbnail_url: string | null
          use_shotstack: boolean | null
          user_id: string | null
          video_id: string
          video_title: string
          video_url: string
        }
        Insert: {
          audio_voice_id?: string | null
          created_at?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          duration?: number | null
          export_format?: string | null
          export_resolution?: string | null
          format?: string | null
          id?: string
          music_id: string
          optimized_for_platform?: string | null
          promotional_summary?: string | null
          promotional_summary_generated_at?: string | null
          render_status?: string | null
          rendered_video_url?: string | null
          share_urls?: Json | null
          shotstack_render_id?: string | null
          size_bytes?: number | null
          storage_path: string
          template_id: string
          thumbnail_url?: string | null
          use_shotstack?: boolean | null
          user_id?: string | null
          video_id: string
          video_title: string
          video_url: string
        }
        Update: {
          audio_voice_id?: string | null
          created_at?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          duration?: number | null
          export_format?: string | null
          export_resolution?: string | null
          format?: string | null
          id?: string
          music_id?: string
          optimized_for_platform?: string | null
          promotional_summary?: string | null
          promotional_summary_generated_at?: string | null
          render_status?: string | null
          rendered_video_url?: string | null
          share_urls?: Json | null
          shotstack_render_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          template_id?: string
          thumbnail_url?: string | null
          use_shotstack?: boolean | null
          user_id?: string | null
          video_id?: string
          video_title?: string
          video_url?: string
        }
        Relationships: []
      }
      ia_creator_moderation: {
        Row: {
          auto_flagged: boolean | null
          created_at: string | null
          creation_id: string
          flagged_reason: string | null
          id: string
          moderation_notes: string | null
          moderator_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auto_flagged?: boolean | null
          created_at?: string | null
          creation_id: string
          flagged_reason?: string | null
          id?: string
          moderation_notes?: string | null
          moderator_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_flagged?: boolean | null
          created_at?: string | null
          creation_id?: string
          flagged_reason?: string | null
          id?: string
          moderation_notes?: string | null
          moderator_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_creator_moderation_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "visual_creations"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_creator_usage_limits: {
        Row: {
          created_at: string | null
          id: string
          is_unlimited: boolean | null
          monthly_flyers: number
          monthly_images: number
          monthly_videos: number
          plan_name: string
          storage_gb: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_unlimited?: boolean | null
          monthly_flyers?: number
          monthly_images?: number
          monthly_videos?: number
          plan_name: string
          storage_gb?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_unlimited?: boolean | null
          monthly_flyers?: number
          monthly_images?: number
          monthly_videos?: number
          plan_name?: string
          storage_gb?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      ia_creator_user_usage: {
        Row: {
          created_at: string | null
          flyers_created: number | null
          id: string
          images_created: number | null
          last_reset_at: string | null
          storage_used_mb: number | null
          updated_at: string | null
          user_id: string
          videos_created: number | null
          year_month: string
        }
        Insert: {
          created_at?: string | null
          flyers_created?: number | null
          id?: string
          images_created?: number | null
          last_reset_at?: string | null
          storage_used_mb?: number | null
          updated_at?: string | null
          user_id: string
          videos_created?: number | null
          year_month: string
        }
        Update: {
          created_at?: string | null
          flyers_created?: number | null
          id?: string
          images_created?: number | null
          last_reset_at?: string | null
          storage_used_mb?: number | null
          updated_at?: string | null
          user_id?: string
          videos_created?: number | null
          year_month?: string
        }
        Relationships: []
      }
      knowledge_bases: {
        Row: {
          bot_id: string | null
          completion_percentage: number | null
          created_at: string | null
          data: Json
          description: string | null
          id: string
          is_active: boolean | null
          last_trained_at: string | null
          name: string
          sector: string
          structural_info: Json
          template_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bot_id?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          data?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          name: string
          sector: string
          structural_info?: Json
          template_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bot_id?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          data?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          name?: string
          sector?: string
          structural_info?: Json
          template_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "knowledge_bases_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "knowledge_bases_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "knowledge_bases_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "knowledge_bases_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_bases_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          status: string
          tags: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tags?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tags?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      link_clicks: {
        Row: {
          city: string | null
          clicked_at: string | null
          country: string | null
          id: string
          ip_address: unknown
          referrer: string | null
          shortened_link_id: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          id?: string
          ip_address?: unknown
          referrer?: string | null
          shortened_link_id: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          id?: string
          ip_address?: unknown
          referrer?: string | null
          shortened_link_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_shortened_link_id_fkey"
            columns: ["shortened_link_id"]
            isOneToOne: false
            referencedRelation: "shortened_links"
            referencedColumns: ["id"]
          },
        ]
      }
      local_businesses: {
        Row: {
          address: string | null
          category: string | null
          company_name: string
          company_size: string | null
          coordinates: Json | null
          created_at: string
          distance: string | null
          email: string | null
          hours: string | null
          id: string
          industry: string | null
          job_title: string | null
          linkedin_url: string | null
          name: string
          phone: string | null
          price_range: string | null
          rating: number | null
          review_count: number | null
          search_session_id: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          company_name: string
          company_size?: string | null
          coordinates?: Json | null
          created_at?: string
          distance?: string | null
          email?: string | null
          hours?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          name: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          review_count?: number | null
          search_session_id: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          company_name?: string
          company_size?: string | null
          coordinates?: Json | null
          created_at?: string
          distance?: string | null
          email?: string | null
          hours?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          review_count?: number | null
          search_session_id?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      logs_session_anomalies: {
        Row: {
          anomaly_type: string | null
          bot_id: string | null
          created_at: string | null
          id: string
          input_token: string | null
        }
        Insert: {
          anomaly_type?: string | null
          bot_id?: string | null
          created_at?: string | null
          id?: string
          input_token?: string | null
        }
        Update: {
          anomaly_type?: string | null
          bot_id?: string | null
          created_at?: string | null
          id?: string
          input_token?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          clicked_count: number | null
          created_at: string
          delivered_count: number | null
          id: string
          message_template: string
          name: string
          opened_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          status: string
          subject: string | null
          target_contacts: Json
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clicked_count?: number | null
          created_at?: string
          delivered_count?: number | null
          id?: string
          message_template: string
          name: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          target_contacts?: Json
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clicked_count?: number | null
          created_at?: string
          delivered_count?: number | null
          id?: string
          message_template?: string
          name?: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          target_contacts?: Json
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          ai_generated: boolean | null
          campaign_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          original_url: string
          owner_id: string
          platform_optimized_versions: Json | null
          storage_path: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          campaign_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          original_url: string
          owner_id: string
          platform_optimized_versions?: Json | null
          storage_path?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          campaign_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          original_url?: string
          owner_id?: string
          platform_optimized_versions?: Json | null
          storage_path?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_media_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_sharing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          description: string
          display_name: string
          icon: string
          id: string
          name: string
          required_subscription_tier: string
        }
        Insert: {
          description: string
          display_name: string
          icon: string
          id?: string
          name: string
          required_subscription_tier: string
        }
        Update: {
          description?: string
          display_name?: string
          icon?: string
          id?: string
          name?: string
          required_subscription_tier?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          preference_type: string
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          preference_type: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          preference_type?: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          full_name: string | null
          id: string
          metadata: Json | null
          operator: string
          order_id: string
          payment_method: string
          phone_number: string
          plan_name: string | null
          qosic_response: Json | null
          qosic_transaction_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
          metadata?: Json | null
          operator: string
          order_id: string
          payment_method: string
          phone_number: string
          plan_name?: string | null
          qosic_response?: Json | null
          qosic_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
          metadata?: Json | null
          operator?: string
          order_id?: string
          payment_method?: string
          phone_number?: string
          plan_name?: string | null
          qosic_response?: Json | null
          qosic_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      performance_predictions: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          owner_id: string
          predicted_ctr: number | null
          predicted_engagement: number | null
          predicted_reach: number | null
          prediction_details: Json | null
          scheduled_post_id: string | null
          variation_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          owner_id: string
          predicted_ctr?: number | null
          predicted_engagement?: number | null
          predicted_reach?: number | null
          prediction_details?: Json | null
          scheduled_post_id?: string | null
          variation_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          owner_id?: string
          predicted_ctr?: number | null
          predicted_engagement?: number | null
          predicted_reach?: number | null
          prediction_details?: Json | null
          scheduled_post_id?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pred_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_sharing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pred_post"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pred_variation"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "content_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      platform_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_data: Json | null
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_data?: Json | null
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_data?: Json | null
          metric_name?: string
          metric_value?: number
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          characteristics: Json | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          images: Json | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          owner_id: string
          price: number | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          characteristics?: Json | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          owner_id: string
          price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          characteristics?: Json | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          owner_id?: string
          price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          last_sign_in: string | null
          phone: string | null
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_sign_in?: string | null
          phone?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_sign_in?: string | null
          phone?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prospect_databases: {
        Row: {
          created_at: string | null
          data: Json
          description: string | null
          file_name: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          template_type: string
          total_records: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          description?: string | null
          file_name?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          template_type?: string
          total_records?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          description?: string | null
          file_name?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          template_type?: string
          total_records?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          company: string | null
          created_at: string | null
          custom_fields: Json | null
          database_id: string
          email: string | null
          first_name: string
          id: string
          last_contact_date: string | null
          last_name: string
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          position: string | null
          score: number | null
          source: string | null
          status: string | null
          tags: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          database_id: string
          email?: string | null
          first_name: string
          id?: string
          last_contact_date?: string | null
          last_name: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          database_id?: string
          email?: string | null
          first_name?: string
          id?: string
          last_contact_date?: string | null
          last_name?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "prospect_databases"
            referencedColumns: ["id"]
          },
        ]
      }
      qualification_campaign_sends: {
        Row: {
          campaign_id: string
          channel: string
          contact_type: string
          contact_value: string
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          channel: string
          contact_type: string
          contact_value: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          contact_type?: string
          contact_value?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualification_campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "qualification_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      qualification_campaigns: {
        Row: {
          bot_link: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          failed_count: number | null
          id: string
          message_template: string | null
          metadata: Json | null
          name: string
          qualification_type: string
          sent_count: number | null
          started_at: string | null
          status: string
          success_count: number | null
          total_prospects: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_link?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          failed_count?: number | null
          id?: string
          message_template?: string | null
          metadata?: Json | null
          name: string
          qualification_type: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_prospects?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_link?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          failed_count?: number | null
          id?: string
          message_template?: string | null
          metadata?: Json | null
          name?: string
          qualification_type?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_prospects?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qualification_emails: {
        Row: {
          bot_link: string
          company_name: string | null
          contact_name: string | null
          created_at: string
          id: string
          message: string
          recipient_email: string
          sender_info: string | null
          sent_at: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          bot_link: string
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          message: string
          recipient_email: string
          sender_info?: string | null
          sent_at?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          bot_link?: string
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          message?: string
          recipient_email?: string
          sender_info?: string | null
          sent_at?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      qualification_results: {
        Row: {
          campaign_id: string
          channel: string
          company_name: string | null
          completed_at: string | null
          contact_name: string
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          phone: string | null
          prospect_id: string | null
          responses: Json | null
          score: number | null
          status: string
        }
        Insert: {
          campaign_id: string
          channel: string
          company_name?: string | null
          completed_at?: string | null
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          prospect_id?: string | null
          responses?: Json | null
          score?: number | null
          status?: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          company_name?: string | null
          completed_at?: string | null
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          prospect_id?: string | null
          responses?: Json | null
          score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualification_results_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          candidate_id: string
          certificate_code: string | null
          certificate_issued: boolean
          certificate_issued_at: string | null
          created_at: string
          duration_seconds: number | null
          holder_name: string | null
          id: string
          ip_hash: string | null
          mention: string
          module_id: string
          module_title: string
          passed: boolean
          ratio: number | null
          score: number
          total_questions: number
          user_agent: string | null
        }
        Insert: {
          answers?: Json
          candidate_id: string
          certificate_code?: string | null
          certificate_issued?: boolean
          certificate_issued_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          holder_name?: string | null
          id?: string
          ip_hash?: string | null
          mention: string
          module_id: string
          module_title: string
          passed?: boolean
          ratio?: number | null
          score: number
          total_questions: number
          user_agent?: string | null
        }
        Update: {
          answers?: Json
          candidate_id?: string
          certificate_code?: string | null
          certificate_issued?: boolean
          certificate_issued_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          holder_name?: string | null
          id?: string
          ip_hash?: string | null
          mention?: string
          module_id?: string
          module_title?: string
          passed?: boolean
          ratio?: number | null
          score?: number
          total_questions?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "quiz_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_candidates: {
        Row: {
          created_at: string
          email: string
          full_name: string
          guest_token_expires: string
          guest_token_hash: string
          id: string
          last_activity_at: string
          organization: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          guest_token_expires?: string
          guest_token_hash: string
          id?: string
          last_activity_at?: string
          organization?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          guest_token_expires?: string
          guest_token_hash?: string
          id?: string
          last_activity_at?: string
          organization?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      quiz_public_rate_limit: {
        Row: {
          created_at: string
          email_hash: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          email_hash: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          email_hash?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "detailed_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string
          display_name: string
          id: string
          is_system_role: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description: string
          display_name: string
          id?: string
          is_system_role?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          display_name?: string
          id?: string
          is_system_role?: boolean | null
          name?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          analytics: Json | null
          campaign_id: string
          created_at: string | null
          id: string
          media_asset_id: string | null
          media_urls: string[] | null
          owner_id: string
          platform: string
          posted_at: string | null
          result: string | null
          scheduled_at: string | null
          status: string | null
          variation_id: string | null
        }
        Insert: {
          analytics?: Json | null
          campaign_id: string
          created_at?: string | null
          id?: string
          media_asset_id?: string | null
          media_urls?: string[] | null
          owner_id: string
          platform: string
          posted_at?: string | null
          result?: string | null
          scheduled_at?: string | null
          status?: string | null
          variation_id?: string | null
        }
        Update: {
          analytics?: Json | null
          campaign_id?: string
          created_at?: string | null
          id?: string
          media_asset_id?: string | null
          media_urls?: string[] | null
          owner_id?: string
          platform?: string
          posted_at?: string | null
          result?: string | null
          scheduled_at?: string | null
          status?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_post_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_sharing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_post_media"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_post_variation"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "content_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      shortened_links: {
        Row: {
          bot_id: string
          click_count: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          original_url: string
          owner_id: string
          short_code: string
          updated_at: string | null
        }
        Insert: {
          bot_id: string
          click_count?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          original_url: string
          owner_id: string
          short_code: string
          updated_at?: string | null
        }
        Update: {
          bot_id?: string
          click_count?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          original_url?: string
          owner_id?: string
          short_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shortened_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "shortened_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "shortened_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "shortened_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "shortened_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortened_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "shortened_links_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      social_sharing_campaigns: {
        Row: {
          ai_settings: Json | null
          audience_segments: Json | null
          automation_rules: Json | null
          bot_id: string
          brand_guidelines: Json | null
          campaign_description: string | null
          campaign_name: string
          compliance_settings: Json | null
          created_at: string | null
          custom_message: string | null
          id: string
          is_active: boolean | null
          media_library: Json | null
          owner_id: string
          performance_goals: Json | null
          preview_images: string[] | null
          scheduling_settings: Json | null
          target_platforms: Json
          tracking_parameters: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_settings?: Json | null
          audience_segments?: Json | null
          automation_rules?: Json | null
          bot_id: string
          brand_guidelines?: Json | null
          campaign_description?: string | null
          campaign_name: string
          compliance_settings?: Json | null
          created_at?: string | null
          custom_message?: string | null
          id?: string
          is_active?: boolean | null
          media_library?: Json | null
          owner_id: string
          performance_goals?: Json | null
          preview_images?: string[] | null
          scheduling_settings?: Json | null
          target_platforms?: Json
          tracking_parameters?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_settings?: Json | null
          audience_segments?: Json | null
          automation_rules?: Json | null
          bot_id?: string
          brand_guidelines?: Json | null
          campaign_description?: string | null
          campaign_name?: string
          compliance_settings?: Json | null
          created_at?: string | null
          custom_message?: string | null
          id?: string
          is_active?: boolean | null
          media_library?: Json | null
          owner_id?: string
          performance_goals?: Json | null
          preview_images?: string[] | null
          scheduling_settings?: Json | null
          target_platforms?: Json
          tracking_parameters?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_sharing_campaigns_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "social_sharing_campaigns_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "social_sharing_campaigns_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "social_sharing_campaigns_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "social_sharing_campaigns_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_sharing_campaigns_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "social_sharing_campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscriber_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          priority: string | null
          read_at: string | null
          replied_at: string | null
          status: string | null
          subject: string | null
          subscriber_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: string | null
          subject?: string | null
          subscriber_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: string | null
          subject?: string | null
          subscriber_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_messages_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          last_activity: string | null
          name: string | null
          phone: string | null
          source: string | null
          status: string | null
          subscribed_at: string | null
          tags: Json | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_activity?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          tags?: Json | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_activity?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          tags?: Json | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          action: string
          created_at: string | null
          created_by: string | null
          effective_date: string
          id: string
          notes: string | null
          old_plan_id: string | null
          plan_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          id?: string
          notes?: string | null
          old_plan_id?: string | null
          plan_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          id?: string
          notes?: string | null
          old_plan_id?: string | null
          plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_old_plan_id_fkey"
            columns: ["old_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          api_calls_limit: number | null
          billing_cycle: string
          created_at: string
          features: Json
          features_detailed: Json | null
          id: string
          is_active: boolean | null
          max_automations: number
          max_conversations: number
          max_storage_gb: number | null
          max_users: number | null
          name: string
          price: number
          support_level: string | null
        }
        Insert: {
          api_calls_limit?: number | null
          billing_cycle: string
          created_at?: string
          features?: Json
          features_detailed?: Json | null
          id?: string
          is_active?: boolean | null
          max_automations?: number
          max_conversations?: number
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          price: number
          support_level?: string | null
        }
        Update: {
          api_calls_limit?: number | null
          billing_cycle?: string
          created_at?: string
          features?: Json
          features_detailed?: Json | null
          id?: string
          is_active?: boolean | null
          max_automations?: number
          max_conversations?: number
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          price?: number
          support_level?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string
          end_date: string | null
          id: string
          payment_method: Json | null
          plan_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          payment_method?: Json | null
          plan_id: string
          start_date?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          payment_method?: Json | null
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_metrics: {
        Row: {
          bot_id: string | null
          clicked_count: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          last_clicked: string | null
          suggestion_id: string
          updated_at: string
        }
        Insert: {
          bot_id?: string | null
          clicked_count?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          last_clicked?: string | null
          suggestion_id: string
          updated_at?: string
        }
        Update: {
          bot_id?: string | null
          clicked_count?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          last_clicked?: string | null
          suggestion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_metrics_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "suggestion_metrics_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "suggestion_metrics_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "suggestion_metrics_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "suggestion_metrics_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_metrics_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "suggestion_metrics_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "domain_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chat_sessions: {
        Row: {
          category_detected: string | null
          confidence_score: number | null
          created_at: string
          escalated_ticket_id: string | null
          id: string
          messages: Json
          module_detected: string | null
          resolved: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category_detected?: string | null
          confidence_score?: number | null
          created_at?: string
          escalated_ticket_id?: string | null
          id?: string
          messages?: Json
          module_detected?: string | null
          resolved?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category_detected?: string | null
          confidence_score?: number | null
          created_at?: string
          escalated_ticket_id?: string | null
          id?: string
          messages?: Json
          module_detected?: string | null
          resolved?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_sessions_escalated_ticket_id_fkey"
            columns: ["escalated_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_knowledge_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          module: string | null
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          module?: string | null
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          module?: string | null
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_public_rate_limit: {
        Row: {
          created_at: string
          email_hash: string | null
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          email_hash?: string | null
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          email_hash?: string | null
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      support_sla_events: {
        Row: {
          breached: boolean | null
          event_type: string
          id: string
          occurred_at: string
          threshold_minutes: number | null
          ticket_id: string
        }
        Insert: {
          breached?: boolean | null
          event_type: string
          id?: string
          occurred_at?: string
          threshold_minutes?: number | null
          ticket_id: string
        }
        Update: {
          breached?: boolean | null
          event_type?: string
          id?: string
          occurred_at?: string
          threshold_minutes?: number | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_sla_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          author_id: string
          author_role: string
          created_at: string
          id: string
          is_internal_note: boolean | null
          message: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          author_role?: string
          created_at?: string
          id?: string
          is_internal_note?: boolean | null
          message: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          author_role?: string
          created_at?: string
          id?: string
          is_internal_note?: boolean | null
          message?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          category: string
          chatbot_session_id: string | null
          closed_at: string | null
          created_at: string
          description: string
          guest_email: string | null
          guest_full_name: string | null
          guest_phone: string | null
          guest_token_expires: string | null
          guest_token_hash: string | null
          id: string
          is_guest_ticket: boolean | null
          module: string | null
          origin: string
          profile: string | null
          reproduction_steps: string | null
          resolution_summary: string | null
          resolved_at: string | null
          severity: string
          site: string | null
          sla_breached: boolean | null
          sla_due_at: string | null
          status: string
          ticket_number: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          chatbot_session_id?: string | null
          closed_at?: string | null
          created_at?: string
          description: string
          guest_email?: string | null
          guest_full_name?: string | null
          guest_phone?: string | null
          guest_token_expires?: string | null
          guest_token_hash?: string | null
          id?: string
          is_guest_ticket?: boolean | null
          module?: string | null
          origin?: string
          profile?: string | null
          reproduction_steps?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity?: string
          site?: string | null
          sla_breached?: boolean | null
          sla_due_at?: string | null
          status?: string
          ticket_number?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          chatbot_session_id?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string
          guest_email?: string | null
          guest_full_name?: string | null
          guest_phone?: string | null
          guest_token_expires?: string | null
          guest_token_hash?: string | null
          id?: string
          is_guest_ticket?: boolean | null
          module?: string | null
          origin?: string
          profile?: string | null
          reproduction_steps?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity?: string
          site?: string | null
          sla_breached?: boolean | null
          sla_due_at?: string | null
          status?: string
          ticket_number?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          created_at: string | null
          description: string | null
          download_count: number | null
          file_name: string
          file_path: string
          file_size: number
          folder_id: string | null
          id: string
          is_public: boolean | null
          mime_type: string
          original_name: string
          tags: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_name: string
          file_path: string
          file_size: number
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          mime_type: string
          original_name: string
          tags?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          mime_type?: string
          original_name?: string
          tags?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_media_gallery: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          media_ids: string[] | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          media_ids?: string[] | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          media_ids?: string[] | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_module_access: {
        Row: {
          access_level: string
          expires_at: string | null
          granted_at: string
          has_access: boolean
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          access_level: string
          expires_at?: string | null
          granted_at?: string
          has_access?: boolean
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          access_level?: string
          expires_at?: string | null
          granted_at?: string
          has_access?: boolean
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string | null
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "detailed_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          preferences: Json | null
          social_links: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          preferences?: Json | null
          social_links?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          preferences?: Json | null
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          language: string
          notification_preferences: Json
          timezone: string
          ui_preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          notification_preferences?: Json
          timezone?: string
          ui_preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          notification_preferences?: Json
          timezone?: string
          ui_preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_audio_tracks: {
        Row: {
          audio_duration: number
          audio_size_bytes: number | null
          audio_url: string
          created_at: string | null
          frame_type: string | null
          id: string
          language: string | null
          speed: number | null
          text_content: string
          user_id: string | null
          video_id: string
          voice_id: string
          voice_name: string | null
        }
        Insert: {
          audio_duration: number
          audio_size_bytes?: number | null
          audio_url: string
          created_at?: string | null
          frame_type?: string | null
          id?: string
          language?: string | null
          speed?: number | null
          text_content: string
          user_id?: string | null
          video_id: string
          voice_id: string
          voice_name?: string | null
        }
        Update: {
          audio_duration?: number
          audio_size_bytes?: number | null
          audio_url?: string
          created_at?: string | null
          frame_type?: string | null
          id?: string
          language?: string | null
          speed?: number | null
          text_content?: string
          user_id?: string | null
          video_id?: string
          voice_id?: string
          voice_name?: string | null
        }
        Relationships: []
      }
      video_descriptions: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          script_length: string | null
          script_text: string
          video_id: string | null
          voice_id: string | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          script_length?: string | null
          script_text: string
          video_id?: string | null
          voice_id?: string | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          script_length?: string | null
          script_text?: string
          video_id?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_descriptions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "generated_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_frames: {
        Row: {
          created_at: string | null
          frame_type: string
          id: string
          image_url: string
          promotional_style: string | null
          promotional_text: string | null
          promotional_text_char_count: number | null
          promotional_text_generated_at: string | null
          promotional_text_word_count: number | null
          prompt: string
          storage_path: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          frame_type: string
          id?: string
          image_url: string
          promotional_style?: string | null
          promotional_text?: string | null
          promotional_text_char_count?: number | null
          promotional_text_generated_at?: string | null
          promotional_text_word_count?: number | null
          prompt: string
          storage_path: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          frame_type?: string
          id?: string
          image_url?: string
          promotional_style?: string | null
          promotional_text?: string | null
          promotional_text_char_count?: number | null
          promotional_text_generated_at?: string | null
          promotional_text_word_count?: number | null
          prompt?: string
          storage_path?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      visitor_fingerprints: {
        Row: {
          browser_info: Json
          created_at: string | null
          fingerprint_hash: string
          id: string
          language: string | null
          last_seen: string | null
          platform: string | null
          screen_info: Json
          timezone: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          browser_info?: Json
          created_at?: string | null
          fingerprint_hash: string
          id?: string
          language?: string | null
          last_seen?: string | null
          platform?: string | null
          screen_info?: Json
          timezone?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          browser_info?: Json
          created_at?: string | null
          fingerprint_hash?: string
          id?: string
          language?: string | null
          last_seen?: string | null
          platform?: string | null
          screen_info?: Json
          timezone?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      visitor_progressive_data: {
        Row: {
          collected_at: string | null
          collection_method: string
          confidence_score: number | null
          data_type: string
          data_value: string
          id: string
          verified: boolean | null
          visitor_session_id: string
        }
        Insert: {
          collected_at?: string | null
          collection_method: string
          confidence_score?: number | null
          data_type: string
          data_value: string
          id?: string
          verified?: boolean | null
          visitor_session_id: string
        }
        Update: {
          collected_at?: string | null
          collection_method?: string
          confidence_score?: number | null
          data_type?: string
          data_value?: string
          id?: string
          verified?: boolean | null
          visitor_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_progressive_data_visitor_session_id_fkey"
            columns: ["visitor_session_id"]
            isOneToOne: false
            referencedRelation: "anonymous_visitor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_tracking_events: {
        Row: {
          element_class: string | null
          element_id: string | null
          event_data: Json
          event_type: string
          id: string
          page_url: string | null
          timestamp: string | null
          visitor_session_id: string
        }
        Insert: {
          element_class?: string | null
          element_id?: string | null
          event_data?: Json
          event_type: string
          id?: string
          page_url?: string | null
          timestamp?: string | null
          visitor_session_id: string
        }
        Update: {
          element_class?: string | null
          element_id?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          page_url?: string | null
          timestamp?: string | null
          visitor_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_tracking_events_visitor_session_id_fkey"
            columns: ["visitor_session_id"]
            isOneToOne: false
            referencedRelation: "anonymous_visitor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_creations: {
        Row: {
          created_at: string | null
          format: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          prompt: string
          storage_path: string | null
          style: string | null
          thumbnail_url: string | null
          title: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          prompt: string
          storage_path?: string | null
          style?: string | null
          thumbnail_url?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          prompt?: string
          storage_path?: string | null
          style?: string | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wa_campaign_events: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          level: string
          message: string
          payload: Json | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          level?: string
          message: string
          payload?: Json | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          level?: string
          message?: string
          payload?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wa_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_campaign_messages: {
        Row: {
          body: string
          campaign_id: string
          created_at: string
          id: string
          media_url: string | null
          variant_index: number
        }
        Insert: {
          body: string
          campaign_id: string
          created_at?: string
          id?: string
          media_url?: string | null
          variant_index?: number
        }
        Update: {
          body?: string
          campaign_id?: string
          created_at?: string
          id?: string
          media_url?: string | null
          variant_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "wa_campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wa_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_campaigns: {
        Row: {
          active_hours_end: string
          active_hours_start: string
          ai_prompt: string | null
          ai_variation: boolean
          body: string
          created_at: string
          extra_contact_ids: string[]
          id: string
          list_ids: string[]
          max_delay_s: number
          media_mime: string | null
          media_url: string | null
          min_delay_s: number
          name: string
          scheduled_at: string | null
          session_id: string | null
          stats: Json
          status: string
          throttle_per_hour: number
          timezone: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_hours_end?: string
          active_hours_start?: string
          ai_prompt?: string | null
          ai_variation?: boolean
          body?: string
          created_at?: string
          extra_contact_ids?: string[]
          id?: string
          list_ids?: string[]
          max_delay_s?: number
          media_mime?: string | null
          media_url?: string | null
          min_delay_s?: number
          name: string
          scheduled_at?: string | null
          session_id?: string | null
          stats?: Json
          status?: string
          throttle_per_hour?: number
          timezone?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_hours_end?: string
          active_hours_start?: string
          ai_prompt?: string | null
          ai_variation?: boolean
          body?: string
          created_at?: string
          extra_contact_ids?: string[]
          id?: string
          list_ids?: string[]
          max_delay_s?: number
          media_mime?: string | null
          media_url?: string | null
          min_delay_s?: number
          name?: string
          scheduled_at?: string | null
          session_id?: string | null
          stats?: Json
          status?: string
          throttle_per_hour?: number
          timezone?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wa_contact_list_members: {
        Row: {
          added_at: string
          contact_id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          list_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_contact_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wa_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_contact_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "wa_contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_contact_lists: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wa_contacts: {
        Row: {
          archived: boolean
          created_at: string
          display_name: string | null
          id: string
          is_whatsapp: boolean | null
          last_validated_at: string | null
          notes: string | null
          opt_out: boolean
          phone_10: string | null
          phone_8: string | null
          phone_e164: string
          source: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          is_whatsapp?: boolean | null
          last_validated_at?: string | null
          notes?: string | null
          opt_out?: boolean
          phone_10?: string | null
          phone_8?: string | null
          phone_e164: string
          source?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          is_whatsapp?: boolean | null
          last_validated_at?: string | null
          notes?: string | null
          opt_out?: boolean
          phone_10?: string | null
          phone_8?: string | null
          phone_e164?: string
          source?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wa_rate_buckets: {
        Row: {
          count: number
          session_id: string
          window_start: string
        }
        Insert: {
          count?: number
          session_id: string
          window_start: string
        }
        Update: {
          count?: number
          session_id?: string
          window_start?: string
        }
        Relationships: []
      }
      wa_send_jobs: {
        Row: {
          attempt: number
          campaign_id: string
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          id: string
          last_error: string | null
          read_at: string | null
          rendered_body: string | null
          replied_at: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          to_phone: string
          updated_at: string
          user_id: string
          waha_message_id: string | null
        }
        Insert: {
          attempt?: number
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          read_at?: string | null
          rendered_body?: string | null
          replied_at?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          to_phone: string
          updated_at?: string
          user_id: string
          waha_message_id?: string | null
        }
        Update: {
          attempt?: number
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          read_at?: string | null
          rendered_body?: string | null
          replied_at?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          to_phone?: string
          updated_at?: string
          user_id?: string
          waha_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_send_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wa_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_send_jobs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wa_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      waha_message_logs: {
        Row: {
          created_at: string
          id: string
          message_content: string
          message_type: string | null
          sent_at: string
          session_name: string
          status: string | null
          to_number: string
          user_id: string | null
          waha_response: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_content: string
          message_type?: string | null
          sent_at?: string
          session_name: string
          status?: string | null
          to_number: string
          user_id?: string | null
          waha_response?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          message_content?: string
          message_type?: string | null
          sent_at?: string
          session_name?: string
          status?: string | null
          to_number?: string
          user_id?: string | null
          waha_response?: Json | null
        }
        Relationships: []
      }
      waha_sessions_data: {
        Row: {
          account_info: Json | null
          created_at: string
          id: string
          last_activity: string | null
          metadata: Json | null
          phone_number: string | null
          server_name: string | null
          session_name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          account_info?: Json | null
          created_at?: string
          id?: string
          last_activity?: string | null
          metadata?: Json | null
          phone_number?: string | null
          server_name?: string | null
          session_name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          account_info?: Json | null
          created_at?: string
          id?: string
          last_activity?: string | null
          metadata?: Json | null
          phone_number?: string | null
          server_name?: string | null
          session_name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      waouh_alert_config: {
        Row: {
          cooldown_minutes: number
          enabled: boolean
          id: string
          last_alert_sent_at: string | null
          threshold_422: number
          threshold_429: number
          threshold_5xx: number
          threshold_global_pct: number
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
          webhook_url: string | null
          window_minutes: number
        }
        Insert: {
          cooldown_minutes?: number
          enabled?: boolean
          id?: string
          last_alert_sent_at?: string | null
          threshold_422?: number
          threshold_429?: number
          threshold_5xx?: number
          threshold_global_pct?: number
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          window_minutes?: number
        }
        Update: {
          cooldown_minutes?: number
          enabled?: boolean
          id?: string
          last_alert_sent_at?: string | null
          threshold_422?: number
          threshold_429?: number
          threshold_5xx?: number
          threshold_global_pct?: number
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          window_minutes?: number
        }
        Relationships: []
      }
      waouh_alert_history: {
        Row: {
          count: number | null
          created_at: string
          delivered: boolean
          error: string | null
          id: string
          payload: Json | null
          rule: string
          severity: string
        }
        Insert: {
          count?: number | null
          created_at?: string
          delivered?: boolean
          error?: string | null
          id?: string
          payload?: Json | null
          rule: string
          severity: string
        }
        Update: {
          count?: number | null
          created_at?: string
          delivered?: boolean
          error?: string | null
          id?: string
          payload?: Json | null
          rule?: string
          severity?: string
        }
        Relationships: []
      }
      waouh_articles: {
        Row: {
          address_description: string | null
          brand: string | null
          category: string
          city: string | null
          condition: string
          contact_whatsapp: string | null
          created_at: string
          currency: string
          description: string | null
          expires_at: string
          id: string
          interests_count: number
          location: unknown
          market_price_max: number | null
          market_price_min: number | null
          model: string | null
          origin: string
          origin_signal_id: string | null
          partner_id: string | null
          photos: string[]
          price: number
          radius_km: number
          seller_id: string
          source_channel: string | null
          status: string
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          address_description?: string | null
          brand?: string | null
          category: string
          city?: string | null
          condition?: string
          contact_whatsapp?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expires_at?: string
          id?: string
          interests_count?: number
          location?: unknown
          market_price_max?: number | null
          market_price_min?: number | null
          model?: string | null
          origin?: string
          origin_signal_id?: string | null
          partner_id?: string | null
          photos?: string[]
          price: number
          radius_km?: number
          seller_id: string
          source_channel?: string | null
          status?: string
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          address_description?: string | null
          brand?: string | null
          category?: string
          city?: string | null
          condition?: string
          contact_whatsapp?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expires_at?: string
          id?: string
          interests_count?: number
          location?: unknown
          market_price_max?: number | null
          market_price_min?: number | null
          model?: string | null
          origin?: string
          origin_signal_id?: string | null
          partner_id?: string | null
          photos?: string[]
          price?: number
          radius_km?: number
          seller_id?: string
          source_channel?: string | null
          status?: string
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "waouh_articles_origin_signal_fk"
            columns: ["origin_signal_id"]
            isOneToOne: false
            referencedRelation: "waouh_radar_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_articles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_stats_v"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "waouh_articles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_articles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_buyer_profiles: {
        Row: {
          category: string | null
          contact_whatsapp: string | null
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          location: unknown
          min_condition: string | null
          notified_article_ids: string[]
          origin: string
          origin_signal_id: string | null
          price_max: number | null
          price_min: number | null
          query_text: string
          radius_km: number
          reference_photos: string[] | null
          source_channel: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          location?: unknown
          min_condition?: string | null
          notified_article_ids?: string[]
          origin?: string
          origin_signal_id?: string | null
          price_max?: number | null
          price_min?: number | null
          query_text: string
          radius_km?: number
          reference_photos?: string[] | null
          source_channel?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          location?: unknown
          min_condition?: string | null
          notified_article_ids?: string[]
          origin?: string
          origin_signal_id?: string | null
          price_max?: number | null
          price_min?: number | null
          query_text?: string
          radius_km?: number
          reference_photos?: string[] | null
          source_channel?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waouh_buyer_profiles_origin_signal_fk"
            columns: ["origin_signal_id"]
            isOneToOne: false
            referencedRelation: "waouh_radar_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_buyer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          value: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          value: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          value?: Json
        }
        Relationships: []
      }
      waouh_catalog_backups: {
        Row: {
          bytes_size: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          rows_count: number
          storage_path: string
          trigger: string
        }
        Insert: {
          bytes_size?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          rows_count?: number
          storage_path: string
          trigger?: string
        }
        Update: {
          bytes_size?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          rows_count?: number
          storage_path?: string
          trigger?: string
        }
        Relationships: []
      }
      waouh_commission_settings: {
        Row: {
          bonus_volume: Json | null
          commission_partner_pct_sur_plateforme: number
          commission_plateforme_pct: number
          id: number
          seuil_payout_fcfa: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bonus_volume?: Json | null
          commission_partner_pct_sur_plateforme?: number
          commission_plateforme_pct?: number
          id?: number
          seuil_payout_fcfa?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bonus_volume?: Json | null
          commission_partner_pct_sur_plateforme?: number
          commission_plateforme_pct?: number
          id?: number
          seuil_payout_fcfa?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      waouh_conversations: {
        Row: {
          channel: string
          context: Json
          current_article_id: string | null
          current_transaction_id: string | null
          id: string
          last_direction: string | null
          last_inbound_at: string | null
          last_intent: string | null
          last_message: string | null
          phone_number: string
          state: string
          unread_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channel?: string
          context?: Json
          current_article_id?: string | null
          current_transaction_id?: string | null
          id?: string
          last_direction?: string | null
          last_inbound_at?: string | null
          last_intent?: string | null
          last_message?: string | null
          phone_number: string
          state?: string
          unread_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          context?: Json
          current_article_id?: string | null
          current_transaction_id?: string | null
          id?: string
          last_direction?: string | null
          last_inbound_at?: string | null
          last_intent?: string | null
          last_message?: string | null
          phone_number?: string
          state?: string
          unread_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_couriers: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone_number: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone_number: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      waouh_deals: {
        Row: {
          amount: number
          article_id: string | null
          assigned_at: string | null
          buyer_user_id: string
          cancelled_at: string | null
          courier_name: string | null
          courier_phone: string | null
          courier_user_id: string | null
          created_at: string
          delivered_at: string | null
          dropoff_address: string | null
          eta_at: string | null
          eta_minutes: number | null
          id: string
          negotiation_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          picked_up_at: string | null
          pickup_address: string | null
          seller_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          article_id?: string | null
          assigned_at?: string | null
          buyer_user_id: string
          cancelled_at?: string | null
          courier_name?: string | null
          courier_phone?: string | null
          courier_user_id?: string | null
          created_at?: string
          delivered_at?: string | null
          dropoff_address?: string | null
          eta_at?: string | null
          eta_minutes?: number | null
          id?: string
          negotiation_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          picked_up_at?: string | null
          pickup_address?: string | null
          seller_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          article_id?: string | null
          assigned_at?: string | null
          buyer_user_id?: string
          cancelled_at?: string | null
          courier_name?: string | null
          courier_phone?: string | null
          courier_user_id?: string | null
          created_at?: string
          delivered_at?: string | null
          dropoff_address?: string | null
          eta_at?: string | null
          eta_minutes?: number | null
          id?: string
          negotiation_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          picked_up_at?: string | null
          pickup_address?: string | null
          seller_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      waouh_external_listings: {
        Row: {
          category: string | null
          city: string | null
          condition: string | null
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          matched_buyer_ids: string[] | null
          price: number | null
          promoted_article_id: string | null
          raw: Json | null
          scraped_at: string
          seller_name: string | null
          seller_phone: string | null
          seller_user_id: string | null
          source: string
          source_url: string
          status: string
          title: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          condition?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          matched_buyer_ids?: string[] | null
          price?: number | null
          promoted_article_id?: string | null
          raw?: Json | null
          scraped_at?: string
          seller_name?: string | null
          seller_phone?: string | null
          seller_user_id?: string | null
          source: string
          source_url: string
          status?: string
          title?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          condition?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          matched_buyer_ids?: string[] | null
          price?: number | null
          promoted_article_id?: string | null
          raw?: Json | null
          scraped_at?: string
          seller_name?: string | null
          seller_phone?: string | null
          seller_user_id?: string | null
          source?: string
          source_url?: string
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_external_listings_promoted_article_id_fkey"
            columns: ["promoted_article_id"]
            isOneToOne: false
            referencedRelation: "waouh_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_external_listings_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_interests: {
        Row: {
          article_id: string
          buyer_profile_id: string | null
          buyer_user_id: string | null
          created_at: string
          id: string
          payload: Json | null
          seller_user_id: string | null
          source: string | null
        }
        Insert: {
          article_id: string
          buyer_profile_id?: string | null
          buyer_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          seller_user_id?: string | null
          source?: string | null
        }
        Update: {
          article_id?: string
          buyer_profile_id?: string | null
          buyer_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          seller_user_id?: string | null
          source?: string | null
        }
        Relationships: []
      }
      waouh_lid_phone_map: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          jid: string | null
          last_synced_at: string
          lid: string
          phone: string | null
          phone_e164: string | null
          pushname: string | null
          session: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          jid?: string | null
          last_synced_at?: string
          lid: string
          phone?: string | null
          phone_e164?: string | null
          pushname?: string | null
          session?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          jid?: string | null
          last_synced_at?: string
          lid?: string
          phone?: string | null
          phone_e164?: string | null
          pushname?: string | null
          session?: string | null
          source?: string | null
        }
        Relationships: []
      }
      waouh_lid_sync_runs: {
        Row: {
          contacts_fetched: number | null
          contacts_mapped: number | null
          error: string | null
          finished_at: string | null
          id: string
          rows_backfilled: number | null
          session: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          contacts_fetched?: number | null
          contacts_mapped?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          rows_backfilled?: number | null
          session?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          contacts_fetched?: number | null
          contacts_mapped?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          rows_backfilled?: number | null
          session?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      waouh_messages: {
        Row: {
          article_id: string | null
          attachments: Json | null
          channel: string
          conversation_id: string | null
          created_at: string
          direction: string
          id: string
          meta: Json | null
          phone_number: string | null
          text: string
          user_id: string | null
          web_session_id: string | null
        }
        Insert: {
          article_id?: string | null
          attachments?: Json | null
          channel?: string
          conversation_id?: string | null
          created_at?: string
          direction: string
          id?: string
          meta?: Json | null
          phone_number?: string | null
          text: string
          user_id?: string | null
          web_session_id?: string | null
        }
        Update: {
          article_id?: string | null
          attachments?: Json | null
          channel?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          meta?: Json | null
          phone_number?: string | null
          text?: string
          user_id?: string | null
          web_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "waouh_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_negotiations: {
        Row: {
          article_id: string | null
          buyer_user_id: string | null
          closed_at: string | null
          contact_shared_at: string | null
          created_at: string
          id: string
          last_actor: string | null
          last_offer_price: number | null
          match_id: string | null
          meta: Json
          seller_user_id: string | null
          state: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          buyer_user_id?: string | null
          closed_at?: string | null
          contact_shared_at?: string | null
          created_at?: string
          id?: string
          last_actor?: string | null
          last_offer_price?: number | null
          match_id?: string | null
          meta?: Json
          seller_user_id?: string | null
          state?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          buyer_user_id?: string | null
          closed_at?: string | null
          contact_shared_at?: string | null
          created_at?: string
          id?: string
          last_actor?: string | null
          last_offer_price?: number | null
          match_id?: string | null
          meta?: Json
          seller_user_id?: string | null
          state?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waouh_negotiations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "waouh_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_negotiations_buyer_user_id_fkey"
            columns: ["buyer_user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_negotiations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "waouh_radar_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_negotiations_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_notifications: {
        Row: {
          article_id: string | null
          channel: string | null
          conversation_id: string | null
          dedupe_key: string | null
          delivered_at: string | null
          delivery_status: string | null
          id: string
          notification_type: string
          opened: boolean
          payload: Json | null
          photos: string[] | null
          read_at: string | null
          sent_at: string
          user_id: string
          web_session_id: string | null
        }
        Insert: {
          article_id?: string | null
          channel?: string | null
          conversation_id?: string | null
          dedupe_key?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          notification_type: string
          opened?: boolean
          payload?: Json | null
          photos?: string[] | null
          read_at?: string | null
          sent_at?: string
          user_id: string
          web_session_id?: string | null
        }
        Update: {
          article_id?: string | null
          channel?: string | null
          conversation_id?: string | null
          dedupe_key?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          notification_type?: string
          opened?: boolean
          payload?: Json | null
          photos?: string[] | null
          read_at?: string | null
          sent_at?: string
          user_id?: string
          web_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_notifications_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "waouh_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_outbound_queue: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          dedupe_key: string | null
          event_type: string | null
          id: string
          image_url: string | null
          last_error: string | null
          message_id: string | null
          next_attempt_at: string | null
          payload: Json
          read_at: string | null
          sent_at: string | null
          status: string
          template: string
          to_phone: string | null
          to_user_id: string | null
          transaction_id: string | null
          updated_at: string
          web_session_id: string | null
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          last_error?: string | null
          message_id?: string | null
          next_attempt_at?: string | null
          payload?: Json
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template: string
          to_phone?: string | null
          to_user_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          web_session_id?: string | null
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          last_error?: string | null
          message_id?: string | null
          next_attempt_at?: string | null
          payload?: Json
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template?: string
          to_phone?: string | null
          to_user_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          web_session_id?: string | null
        }
        Relationships: []
      }
      waouh_partner_activity: {
        Row: {
          actor_id: string | null
          business_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["waouh_partner_activity_type"]
          id: string
          metadata: Json | null
          partner_id: string
          product_id: string | null
          sale_id: string | null
          title: string | null
        }
        Insert: {
          actor_id?: string | null
          business_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["waouh_partner_activity_type"]
          id?: string
          metadata?: Json | null
          partner_id: string
          product_id?: string | null
          sale_id?: string | null
          title?: string | null
        }
        Update: {
          actor_id?: string | null
          business_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["waouh_partner_activity_type"]
          id?: string
          metadata?: Json | null
          partner_id?: string
          product_id?: string | null
          sale_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_partner_activity_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_partner_activity_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_stats_v"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "waouh_partner_activity_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_partner_activity_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_partner_activity_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_partner_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          partner_id: string
          payload: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          partner_id: string
          payload?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          partner_id?: string
          payload?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_partner_audit_log_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_stats_v"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "waouh_partner_audit_log_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_partner_businesses: {
        Row: {
          adresse_complete: string | null
          categorie: string | null
          code_court: string | null
          created_at: string
          description: string | null
          email: string | null
          geohash: string | null
          gerant_nom: string | null
          gerant_role: string | null
          horaires: Json | null
          id: string
          langues_parlees: string[] | null
          lat: number | null
          lng: number | null
          mobile_money_number: string | null
          mobile_money_operator: string | null
          nom_entreprise: string
          note_qualite: number | null
          partner_id: string
          photo_principale: string | null
          photos: string[] | null
          quartier: string | null
          site_web: string | null
          sous_categorie: string | null
          statut: string | null
          tags: string[] | null
          telephone: string | null
          updated_at: string
          verifie_admin: boolean | null
          ville: string | null
          whatsapp: string | null
        }
        Insert: {
          adresse_complete?: string | null
          categorie?: string | null
          code_court?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          geohash?: string | null
          gerant_nom?: string | null
          gerant_role?: string | null
          horaires?: Json | null
          id?: string
          langues_parlees?: string[] | null
          lat?: number | null
          lng?: number | null
          mobile_money_number?: string | null
          mobile_money_operator?: string | null
          nom_entreprise: string
          note_qualite?: number | null
          partner_id: string
          photo_principale?: string | null
          photos?: string[] | null
          quartier?: string | null
          site_web?: string | null
          sous_categorie?: string | null
          statut?: string | null
          tags?: string[] | null
          telephone?: string | null
          updated_at?: string
          verifie_admin?: boolean | null
          ville?: string | null
          whatsapp?: string | null
        }
        Update: {
          adresse_complete?: string | null
          categorie?: string | null
          code_court?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          geohash?: string | null
          gerant_nom?: string | null
          gerant_role?: string | null
          horaires?: Json | null
          id?: string
          langues_parlees?: string[] | null
          lat?: number | null
          lng?: number | null
          mobile_money_number?: string | null
          mobile_money_operator?: string | null
          nom_entreprise?: string
          note_qualite?: number | null
          partner_id?: string
          photo_principale?: string | null
          photos?: string[] | null
          quartier?: string | null
          site_web?: string | null
          sous_categorie?: string | null
          statut?: string | null
          tags?: string[] | null
          telephone?: string | null
          updated_at?: string
          verifie_admin?: boolean | null
          ville?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_partner_businesses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_stats_v"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "waouh_partner_businesses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_partner_payouts: {
        Row: {
          created_at: string
          id: string
          mobile_money_ref: string | null
          montant_total: number
          nb_ventes: number
          notes: string | null
          paid_at: string | null
          partner_id: string
          paye_par: string | null
          payment_proof_url: string | null
          periode_debut: string
          periode_fin: string
          statut: string
        }
        Insert: {
          created_at?: string
          id?: string
          mobile_money_ref?: string | null
          montant_total: number
          nb_ventes?: number
          notes?: string | null
          paid_at?: string | null
          partner_id: string
          paye_par?: string | null
          payment_proof_url?: string | null
          periode_debut: string
          periode_fin: string
          statut?: string
        }
        Update: {
          created_at?: string
          id?: string
          mobile_money_ref?: string | null
          montant_total?: number
          nb_ventes?: number
          notes?: string | null
          paid_at?: string | null
          partner_id?: string
          paye_par?: string | null
          payment_proof_url?: string | null
          periode_debut?: string
          periode_fin?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "waouh_partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_stats_v"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "waouh_partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_partner_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          partner_id: string
          permission: Database["public"]["Enums"]["waouh_partner_permission"]
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          partner_id: string
          permission: Database["public"]["Enums"]["waouh_partner_permission"]
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          partner_id?: string
          permission?: Database["public"]["Enums"]["waouh_partner_permission"]
        }
        Relationships: [
          {
            foreignKeyName: "waouh_partner_permissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_stats_v"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "waouh_partner_permissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_partner_products: {
        Row: {
          business_id: string
          categorie: string | null
          created_at: string
          derniere_maj: string | null
          description: string | null
          devise: string | null
          disponible: boolean | null
          id: string
          nom: string
          partner_id: string
          photos: string[] | null
          prix_max: number | null
          prix_min: number | null
          stock_estime: number | null
          tags: string[] | null
          unite: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          categorie?: string | null
          created_at?: string
          derniere_maj?: string | null
          description?: string | null
          devise?: string | null
          disponible?: boolean | null
          id?: string
          nom: string
          partner_id: string
          photos?: string[] | null
          prix_max?: number | null
          prix_min?: number | null
          stock_estime?: number | null
          tags?: string[] | null
          unite?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          categorie?: string | null
          created_at?: string
          derniere_maj?: string | null
          description?: string | null
          devise?: string | null
          disponible?: boolean | null
          id?: string
          nom?: string
          partner_id?: string
          photos?: string[] | null
          prix_max?: number | null
          prix_min?: number | null
          stock_estime?: number | null
          tags?: string[] | null
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waouh_partner_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_partner_products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_stats_v"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "waouh_partner_products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_partner_sales: {
        Row: {
          business_id: string | null
          buyer_phone: string | null
          commission_partner: number
          commission_plateforme: number
          created_at: string
          date_paiement_commission: string | null
          date_vente: string
          id: string
          montant_vente: number
          partner_id: string
          payout_id: string | null
          product_id: string | null
          source: string | null
          statut: string
          transaction_id: string | null
        }
        Insert: {
          business_id?: string | null
          buyer_phone?: string | null
          commission_partner: number
          commission_plateforme: number
          created_at?: string
          date_paiement_commission?: string | null
          date_vente?: string
          id?: string
          montant_vente: number
          partner_id: string
          payout_id?: string | null
          product_id?: string | null
          source?: string | null
          statut?: string
          transaction_id?: string | null
        }
        Update: {
          business_id?: string | null
          buyer_phone?: string | null
          commission_partner?: number
          commission_plateforme?: number
          created_at?: string
          date_paiement_commission?: string | null
          date_vente?: string
          id?: string
          montant_vente?: number
          partner_id?: string
          payout_id?: string | null
          product_id?: string | null
          source?: string | null
          statut?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_partner_sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_partner_sales_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_stats_v"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "waouh_partner_sales_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "waouh_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_partner_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "waouh_partner_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_partner_sales_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "waouh_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_partners: {
        Row: {
          code_partenaire: string
          created_at: string
          date_activation: string | null
          email: string | null
          id: string
          kyc_doc_url: string | null
          kyc_verified: boolean | null
          mobile_money_number: string | null
          mobile_money_operator: string | null
          niveau: string | null
          nom: string
          notes_admin: string | null
          pays: string | null
          statut: string
          telephone: string | null
          updated_at: string
          user_id: string
          ville: string | null
          whatsapp: string | null
        }
        Insert: {
          code_partenaire: string
          created_at?: string
          date_activation?: string | null
          email?: string | null
          id?: string
          kyc_doc_url?: string | null
          kyc_verified?: boolean | null
          mobile_money_number?: string | null
          mobile_money_operator?: string | null
          niveau?: string | null
          nom: string
          notes_admin?: string | null
          pays?: string | null
          statut?: string
          telephone?: string | null
          updated_at?: string
          user_id: string
          ville?: string | null
          whatsapp?: string | null
        }
        Update: {
          code_partenaire?: string
          created_at?: string
          date_activation?: string | null
          email?: string | null
          id?: string
          kyc_doc_url?: string | null
          kyc_verified?: boolean | null
          mobile_money_number?: string | null
          mobile_money_operator?: string | null
          niveau?: string | null
          nom?: string
          notes_admin?: string | null
          pays?: string | null
          statut?: string
          telephone?: string | null
          updated_at?: string
          user_id?: string
          ville?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      waouh_payments: {
        Row: {
          amount: number
          created_at: string
          error_message: string | null
          id: string
          msisdn: string
          operator: string
          payment_type: string
          qosic_response: Json | null
          qosic_transref: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          error_message?: string | null
          id?: string
          msisdn: string
          operator: string
          payment_type?: string
          qosic_response?: Json | null
          qosic_transref?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string | null
          id?: string
          msisdn?: string
          operator?: string
          payment_type?: string
          qosic_response?: Json | null
          qosic_transref?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "waouh_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_pipeline_events: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          signal_id: string | null
          status: string
          step: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          signal_id?: string | null
          status: string
          step: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          signal_id?: string | null
          status?: string
          step?: string
        }
        Relationships: []
      }
      waouh_processed_events: {
        Row: {
          created_at: string
          event_id: string
          source: string
        }
        Insert: {
          created_at?: string
          event_id: string
          source?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          source?: string
        }
        Relationships: []
      }
      waouh_radar_api_configs: {
        Row: {
          active: boolean
          api_key: string | null
          created_at: string
          daily_quota: number
          extra_config: Json
          id: string
          last_test_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          provider: string
          updated_at: string
          updated_by: string | null
          usage_reset_at: string
          usage_today: number
        }
        Insert: {
          active?: boolean
          api_key?: string | null
          created_at?: string
          daily_quota?: number
          extra_config?: Json
          id?: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          provider: string
          updated_at?: string
          updated_by?: string | null
          usage_reset_at?: string
          usage_today?: number
        }
        Update: {
          active?: boolean
          api_key?: string | null
          created_at?: string
          daily_quota?: number
          extra_config?: Json
          id?: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
          usage_reset_at?: string
          usage_today?: number
        }
        Relationships: []
      }
      waouh_radar_contacts: {
        Row: {
          auto_notify: boolean
          categories: string[]
          cities: string[]
          created_at: string
          display_name: string | null
          first_seen_at: string
          id: string
          intent_buy_count: number
          intent_sell_count: number
          last_message_at: string | null
          last_seen_at: string
          metadata: Json
          notes: string | null
          phone_e164: string
          signal_count: number
          source: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          auto_notify?: boolean
          categories?: string[]
          cities?: string[]
          created_at?: string
          display_name?: string | null
          first_seen_at?: string
          id?: string
          intent_buy_count?: number
          intent_sell_count?: number
          last_message_at?: string | null
          last_seen_at?: string
          metadata?: Json
          notes?: string | null
          phone_e164: string
          signal_count?: number
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          auto_notify?: boolean
          categories?: string[]
          cities?: string[]
          created_at?: string
          display_name?: string | null
          first_seen_at?: string
          id?: string
          intent_buy_count?: number
          intent_sell_count?: number
          last_message_at?: string | null
          last_seen_at?: string
          metadata?: Json
          notes?: string | null
          phone_e164?: string
          signal_count?: number
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      waouh_radar_matches: {
        Row: {
          created_at: string
          id: string
          notification_channel: string | null
          notified_at: string | null
          response: string | null
          score: number
          signal_id: string | null
          target_buyer_profile_id: string | null
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notification_channel?: string | null
          notified_at?: string | null
          response?: string | null
          score: number
          signal_id?: string | null
          target_buyer_profile_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notification_channel?: string | null
          notified_at?: string | null
          response?: string | null
          score?: number
          signal_id?: string | null
          target_buyer_profile_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_radar_matches_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "waouh_radar_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_radar_matches_target_buyer_profile_id_fkey"
            columns: ["target_buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "waouh_buyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_radar_profiles: {
        Row: {
          avg_price: number | null
          categories: string[] | null
          cities: string[] | null
          contact_handle: string | null
          contact_phone: string | null
          created_at: string
          display_name: string | null
          id: string
          invited_at: string | null
          joined_user_id: string | null
          last_seen_at: string | null
          opt_in: boolean | null
          reliability_score: number | null
          role: string
          signals_count: number | null
          waouh_user_id: string | null
        }
        Insert: {
          avg_price?: number | null
          categories?: string[] | null
          cities?: string[] | null
          contact_handle?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invited_at?: string | null
          joined_user_id?: string | null
          last_seen_at?: string | null
          opt_in?: boolean | null
          reliability_score?: number | null
          role?: string
          signals_count?: number | null
          waouh_user_id?: string | null
        }
        Update: {
          avg_price?: number | null
          categories?: string[] | null
          cities?: string[] | null
          contact_handle?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invited_at?: string | null
          joined_user_id?: string | null
          last_seen_at?: string | null
          opt_in?: boolean | null
          reliability_score?: number | null
          role?: string
          signals_count?: number | null
          waouh_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_radar_profiles_waouh_user_id_fkey"
            columns: ["waouh_user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_radar_signals: {
        Row: {
          captured_at: string
          category: string | null
          city: string | null
          confidence: number | null
          contact_handle: string | null
          contact_phone: string | null
          embedding: string | null
          id: string
          intent: string | null
          price: number | null
          product: Json | null
          promoted_article_id: string | null
          promoted_buyer_profile_id: string | null
          raw_payload: Json | null
          raw_text: string | null
          raw_url: string | null
          source_id: string | null
          source_type: string | null
          status: string
          waouh_user_id: string | null
        }
        Insert: {
          captured_at?: string
          category?: string | null
          city?: string | null
          confidence?: number | null
          contact_handle?: string | null
          contact_phone?: string | null
          embedding?: string | null
          id?: string
          intent?: string | null
          price?: number | null
          product?: Json | null
          promoted_article_id?: string | null
          promoted_buyer_profile_id?: string | null
          raw_payload?: Json | null
          raw_text?: string | null
          raw_url?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          waouh_user_id?: string | null
        }
        Update: {
          captured_at?: string
          category?: string | null
          city?: string | null
          confidence?: number | null
          contact_handle?: string | null
          contact_phone?: string | null
          embedding?: string | null
          id?: string
          intent?: string | null
          price?: number | null
          product?: Json | null
          promoted_article_id?: string | null
          promoted_buyer_profile_id?: string | null
          raw_payload?: Json | null
          raw_text?: string | null
          raw_url?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          waouh_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_radar_signals_promoted_article_id_fkey"
            columns: ["promoted_article_id"]
            isOneToOne: false
            referencedRelation: "waouh_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_radar_signals_promoted_buyer_profile_id_fkey"
            columns: ["promoted_buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "waouh_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_radar_signals_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "waouh_radar_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_radar_signals_waouh_user_id_fkey"
            columns: ["waouh_user_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_radar_sources: {
        Row: {
          active: boolean
          config: Json | null
          created_at: string
          id: string
          identifier: string
          label: string | null
          last_scan_at: string | null
          last_signal_count: number | null
          scan_freq_min: number
          type: string
        }
        Insert: {
          active?: boolean
          config?: Json | null
          created_at?: string
          id?: string
          identifier: string
          label?: string | null
          last_scan_at?: string | null
          last_signal_count?: number | null
          scan_freq_min?: number
          type: string
        }
        Update: {
          active?: boolean
          config?: Json | null
          created_at?: string
          id?: string
          identifier?: string
          label?: string | null
          last_scan_at?: string | null
          last_signal_count?: number | null
          scan_freq_min?: number
          type?: string
        }
        Relationships: []
      }
      waouh_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          ratee_id: string
          rater_id: string
          rating: number
          transaction_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          ratee_id: string
          rater_id: string
          rating: number
          transaction_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          rating?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waouh_ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_ratings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "waouh_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      waouh_statuses: {
        Row: {
          article_id: string | null
          author_avatar_url: string | null
          author_name: string | null
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          media_kind: string | null
          media_url: string | null
          media_urls: string[]
          price_fcfa: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
          views_count: number
          waouh_code: string | null
        }
        Insert: {
          article_id?: string | null
          author_avatar_url?: string | null
          author_name?: string | null
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          media_kind?: string | null
          media_url?: string | null
          media_urls?: string[]
          price_fcfa?: number | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          views_count?: number
          waouh_code?: string | null
        }
        Update: {
          article_id?: string | null
          author_avatar_url?: string | null
          author_name?: string | null
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          media_kind?: string | null
          media_url?: string | null
          media_urls?: string[]
          price_fcfa?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          views_count?: number
          waouh_code?: string | null
        }
        Relationships: []
      }
      waouh_trace_events: {
        Row: {
          actor_user_id: string | null
          article_id: string | null
          created_at: string
          deal_id: string | null
          dedup_key: string | null
          error: string | null
          id: string
          intent: string | null
          negotiation_id: string | null
          payload: Json | null
          recipient_user_id: string | null
          role: string | null
          stage: string
          status: string
          trace_id: string | null
          transaction_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          article_id?: string | null
          created_at?: string
          deal_id?: string | null
          dedup_key?: string | null
          error?: string | null
          id?: string
          intent?: string | null
          negotiation_id?: string | null
          payload?: Json | null
          recipient_user_id?: string | null
          role?: string | null
          stage: string
          status?: string
          trace_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          article_id?: string | null
          created_at?: string
          deal_id?: string | null
          dedup_key?: string | null
          error?: string | null
          id?: string
          intent?: string | null
          negotiation_id?: string | null
          payload?: Json | null
          recipient_user_id?: string | null
          role?: string | null
          stage?: string
          status?: string
          trace_id?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      waouh_transactions: {
        Row: {
          amount: number
          article_id: string
          buyer_confirmed: boolean
          buyer_id: string
          commission: number
          completed_at: string | null
          contacts_exchanged_at: string | null
          created_at: string
          currency: string
          escrow_status: string
          id: string
          meeting_location: string | null
          meeting_time: string | null
          negotiated_price: number | null
          payment_method: string
          payment_ref: string | null
          seller_confirmed: boolean
          seller_id: string
          status: string
          status_history: Json | null
        }
        Insert: {
          amount: number
          article_id: string
          buyer_confirmed?: boolean
          buyer_id: string
          commission: number
          completed_at?: string | null
          contacts_exchanged_at?: string | null
          created_at?: string
          currency?: string
          escrow_status?: string
          id?: string
          meeting_location?: string | null
          meeting_time?: string | null
          negotiated_price?: number | null
          payment_method: string
          payment_ref?: string | null
          seller_confirmed?: boolean
          seller_id: string
          status?: string
          status_history?: Json | null
        }
        Update: {
          amount?: number
          article_id?: string
          buyer_confirmed?: boolean
          buyer_id?: string
          commission?: number
          completed_at?: string | null
          contacts_exchanged_at?: string | null
          created_at?: string
          currency?: string
          escrow_status?: string
          id?: string
          meeting_location?: string | null
          meeting_time?: string | null
          negotiated_price?: number | null
          payment_method?: string
          payment_ref?: string | null
          seller_confirmed?: boolean
          seller_id?: string
          status?: string
          status_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "waouh_transactions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "waouh_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waouh_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "waouh_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waouh_unified_catalog: {
        Row: {
          business_id: string | null
          categorie: string | null
          created_at: string
          description: string | null
          devise: string | null
          expires_at: string | null
          geohash: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          partner_id: string | null
          photos: string[] | null
          priority_rank: number
          prix_max: number | null
          prix_min: number | null
          qualite_score: number
          quartier: string | null
          raw_payload: Json | null
          source: Database["public"]["Enums"]["waouh_catalog_source"]
          source_ref_id: string
          sous_categorie: string | null
          tags: string[] | null
          titre: string
          type: Database["public"]["Enums"]["waouh_catalog_type"]
          updated_at: string
          vendeur_mobile_money: string | null
          vendeur_nom: string | null
          vendeur_phone: string | null
          vendeur_whatsapp: string | null
          verified: boolean | null
          ville: string | null
        }
        Insert: {
          business_id?: string | null
          categorie?: string | null
          created_at?: string
          description?: string | null
          devise?: string | null
          expires_at?: string | null
          geohash?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          partner_id?: string | null
          photos?: string[] | null
          priority_rank?: number
          prix_max?: number | null
          prix_min?: number | null
          qualite_score?: number
          quartier?: string | null
          raw_payload?: Json | null
          source: Database["public"]["Enums"]["waouh_catalog_source"]
          source_ref_id: string
          sous_categorie?: string | null
          tags?: string[] | null
          titre: string
          type?: Database["public"]["Enums"]["waouh_catalog_type"]
          updated_at?: string
          vendeur_mobile_money?: string | null
          vendeur_nom?: string | null
          vendeur_phone?: string | null
          vendeur_whatsapp?: string | null
          verified?: boolean | null
          ville?: string | null
        }
        Update: {
          business_id?: string | null
          categorie?: string | null
          created_at?: string
          description?: string | null
          devise?: string | null
          expires_at?: string | null
          geohash?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          partner_id?: string | null
          photos?: string[] | null
          priority_rank?: number
          prix_max?: number | null
          prix_min?: number | null
          qualite_score?: number
          quartier?: string | null
          raw_payload?: Json | null
          source?: Database["public"]["Enums"]["waouh_catalog_source"]
          source_ref_id?: string
          sous_categorie?: string | null
          tags?: string[] | null
          titre?: string
          type?: Database["public"]["Enums"]["waouh_catalog_type"]
          updated_at?: string
          vendeur_mobile_money?: string | null
          vendeur_nom?: string | null
          vendeur_phone?: string | null
          vendeur_whatsapp?: string | null
          verified?: boolean | null
          ville?: string | null
        }
        Relationships: []
      }
      waouh_users: {
        Row: {
          auth_user_id: string | null
          channel: string
          city: string | null
          country: string
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean
          location: unknown
          phone_number: string | null
          preferred_payment: string
          purchases_count: number
          reputation: number
          sales_count: number
          updated_at: string
          web_session_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          channel?: string
          city?: string | null
          country?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          location?: unknown
          phone_number?: string | null
          preferred_payment?: string
          purchases_count?: number
          reputation?: number
          sales_count?: number
          updated_at?: string
          web_session_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          channel?: string
          city?: string | null
          country?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          location?: unknown
          phone_number?: string | null
          preferred_payment?: string
          purchases_count?: number
          reputation?: number
          sales_count?: number
          updated_at?: string
          web_session_id?: string | null
        }
        Relationships: []
      }
      whatsapp_accounts: {
        Row: {
          created_at: string
          dashboard_authenticated: boolean | null
          id: string
          is_admin_shared: boolean
          last_activity: string | null
          last_auth_attempt: string | null
          phone_number: string | null
          qr_code: string | null
          session_name: string
          status: string
          updated_at: string
          user_id: string
          waha_authenticated: boolean | null
          waha_session_data: Json | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          dashboard_authenticated?: boolean | null
          id?: string
          is_admin_shared?: boolean
          last_activity?: string | null
          last_auth_attempt?: string | null
          phone_number?: string | null
          qr_code?: string | null
          session_name: string
          status?: string
          updated_at?: string
          user_id: string
          waha_authenticated?: boolean | null
          waha_session_data?: Json | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          dashboard_authenticated?: boolean | null
          id?: string
          is_admin_shared?: boolean
          last_activity?: string | null
          last_auth_attempt?: string | null
          phone_number?: string | null
          qr_code?: string | null
          session_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          waha_authenticated?: boolean | null
          waha_session_data?: Json | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      whatsapp_automations: {
        Row: {
          actions: Json | null
          created_at: string | null
          description: string | null
          execution_count: number | null
          id: string
          integration_id: string
          is_active: boolean | null
          last_executed: string | null
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions?: Json | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          integration_id: string
          is_active?: boolean | null
          last_executed?: string | null
          name: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions?: Json | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          integration_id?: string
          is_active?: boolean | null
          last_executed?: string | null
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bot_links: {
        Row: {
          auto_response_enabled: boolean | null
          bot_id: string
          created_at: string
          id: string
          is_active: boolean | null
          response_delay_seconds: number | null
          updated_at: string
          welcome_message: string | null
          whatsapp_account_id: string
        }
        Insert: {
          auto_response_enabled?: boolean | null
          bot_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          response_delay_seconds?: number | null
          updated_at?: string
          welcome_message?: string | null
          whatsapp_account_id: string
        }
        Update: {
          auto_response_enabled?: boolean | null
          bot_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          response_delay_seconds?: number | null
          updated_at?: string
          welcome_message?: string | null
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "whatsapp_bot_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "whatsapp_bot_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "whatsapp_bot_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "whatsapp_bot_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bot_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "whatsapp_bot_links_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaigns: {
        Row: {
          created_at: string | null
          delivered_count: number | null
          description: string | null
          failed_count: number | null
          id: string
          integration_id: string
          name: string
          read_count: number | null
          replied_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          status: string | null
          target_audience: Json | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          integration_id: string
          name: string
          read_count?: number | null
          replied_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          integration_id?: string
          name?: string
          read_count?: number | null
          replied_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          created_at: string | null
          id: string
          integration_id: string
          is_business: boolean | null
          last_seen: string | null
          name: string | null
          notes: string | null
          phone_number: string
          profile_picture_url: string | null
          status: string | null
          tags: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          integration_id: string
          is_business?: boolean | null
          last_seen?: string | null
          name?: string | null
          notes?: string | null
          phone_number: string
          profile_picture_url?: string | null
          status?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          integration_id?: string
          is_business?: boolean | null
          last_seen?: string | null
          name?: string | null
          notes?: string | null
          phone_number?: string
          profile_picture_url?: string | null
          status?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          integration_id: string
          is_archived: boolean | null
          last_message_at: string | null
          last_message_id: string | null
          tags: Json | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          integration_id: string
          is_archived?: boolean | null
          last_message_at?: string | null
          last_message_id?: string | null
          tags?: Json | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          integration_id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          last_message_id?: string | null
          tags?: Json | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_integrations: {
        Row: {
          access_token: string
          business_account_id: string
          configuration: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync: string | null
          phone_number_id: string
          updated_at: string | null
          user_id: string
          webhook_verify_token: string
        }
        Insert: {
          access_token: string
          business_account_id: string
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          phone_number_id: string
          updated_at?: string | null
          user_id: string
          webhook_verify_token: string
        }
        Update: {
          access_token?: string
          business_account_id?: string
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          phone_number_id?: string
          updated_at?: string | null
          user_id?: string
          webhook_verify_token?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          bot_link_id: string | null
          content: string | null
          created_at: string
          from_number: string
          id: string
          is_bot_response: boolean
          is_from_me: boolean
          media_url: string | null
          message_id: string
          message_type: string
          timestamp: string
          to_number: string
          waha_raw_data: Json | null
          whatsapp_account_id: string
        }
        Insert: {
          bot_link_id?: string | null
          content?: string | null
          created_at?: string
          from_number: string
          id?: string
          is_bot_response?: boolean
          is_from_me?: boolean
          media_url?: string | null
          message_id: string
          message_type?: string
          timestamp?: string
          to_number: string
          waha_raw_data?: Json | null
          whatsapp_account_id: string
        }
        Update: {
          bot_link_id?: string | null
          content?: string | null
          created_at?: string
          from_number?: string
          id?: string
          is_bot_response?: boolean
          is_from_me?: boolean
          media_url?: string | null
          message_id?: string
          message_type?: string
          timestamp?: string
          to_number?: string
          waha_raw_data?: Json | null
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_bot_link_id_fkey"
            columns: ["bot_link_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bot_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          body_content: string
          buttons: Json | null
          category: string
          created_at: string | null
          footer_content: string | null
          header_content: string | null
          header_type: string | null
          id: string
          language: string
          name: string
          status: string | null
          updated_at: string | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          body_content: string
          buttons?: Json | null
          category: string
          created_at?: string | null
          footer_content?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          body_content?: string
          buttons?: Json | null
          category?: string
          created_at?: string | null
          footer_content?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      bot_conversation_history: {
        Row: {
          bot_id: string | null
          bot_name: string | null
          bot_user_id: string | null
          ip_address: string | null
          message_content: string | null
          message_id: string | null
          message_order_in_session: number | null
          message_timestamp: string | null
          message_type: string | null
          owner_id: string | null
          session_end: string | null
          session_id: string | null
          session_id_full: string | null
          session_message_count: number | null
          session_metadata: Json | null
          session_start: string | null
          user_agent: string | null
          user_email: string | null
          user_first_seen: string | null
          user_last_active: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
        ]
      }
      bot_message_history: {
        Row: {
          bot_id: string | null
          bot_name: string | null
          bot_user_id: string | null
          ip_address: string | null
          message_content: string | null
          message_id: string | null
          message_timestamp: string | null
          message_type: string | null
          metadata: Json | null
          owner_id: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_first_seen: string | null
          user_last_active: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
        ]
      }
      bot_owner_conversations: {
        Row: {
          bot_id: string | null
          bot_name: string | null
          bot_user_id: string | null
          conversation_start: string | null
          is_active_today: boolean | null
          last_bot_message: string | null
          last_message_at: string | null
          last_user_message: string | null
          message_count: number | null
          owner_id: string | null
          session_id: string | null
          user_email: string | null
          user_first_seen: string | null
          user_last_active: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_performance_metrics: {
        Row: {
          avg_messages_per_session: number | null
          avg_session_duration_minutes: number | null
          bot_id: string | null
          bot_name: string | null
          bot_responses: number | null
          date: string | null
          owner_id: string | null
          sessions: number | null
          total_messages: number | null
          unique_ips: number | null
          unique_users: number | null
          user_messages: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_stats: {
        Row: {
          active_today: number | null
          bot_id: string | null
          bot_name: string | null
          last_message_at: string | null
          owner_id: string | null
          total_messages: number | null
          total_users: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_visitor_analytics: {
        Row: {
          active_sessions: number | null
          avg_interactions_per_session: number | null
          avg_pages_per_session: number | null
          avg_time_spent_seconds: number | null
          bot_id: string | null
          bot_name: string | null
          conversion_rate_percent: number | null
          converted_sessions: number | null
          last_visitor_activity: string | null
          owner_id: string | null
          sessions_24h: number | null
          sessions_30d: number | null
          sessions_7d: number | null
          sessions_direct: number | null
          sessions_from_short_links: number | null
          sessions_from_social: number | null
          total_sessions: number | null
          unique_visitors: number | null
          unique_visitors_24h: number | null
          unique_visitors_7d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      detailed_bot_stats: {
        Row: {
          active_sessions: number | null
          active_users_24h: number | null
          avg_messages_per_session: number | null
          avg_session_duration_minutes: number | null
          bot_id: string | null
          bot_messages: number | null
          bot_name: string | null
          is_active: boolean | null
          last_message_at: string | null
          last_user_activity: string | null
          messages_24h: number | null
          owner_id: string | null
          sessions_24h: number | null
          total_link_clicks: number | null
          total_messages: number | null
          total_sessions: number | null
          total_short_links: number | null
          total_unique_users: number | null
          user_messages: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      ia_creator_admin_stats: {
        Row: {
          active_users_24h: number | null
          active_users_30d: number | null
          active_users_7d: number | null
          avg_creations_per_user: number | null
          total_creations: number | null
          total_flyers: number | null
          total_images: number | null
          total_users: number | null
          total_videos: number | null
        }
        Relationships: []
      }
      quiz_admin_attempts: {
        Row: {
          candidate_email: string | null
          candidate_id: string | null
          candidate_name: string | null
          candidate_organization: string | null
          certificate_issued: boolean | null
          created_at: string | null
          duration_seconds: number | null
          id: string | null
          ip_hash: string | null
          mention: string | null
          module_id: string | null
          module_title: string | null
          passed: boolean | null
          ratio: number | null
          score: number | null
          total_questions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "quiz_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_certificate_public: {
        Row: {
          certificate_code: string | null
          certificate_issued_at: string | null
          holder_name: string | null
          mention: string | null
          module_id: string | null
          module_title: string | null
          ratio: number | null
          score: number | null
          total_questions: number | null
        }
        Insert: {
          certificate_code?: string | null
          certificate_issued_at?: string | null
          holder_name?: string | null
          mention?: string | null
          module_id?: string | null
          module_title?: string | null
          ratio?: number | null
          score?: number | null
          total_questions?: number | null
        }
        Update: {
          certificate_code?: string | null
          certificate_issued_at?: string | null
          holder_name?: string | null
          mention?: string | null
          module_id?: string | null
          module_title?: string | null
          ratio?: number | null
          score?: number | null
          total_questions?: number | null
        }
        Relationships: []
      }
      unified_conversation_history: {
        Row: {
          bot_id: string | null
          bot_name: string | null
          bot_user_id: string | null
          message_content: string | null
          message_id: string | null
          message_timestamp: string | null
          message_type: string | null
          owner_id: string | null
          session_id: string | null
          user_email: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "bot_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_owner_conversations"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_performance_metrics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_stats"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_visitor_analytics"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "detailed_bot_stats"
            referencedColumns: ["bot_id"]
          },
        ]
      }
      user_permission_details: {
        Row: {
          permission_category: string | null
          permission_description: string | null
          permission_name: string | null
          role_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      waouh_partner_stats_v: {
        Row: {
          ca_24h: number | null
          ca_30j: number | null
          ca_7j: number | null
          code_partenaire: string | null
          commission_en_attente: number | null
          commission_totale: number | null
          derniere_activite: string | null
          nb_businesses: number | null
          nb_products: number | null
          nb_ventes_30j: number | null
          niveau: string | null
          nom: string | null
          partner_id: string | null
          statut: string | null
        }
        Insert: {
          ca_24h?: never
          ca_30j?: never
          ca_7j?: never
          code_partenaire?: string | null
          commission_en_attente?: never
          commission_totale?: never
          derniere_activite?: never
          nb_businesses?: never
          nb_products?: never
          nb_ventes_30j?: never
          niveau?: string | null
          nom?: string | null
          partner_id?: string | null
          statut?: string | null
        }
        Update: {
          ca_24h?: never
          ca_30j?: never
          ca_7j?: never
          code_partenaire?: string | null
          commission_en_attente?: never
          commission_totale?: never
          derniere_activite?: never
          nb_businesses?: never
          nb_products?: never
          nb_ventes_30j?: never
          niveau?: string | null
          nom?: string | null
          partner_id?: string | null
          statut?: string | null
        }
        Relationships: []
      }
      waouh_unified_demands: {
        Row: {
          active: boolean | null
          captured_at: string | null
          category: string | null
          city: string | null
          contact_phone: string | null
          id: string | null
          origin: string | null
          price_max: number | null
          source_kind: string | null
          title: string | null
          waouh_user_id: string | null
        }
        Relationships: []
      }
      waouh_unified_offers: {
        Row: {
          captured_at: string | null
          category: string | null
          city: string | null
          condition: string | null
          contact_phone: string | null
          currency: string | null
          description: string | null
          id: string | null
          image_url: string | null
          origin: string | null
          price: number | null
          source_kind: string | null
          source_url: string | null
          status: string | null
          title: string | null
          waouh_user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      assign_admin_role: { Args: { user_email: string }; Returns: string }
      auto_fix_session_issues: {
        Args: { p_bot_id?: string }
        Returns: {
          action_taken: string
          affected_count: number
          details: string
        }[]
      }
      auto_reconcile_session_token: {
        Args: { p_bot_id: string; p_session_token: string }
        Returns: string
      }
      can_view_user_data: { Args: { target_user_id: string }; Returns: boolean }
      check_bot_public_access: {
        Args: { bot_uuid: string }
        Returns: {
          accessible: boolean
          bot_data: Json
          error_message: string
        }[]
      }
      check_ia_creator_limit: {
        Args: { p_creation_type: string; p_user_id: string }
        Returns: Json
      }
      claim_guest_tickets: { Args: { _email: string }; Returns: number }
      cleanup_and_consolidate_chat_data: {
        Args: { p_bot_id?: string }
        Returns: {
          cleaned_sessions: number
          orphaned_messages: number
          reconciled_users: number
        }[]
      }
      cleanup_orphaned_bot_data: {
        Args: never
        Returns: {
          cleaned_links: number
          cleaned_messages: number
          cleaned_sessions: number
          details: Json
        }[]
      }
      cleanup_orphaned_sessions: { Args: never; Returns: number }
      collect_visitor_data: {
        Args: {
          p_collection_method?: string
          p_confidence_score?: number
          p_data_type: string
          p_data_value: string
          p_session_id: string
        }
        Returns: string
      }
      create_bot_user_if_not_exists: {
        Args: {
          p_bot_id: string
          p_session_id: string
          p_user_email?: string
          p_user_name?: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_content: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_or_get_visitor_fingerprint: {
        Args: {
          p_browser_info?: Json
          p_fingerprint_hash: string
          p_language?: string
          p_platform?: string
          p_screen_info?: Json
          p_timezone?: string
          p_user_agent?: string
        }
        Returns: string
      }
      create_shortened_link: {
        Args: { p_bot_id: string; p_owner_id: string }
        Returns: string
      }
      create_visitor_session_final: {
        Args: {
          p_bot_id: string
          p_entry_point?: string
          p_fingerprint_id: string
          p_ip_address?: unknown
          p_referrer_url?: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: string
      }
      debug_bot_creation: {
        Args: { p_user_uuid?: string }
        Returns: {
          bot_owner_id: string
          can_create_bot: boolean
          current_bot_count: number
          has_bot_owner: boolean
          max_bots: number
          user_id: string
        }[]
      }
      detect_bot_domain: {
        Args: { p_bot_id: string }
        Returns: {
          confidence_score: number
          domain_id: string
        }[]
      }
      diagnose_all_session_ambiguities: {
        Args: never
        Returns: {
          fix_needed: string
          function_name: string
          issue_description: string
          severity: string
        }[]
      }
      diagnose_bot_session_issues: {
        Args: { p_bot_id?: string }
        Returns: {
          count: number
          details: Json
          issue_type: string
          suggested_action: string
        }[]
      }
      diagnose_session_issues: {
        Args: never
        Returns: {
          count: number
          issue_type: string
          sample_details: Json
        }[]
      }
      diagnose_session_token_ambiguities: {
        Args: never
        Returns: {
          issue_type: string
          message: string
          status: string
        }[]
      }
      diagnose_session_token_issues: {
        Args: never
        Returns: {
          count: number
          details: Json
          issue_type: string
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      fix_all_user_issues: {
        Args: never
        Returns: {
          affected_count: number
          details: string
          fix_type: string
        }[]
      }
      fix_session_inconsistencies: {
        Args: never
        Returns: {
          action: string
          count: number
          details: string
        }[]
      }
      generate_public_chat_url: { Args: { p_bot_id: string }; Returns: string }
      generate_short_code: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_bots: number
          active_campaigns: number
          active_users_24h: number
          active_users_7d: number
          new_users_30d: number
          revenue_monthly: number
          total_bots: number
          total_campaigns: number
          total_messages_24h: number
          total_subscriptions: number
          total_users: number
        }[]
      }
      get_bot_complete_history: {
        Args: {
          p_bot_id: string
          p_limit?: number
          p_offset?: number
          p_session_filter?: string
        }
        Returns: {
          bot_id: string
          bot_name: string
          bot_user_id: string
          ip_address: string
          message_content: string
          message_id: string
          message_timestamp: string
          message_type: string
          metadata: Json
          owner_id: string
          session_duration_minutes: number
          session_entry_point: string
          session_is_active: boolean
          session_started_at: string
          session_token: string
          session_total_messages: number
          user_agent: string
          user_email: string
          user_first_seen: string
          user_last_active: string
          user_name: string
        }[]
      }
      get_bot_detailed_history: {
        Args: {
          bot_uuid: string
          limit_count?: number
          offset_count?: number
          owner_uuid: string
        }
        Returns: {
          ip_address: string
          message_content: string
          message_id: string
          message_order_in_session: number
          message_timestamp: string
          message_type: string
          session_id: string
          session_start: string
          user_agent: string
          user_email: string
          user_name: string
        }[]
      }
      get_bot_owner_history: {
        Args: {
          p_bot_id: string
          p_limit?: number
          p_offset?: number
          p_session_token?: string
        }
        Returns: {
          bot_name: string
          ip_address: string
          message_content: string
          message_id: string
          message_timestamp: string
          message_type: string
          metadata: Json
          owner_id: string
          session_id: string
          user_agent: string
          user_email: string
          user_name: string
        }[]
      }
      get_bot_owner_stats: {
        Args: { p_bot_id: string }
        Returns: {
          active_users_24h: number
          avg_messages_per_session: number
          bot_id: string
          bot_name: string
          creation_date: string
          is_active: boolean
          last_activity: string
          messages_24h: number
          total_messages: number
          total_sessions: number
          total_users: number
        }[]
      }
      get_chat_history: {
        Args: {
          p_bot_id: string
          p_bot_user_id?: string
          p_session_token?: string
        }
        Returns: Json[]
      }
      get_chat_history_final: {
        Args: {
          p_bot_id: string
          p_bot_user_id?: string
          p_limit?: number
          p_session_token?: string
        }
        Returns: {
          bot_id: string
          bot_user_id: string
          ip_address: string
          message_content: string
          message_id: string
          message_timestamp: string
          message_type: string
          metadata: Json
          session_id: string
          user_agent: string
          user_email: string
          user_name: string
        }[]
      }
      get_final_bot_policies: {
        Args: never
        Returns: {
          description: string
          is_active: boolean
          policy_name: string
          policy_type: string
        }[]
      }
      get_intelligent_suggestions: {
        Args: { p_bot_id: string; p_limit?: number }
        Returns: {
          action_prompt: string
          category: string
          confidence_score: number
          description: string
          domain_name: string
          icon_name: string
          suggestion_id: string
          title: string
        }[]
      }
      get_or_create_bot_owner: { Args: { user_uuid: string }; Returns: string }
      get_or_create_bot_user_for_session: {
        Args: {
          p_bot_id: string
          p_session_token: string
          p_user_name?: string
        }
        Returns: string
      }
      get_owner_all_conversations: {
        Args: { p_bot_filter?: string; p_limit?: number; p_offset?: number }
        Returns: {
          bot_id: string
          bot_name: string
          bot_user_id: string
          conversation_start: string
          is_active_today: boolean
          last_bot_message: string
          last_message_at: string
          last_user_message: string
          message_count: number
          session_id: string
          user_email: string
          user_first_seen: string
          user_last_active: string
          user_name: string
        }[]
      }
      get_owner_complete_stats: {
        Args: { p_owner_user_id?: string }
        Returns: {
          active_bots: number
          active_sessions_24h: number
          active_users_24h: number
          avg_messages_per_session: number
          avg_session_duration: number
          last_activity: string
          messages_24h: number
          top_bot_id: string
          top_bot_messages: number
          top_bot_name: string
          total_bots: number
          total_messages: number
          total_sessions: number
          total_users: number
        }[]
      }
      get_owner_dashboard_stats: {
        Args: { owner_uuid: string }
        Returns: {
          active_bots: number
          active_users_24h: number
          avg_session_duration: number
          last_activity: string
          messages_24h: number
          top_performing_bot_id: string
          top_performing_bot_name: string
          total_bots: number
          total_messages: number
          total_sessions: number
          total_users: number
        }[]
      }
      get_owner_global_stats: {
        Args: never
        Returns: {
          active_bots: number
          active_users_today: number
          messages_today: number
          most_active_bot_id: string
          most_active_bot_name: string
          total_bots: number
          total_conversations: number
          total_messages: number
          total_users: number
        }[]
      }
      get_personal_agent_by_id: {
        Args: { agent_uuid: string }
        Returns: {
          created_at: string
          description: string
          elevenlabs_agent_id: string
          id: string
          is_active: boolean
          name: string
          widget_config: Json
        }[]
      }
      get_unified_chat_history: {
        Args: {
          p_bot_id: string
          p_bot_user_id?: string
          p_limit?: number
          p_session_token?: string
        }
        Returns: {
          bot_id: string
          bot_user_id: string
          ip_address: string
          message_content: string
          message_id: string
          message_timestamp: string
          message_type: string
          metadata: Json
          session_id: string
          user_agent: string
          user_email: string
          user_name: string
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid: string }
        Returns: {
          category: string
          permission_name: string
          source: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      grant_whatsapp_permissions_to_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      has_partner_permission: {
        Args: {
          _perm: Database["public"]["Enums"]["waouh_partner_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      hide_demo_account_data: {
        Args: { data_value: string; user_id: string }
        Returns: string
      }
      increment_ia_creator_usage: {
        Args: {
          p_creation_type: string
          p_file_size_mb?: number
          p_user_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: { user_uuid?: string }; Returns: boolean }
      is_support_admin: { Args: { _user_id: string }; Returns: boolean }
      is_support_staff: { Args: { _user_id: string }; Returns: boolean }
      is_waouh_partner_owner: {
        Args: { _partner_id: string }
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          p_activity_type: string
          p_description?: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: string
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: number
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      reconcile_bot_user_session_token: {
        Args: { p_bot_id: string; p_session_token: string }
        Returns: string
      }
      reconcile_session_final: {
        Args: { p_bot_id: string; p_session_token: string }
        Returns: string
      }
      repair_all_session_inconsistencies: {
        Args: never
        Returns: {
          action_taken: string
          count: number
          details: string
        }[]
      }
      repair_system_final: {
        Args: never
        Returns: {
          action_taken: string
          affected_count: number
          details: string
        }[]
      }
      save_message_final: {
        Args: {
          p_bot_id: string
          p_ip_address?: string
          p_message_content: string
          p_message_type: string
          p_metadata?: Json
          p_session_token: string
          p_user_agent?: string
        }
        Returns: string
      }
      send_manual_bot_response: {
        Args: {
          p_bot_id: string
          p_message_content: string
          p_session_token: string
        }
        Returns: string
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      system_health_check: {
        Args: never
        Returns: {
          metric_name: string
          metric_value: string
          status: string
        }[]
      }
      test_absolute_session_resolution: {
        Args: never
        Returns: {
          details: string
          test_category: string
          test_result: string
        }[]
      }
      test_bot_creation_fix: {
        Args: never
        Returns: {
          details: string
          status: string
          test_name: string
        }[]
      }
      test_bot_creation_fixed: {
        Args: never
        Returns: {
          details: string
          status: string
          test_name: string
        }[]
      }
      test_complete_bot_creation_flow: {
        Args: { p_user_id?: string }
        Returns: {
          details: string
          step_name: string
          success: boolean
        }[]
      }
      test_final_session_resolution: {
        Args: never
        Returns: {
          details: string
          test_category: string
          test_result: string
        }[]
      }
      test_owner_access_complete: {
        Args: never
        Returns: {
          data_preview: Json
          details: string
          status: string
          test_name: string
        }[]
      }
      test_session_token_resolution: {
        Args: never
        Returns: {
          details: string
          status: string
          test_name: string
        }[]
      }
      test_system_final: {
        Args: never
        Returns: {
          details: string
          status: string
          test_name: string
        }[]
      }
      track_link_click:
        | {
            Args: {
              p_ip_address?: unknown
              p_referrer?: string
              p_short_code: string
              p_user_agent?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_referrer?: string
              p_short_code: string
              p_user_agent?: string
            }
            Returns: string
          }
      track_visitor_event: {
        Args: {
          p_element_class?: string
          p_element_id?: string
          p_event_data?: Json
          p_event_type: string
          p_page_url?: string
          p_session_id: string
        }
        Returns: string
      }
      transfer_local_businesses_to_prospects: {
        Args: { business_ids: string[]; target_database_id: string }
        Returns: Json
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_has_any_permission: {
        Args: { permission_names: string[]; user_uuid: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { permission_name: string; user_uuid: string }
        Returns: boolean
      }
      user_owns_bot: { Args: { p_bot_id: string }; Returns: boolean }
      user_owns_campaign: { Args: { p_campaign_id: string }; Returns: boolean }
      user_owns_prospect: { Args: { p_prospect_id: string }; Returns: boolean }
      user_owns_whatsapp_account: { Args: { acc_id: string }; Returns: boolean }
      validate_owner_complete_access: {
        Args: never
        Returns: {
          result_details: Json
          status: string
          validation_step: string
        }[]
      }
      verify_bot_access_final: { Args: { p_bot_id: string }; Returns: boolean }
      waouh_article_distance_km: {
        Args: { p_article: string; p_lat: number; p_lng: number }
        Returns: number
      }
      waouh_enqueue_outbound: {
        Args: {
          p_payload: Json
          p_template: string
          p_to_phone: string
          p_to_user_id: string
        }
        Returns: string
      }
      waouh_enqueue_outbound_v2: {
        Args: {
          p_channel?: string
          p_dedupe_key?: string
          p_event_type?: string
          p_image_url?: string
          p_message_id?: string
          p_payload: Json
          p_template: string
          p_to_phone: string
          p_to_user_id: string
          p_transaction_id?: string
          p_web_session_id?: string
        }
        Returns: string
      }
      waouh_link_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      waouh_mark_conversation_read: {
        Args: { p_conv_id: string }
        Returns: undefined
      }
      waouh_match_signal: { Args: { p_signal_id: string }; Returns: Json }
      waouh_normalize_bj_phone: { Args: { input: string }; Returns: string }
      waouh_point_distance_km: {
        Args: { p_lat: number; p_lng: number; p_user: string }
        Returns: number
      }
      waouh_promote_signal: { Args: { p_signal_id: string }; Returns: Json }
      waouh_radar_forget: { Args: { p_phone: string }; Returns: undefined }
      waouh_resolve_phone: { Args: { input: string }; Returns: string }
      waouh_search_unified: {
        Args: {
          in_categorie?: string
          in_lat?: number
          in_lng?: number
          in_source?: string
          in_type?: string
          in_ville?: string
          include_inactive?: boolean
          max_results?: number
          only_verified?: boolean
          q?: string
          radius_km?: number
        }
        Returns: {
          business_id: string
          categorie: string
          date_publication: string
          description: string
          devise: string
          distance_km: number
          expires_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          lat: number
          lng: number
          partner_id: string
          photos: string[]
          priority_rank: number
          prix_max: number
          prix_min: number
          qualite_score: number
          quartier: string
          source: Database["public"]["Enums"]["waouh_catalog_source"]
          source_ref_id: string
          sous_categorie: string
          titre: string
          type: Database["public"]["Enums"]["waouh_catalog_type"]
          vendeur_mobile_money: string
          vendeur_nom: string
          vendeur_phone: string
          vendeur_phone_norm: string
          vendeur_whatsapp: string
          vendeur_whatsapp_norm: string
          verified: boolean
          ville: string
        }[]
      }
      waouh_user_pair_distance_km: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: number
      }
    }
    Enums: {
      waouh_catalog_source: "partner" | "chat" | "radar"
      waouh_catalog_type: "offer" | "demand"
      waouh_partner_activity_type:
        | "business_created"
        | "business_updated"
        | "business_deleted"
        | "product_created"
        | "product_updated"
        | "product_deleted"
        | "sale_recorded"
        | "sale_confirmed"
        | "sale_paid"
        | "sale_cancelled"
        | "payout_requested"
        | "payout_paid"
        | "status_changed"
        | "permission_granted"
        | "permission_revoked"
        | "kyc_verified"
      waouh_partner_permission:
        | "can_add_business"
        | "can_edit_business"
        | "can_delete_business"
        | "can_add_product"
        | "can_edit_product"
        | "can_delete_product"
        | "can_record_sale"
        | "can_request_payout"
        | "can_invite_subagent"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      waouh_catalog_source: ["partner", "chat", "radar"],
      waouh_catalog_type: ["offer", "demand"],
      waouh_partner_activity_type: [
        "business_created",
        "business_updated",
        "business_deleted",
        "product_created",
        "product_updated",
        "product_deleted",
        "sale_recorded",
        "sale_confirmed",
        "sale_paid",
        "sale_cancelled",
        "payout_requested",
        "payout_paid",
        "status_changed",
        "permission_granted",
        "permission_revoked",
        "kyc_verified",
      ],
      waouh_partner_permission: [
        "can_add_business",
        "can_edit_business",
        "can_delete_business",
        "can_add_product",
        "can_edit_product",
        "can_delete_product",
        "can_record_sale",
        "can_request_payout",
        "can_invite_subagent",
      ],
    },
  },
} as const
