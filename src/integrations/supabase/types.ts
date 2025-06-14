export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      enhanced_chat_sessions: {
        Row: {
          bot_id: string
          bot_messages: number | null
          bot_user_id: string
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
          bot_user_id: string
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
          bot_user_id?: string
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
        Relationships: [
          {
            foreignKeyName: "prospect_databases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_databases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "prospects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
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
      subscription_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          features: Json
          id: string
          max_automations: number
          max_conversations: number
          name: string
          price: number
        }
        Insert: {
          billing_cycle: string
          created_at?: string
          features?: Json
          id?: string
          max_automations?: number
          max_conversations?: number
          name: string
          price: number
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          features?: Json
          id?: string
          max_automations?: number
          max_conversations?: number
          name?: string
          price?: number
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
          auth_provider: string | null
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          email: string
          email_verified: boolean | null
          full_name: string
          google_id: string | null
          id: string
          is_active: boolean | null
          language: string | null
          last_activity: string | null
          last_login: string | null
          phone: string | null
          subscription_tier: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          auth_provider?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          full_name: string
          google_id?: string | null
          id: string
          is_active?: boolean | null
          language?: string | null
          last_activity?: string | null
          last_login?: string | null
          phone?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          auth_provider?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean | null
          full_name?: string
          google_id?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_activity?: string | null
          last_login?: string | null
          phone?: string | null
          subscription_tier?: string | null
          timezone?: string | null
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
            foreignKeyName: "whatsapp_conversations_last_message_id_fkey"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
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
          contact_id: string
          content: string | null
          created_at: string | null
          direction: string
          id: string
          integration_id: string
          is_read: boolean | null
          media_caption: string | null
          media_url: string | null
          message_id: string
          message_type: string
          metadata: Json | null
          status: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          contact_id: string
          content?: string | null
          created_at?: string | null
          direction: string
          id?: string
          integration_id: string
          is_read?: boolean | null
          media_caption?: string | null
          media_url?: string | null
          message_id: string
          message_type: string
          metadata?: Json | null
          status?: string | null
          timestamp: string
          user_id: string
        }
        Update: {
          contact_id?: string
          content?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          integration_id?: string
          is_read?: boolean | null
          media_caption?: string | null
          media_url?: string | null
          message_id?: string
          message_type?: string
          metadata?: Json | null
          status?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "bot_users"
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
      collect_visitor_data: {
        Args: {
          p_session_id: string
          p_data_type: string
          p_data_value: string
          p_collection_method?: string
          p_confidence_score?: number
        }
        Returns: string
      }
      create_anonymous_visitor_session: {
        Args: {
          p_fingerprint_id: string
          p_bot_id: string
          p_entry_point?: string
          p_referrer_url?: string
          p_utm_source?: string
          p_utm_medium?: string
          p_utm_campaign?: string
          p_ip_address?: unknown
        }
        Returns: string
      }
      create_bot_user_if_not_exists: {
        Args: {
          p_bot_id: string
          p_session_id: string
          p_user_name?: string
          p_user_email?: string
        }
        Returns: string
      }
      create_or_get_visitor_fingerprint: {
        Args: {
          p_fingerprint_hash: string
          p_browser_info?: Json
          p_screen_info?: Json
          p_timezone?: string
          p_language?: string
          p_platform?: string
          p_user_agent?: string
        }
        Returns: string
      }
      create_shortened_link: {
        Args: { p_bot_id: string; p_owner_id: string }
        Returns: string
      }
      generate_public_chat_url: {
        Args: { bot_id: string }
        Returns: string
      }
      generate_short_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_bot_detailed_history: {
        Args: {
          bot_uuid: string
          owner_uuid: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          message_id: string
          message_content: string
          message_type: string
          message_timestamp: string
          user_name: string
          user_email: string
          session_id: string
          ip_address: string
          user_agent: string
          session_start: string
          message_order_in_session: number
        }[]
      }
      get_or_create_bot_user_for_session: {
        Args: {
          p_bot_id: string
          p_session_token: string
          p_user_name?: string
        }
        Returns: string
      }
      get_owner_dashboard_stats: {
        Args: { owner_uuid: string }
        Returns: {
          total_bots: number
          active_bots: number
          total_users: number
          total_sessions: number
          total_messages: number
          active_users_24h: number
          messages_24h: number
          avg_session_duration: number
          top_performing_bot_id: string
          top_performing_bot_name: string
          last_activity: string
        }[]
      }
      hide_demo_account_data: {
        Args: { user_id: string; data_value: string }
        Returns: string
      }
      is_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          p_user_id: string
          p_activity_type: string
          p_description?: string
          p_metadata?: Json
        }
        Returns: string
      }
      send_manual_bot_response: {
        Args: {
          p_bot_id: string
          p_session_token: string
          p_message_content: string
        }
        Returns: string
      }
      track_link_click: {
        Args: {
          p_short_code: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_referrer?: string
        }
        Returns: string
      }
      track_visitor_event: {
        Args: {
          p_session_id: string
          p_event_type: string
          p_event_data?: Json
          p_page_url?: string
          p_element_id?: string
          p_element_class?: string
        }
        Returns: string
      }
      transfer_local_businesses_to_prospects: {
        Args: { business_ids: string[]; target_database_id: string }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
