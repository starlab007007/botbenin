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
        Relationships: [
          {
            foreignKeyName: "access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
        Relationships: [
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "automations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
          bot_id: string | null
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
          bot_id?: string | null
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
          bot_id?: string | null
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
          id: string
          is_active: boolean | null
          name: string
          owner_id: string | null
          public_chat_url: string | null
          share_enabled: boolean | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          chat_context?: string | null
          chat_title?: string | null
          configuration?: Json | null
          created_at?: string
          description?: string | null
          display_in_live_chat?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id?: string | null
          public_chat_url?: string | null
          share_enabled?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          chat_context?: string | null
          chat_title?: string | null
          configuration?: Json | null
          created_at?: string
          description?: string | null
          display_in_live_chat?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string | null
          public_chat_url?: string | null
          share_enabled?: boolean | null
          updated_at?: string
          webhook_url?: string | null
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
        Relationships: [
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          bot_id: string | null
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
          bot_id?: string | null
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
          bot_id?: string | null
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "demo_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
            foreignKeyName: "enhanced_chat_sessions_shortened_link_id_fkey"
            columns: ["shortened_link_id"]
            isOneToOne: false
            referencedRelation: "shortened_links"
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
          {
            foreignKeyName: "file_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
        Relationships: [
          {
            foreignKeyName: "files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
          ip_address: unknown | null
          referrer: string | null
          shortened_link_id: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          shortened_link_id: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          id?: string
          ip_address?: unknown | null
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
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      notifications: {
        Row: {
          action_url: string | null
          content: string
          created_at: string
          id: string
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
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      prospect_databases: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
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
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
          {
            foreignKeyName: "subscriber_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
        Relationships: [
          {
            foreignKeyName: "subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "subscription_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
      user_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "user_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "user_module_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "detailed_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          admin_notes: string | null
          auth_provider: string | null
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          email: string
          email_verified: boolean | null
          email_verified_at: string | null
          full_name: string
          google_id: string | null
          id: string
          is_active: boolean | null
          language: string | null
          last_activity: string | null
          last_login: string | null
          locked_until: string | null
          login_attempts: number | null
          phone: string | null
          status: string | null
          subscription_tier: string | null
          timezone: string | null
          two_factor_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          auth_provider?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name: string
          google_id?: string | null
          id: string
          is_active?: boolean | null
          language?: string | null
          last_activity?: string | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          phone?: string | null
          status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          auth_provider?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name?: string
          google_id?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_activity?: string | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          phone?: string | null
          status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
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
      whatsapp_accounts: {
        Row: {
          created_at: string
          dashboard_authenticated: boolean | null
          id: string
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
          {
            foreignKeyName: "whatsapp_automations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
          {
            foreignKeyName: "whatsapp_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          {
            foreignKeyName: "whatsapp_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          {
            foreignKeyName: "whatsapp_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
        Relationships: [
          {
            foreignKeyName: "whatsapp_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_dashboard_stats: {
        Row: {
          active_chat_users_24h: number | null
          active_subscriptions: number | null
          active_users: number | null
          inactive_users: number | null
          messages_24h: number | null
          new_bots_30d: number | null
          new_users_30d: number | null
          suspended_users: number | null
          total_bots: number | null
          total_link_clicks: number | null
        }
        Relationships: []
      }
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
      complete_bot_analytics: {
        Row: {
          active_sessions: number | null
          active_users_24h: number | null
          active_users_30d: number | null
          active_users_7d: number | null
          avg_messages_per_session: number | null
          avg_session_duration_minutes: number | null
          bot_created_at: string | null
          bot_id: string | null
          bot_messages: number | null
          bot_name: string | null
          engagement_rate_7d: number | null
          is_active: boolean | null
          last_message_at: string | null
          last_user_activity: string | null
          messages_24h: number | null
          owner_id: string | null
          response_rate_percent: number | null
          sessions_24h: number | null
          share_enabled: boolean | null
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
      detailed_bot_stats: {
        Row: {
          active_sessions: number | null
          active_users_24h: number | null
          active_users_7d: number | null
          avg_messages_per_session: number | null
          avg_session_duration_minutes: number | null
          bot_created_at: string | null
          bot_id: string | null
          bot_messages: number | null
          bot_name: string | null
          is_active: boolean | null
          last_message_at: string | null
          last_user_activity: string | null
          messages_24h: number | null
          owner_id: string | null
          sessions_24h: number | null
          share_enabled: boolean | null
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
      unified_conversation_history: {
        Row: {
          bot_id: string | null
          bot_name: string | null
          bot_user_id: string | null
          enhanced_session_token: string | null
          entry_point: string | null
          ip_address: string | null
          message_content: string | null
          message_id: string | null
          message_timestamp: string | null
          message_type: string | null
          metadata: Json | null
          owner_id: string | null
          session_id: string | null
          session_last_activity: string | null
          session_start: string | null
          session_total_messages: number | null
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
            referencedRelation: "complete_bot_analytics"
            referencedColumns: ["bot_id"]
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
        ]
      }
      user_stats: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          last_login: string | null
          phone: string | null
          role_name: string | null
          subscription_tier: string | null
          total_automations: number | null
          total_bots: number | null
          total_messages: number | null
          unread_notifications: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_admin_role: {
        Args: { user_email: string }
        Returns: string
      }
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
      can_view_user_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_bot_public_access: {
        Args: { bot_uuid: string }
        Returns: {
          accessible: boolean
          bot_data: Json
          error_message: string
        }[]
      }
      cleanup_and_consolidate_chat_data: {
        Args: { p_bot_id?: string }
        Returns: {
          cleaned_sessions: number
          orphaned_messages: number
          reconciled_users: number
        }[]
      }
      cleanup_orphaned_bot_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleaned_links: number
          cleaned_messages: number
          cleaned_sessions: number
          details: Json
        }[]
      }
      cleanup_orphaned_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
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
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
          issue_type: string
          sample_details: Json
        }[]
      }
      diagnose_session_token_ambiguities: {
        Args: Record<PropertyKey, never>
        Returns: {
          issue_type: string
          message: string
          status: string
        }[]
      }
      diagnose_session_token_issues: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
          details: Json
          issue_type: string
        }[]
      }
      fix_all_user_issues: {
        Args: Record<PropertyKey, never>
        Returns: {
          affected_count: number
          details: string
          fix_type: string
        }[]
      }
      fix_session_inconsistencies: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          count: number
          details: string
        }[]
      }
      generate_public_chat_url: {
        Args: { p_bot_id: string }
        Returns: string
      }
      generate_short_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
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
      get_or_create_bot_owner: {
        Args: { user_uuid: string }
        Returns: string
      }
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
        Args: Record<PropertyKey, never>
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
      hide_demo_account_data: {
        Args: { data_value: string; user_id: string }
        Returns: string
      }
      is_admin: {
        Args: { user_uuid?: string }
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
      reconcile_bot_user_session_token: {
        Args: { p_bot_id: string; p_session_token: string }
        Returns: string
      }
      reconcile_session_final: {
        Args: { p_bot_id: string; p_session_token: string }
        Returns: string
      }
      repair_all_session_inconsistencies: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          count: number
          details: string
        }[]
      }
      repair_system_final: {
        Args: Record<PropertyKey, never>
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
      system_health_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric_name: string
          metric_value: string
          status: string
        }[]
      }
      test_absolute_session_resolution: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          test_category: string
          test_result: string
        }[]
      }
      test_bot_creation_fix: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          test_name: string
        }[]
      }
      test_bot_creation_fixed: {
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          test_category: string
          test_result: string
        }[]
      }
      test_owner_access_complete: {
        Args: Record<PropertyKey, never>
        Returns: {
          data_preview: Json
          details: string
          status: string
          test_name: string
        }[]
      }
      test_session_token_resolution: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          test_name: string
        }[]
      }
      test_system_final: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          test_name: string
        }[]
      }
      track_link_click: {
        Args:
          | {
              p_ip_address?: unknown
              p_referrer?: string
              p_short_code: string
              p_user_agent?: string
            }
          | { p_referrer?: string; p_short_code: string; p_user_agent?: string }
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
        Returns: number
      }
      user_has_permission: {
        Args: { permission_name: string; user_uuid: string }
        Returns: boolean
      }
      validate_owner_complete_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          result_details: Json
          status: string
          validation_step: string
        }[]
      }
      verify_bot_access_final: {
        Args: { p_bot_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
