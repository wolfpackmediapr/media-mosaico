export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audio_files: {
        Row: {
          created_at: string
          duration: number | null
          file_size: number | null
          filename: string
          id: string
          mime_type: string | null
          storage_path: string
          transcription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_size?: number | null
          filename: string
          id?: string
          mime_type?: string | null
          storage_path: string
          transcription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_size?: number | null
          filename?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
          transcription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name_en: string
          name_es: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_en: string
          name_es: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name_en?: string
          name_es?: string
          updated_at?: string
        }
        Relationships: []
      }
      chunked_upload_sessions: {
        Row: {
          assembled_file_path: string | null
          created_at: string | null
          file_name: string
          file_size: number
          id: string
          manifest_created: boolean | null
          playback_type: string | null
          session_id: string
          status: string | null
          total_chunks: number
          updated_at: string | null
          uploaded_chunks: number | null
          user_id: string
        }
        Insert: {
          assembled_file_path?: string | null
          created_at?: string | null
          file_name: string
          file_size: number
          id?: string
          manifest_created?: boolean | null
          playback_type?: string | null
          session_id: string
          status?: string | null
          total_chunks: number
          updated_at?: string | null
          uploaded_chunks?: number | null
          user_id: string
        }
        Update: {
          assembled_file_path?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          manifest_created?: boolean | null
          playback_type?: string | null
          session_id?: string
          status?: string | null
          total_chunks?: number
          updated_at?: string | null
          uploaded_chunks?: number | null
          user_id?: string
        }
        Relationships: []
      }
      client_alerts: {
        Row: {
          client_id: string | null
          content_id: string | null
          content_type: string | null
          created_at: string
          description: string | null
          id: string
          importance_level: number | null
          keyword_matched: string[] | null
          metadata: Json | null
          priority: string
          read_at: string | null
          status: string | null
          title: string
          transcription_id: string | null
        }
        Insert: {
          client_id?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          importance_level?: number | null
          keyword_matched?: string[] | null
          metadata?: Json | null
          priority: string
          read_at?: string | null
          status?: string | null
          title: string
          transcription_id?: string | null
        }
        Update: {
          client_id?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          importance_level?: number | null
          keyword_matched?: string[] | null
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          status?: string | null
          title?: string
          transcription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_alerts_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          category: string
          created_at: string
          id: string
          keywords: string[] | null
          name: string
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          name: string
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          name?: string
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_processing_jobs: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          error: string | null
          id: string
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversion_jobs: {
        Row: {
          cloudconvert_job_id: string | null
          completed_at: string | null
          created_at: string | null
          error: string | null
          file_path: string
          id: string
          result_url: string | null
          status: string
          target_format: string
          user_id: string
        }
        Insert: {
          cloudconvert_job_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          file_path: string
          id?: string
          result_url?: string | null
          status?: string
          target_format: string
          user_id: string
        }
        Update: {
          cloudconvert_job_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          file_path?: string
          id?: string
          result_url?: string | null
          status?: string
          target_format?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_sources: {
        Row: {
          active: boolean | null
          created_at: string
          error_count: number | null
          id: string
          last_fetch_error: string | null
          last_successful_fetch: string | null
          name: string
          platform: string | null
          platform_display_name: string | null
          platform_icon: string | null
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          error_count?: number | null
          id?: string
          last_fetch_error?: string | null
          last_successful_fetch?: string | null
          name: string
          platform?: string | null
          platform_display_name?: string | null
          platform_icon?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          error_count?: number | null
          id?: string
          last_fetch_error?: string | null
          last_successful_fetch?: string | null
          name?: string
          platform?: string | null
          platform_display_name?: string | null
          platform_icon?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      institution_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "institution_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      media_outlets: {
        Row: {
          created_at: string | null
          folder: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          folder?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          folder?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      media_posts: {
        Row: {
          caption: string | null
          created_at: string | null
          file_path: string
          file_size: number | null
          id: string
          instagram_post_id: string | null
          mime_type: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          instagram_post_id?: string | null
          mime_type?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          instagram_post_id?: string | null
          mime_type?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      monitoring_targets: {
        Row: {
          categories: string[] | null
          client_id: string | null
          created_at: string
          id: string
          importance: number | null
          keywords: string[] | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          categories?: string[] | null
          client_id?: string | null
          created_at?: string
          id?: string
          importance?: number | null
          keywords?: string[] | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          categories?: string[] | null
          client_id?: string | null
          created_at?: string
          id?: string
          importance?: number | null
          keywords?: string[] | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          category: string | null
          clients: Json | null
          created_at: string
          description: string | null
          feed_source_id: string | null
          id: string
          image_url: string | null
          keywords: string[] | null
          last_processed: string | null
          link: string
          pub_date: string
          source: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          clients?: Json | null
          created_at?: string
          description?: string | null
          feed_source_id?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          last_processed?: string | null
          link: string
          pub_date: string
          source: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          clients?: Json | null
          created_at?: string
          description?: string | null
          feed_source_id?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          last_processed?: string | null
          link?: string
          pub_date?: string
          source?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_feed_source_id_fkey"
            columns: ["feed_source_id"]
            isOneToOne: false
            referencedRelation: "feed_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_segments: {
        Row: {
          created_at: string | null
          embedding: string | null
          end_ms: number | null
          id: string
          keywords: string[] | null
          segment_number: number
          segment_title: string
          start_ms: number | null
          timestamp_end: string | null
          timestamp_start: string | null
          transcript: string
          transcription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          end_ms?: number | null
          id?: string
          keywords?: string[] | null
          segment_number: number
          segment_title: string
          start_ms?: number | null
          timestamp_end?: string | null
          timestamp_start?: string | null
          transcript: string
          transcription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          end_ms?: number | null
          id?: string
          keywords?: string[] | null
          segment_number?: number
          segment_title?: string
          start_ms?: number | null
          timestamp_end?: string | null
          timestamp_start?: string | null
          transcript?: string
          transcription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_segments_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          notification_id: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          notification_id: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "client_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          client_id: string
          created_at: string
          frequency: string | null
          id: string
          is_active: boolean | null
          keyword_id: string | null
          notification_channels: string[]
          sources: string[] | null
          threshold: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          keyword_id?: string | null
          notification_channels?: string[]
          sources?: string[] | null
          threshold?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          keyword_id?: string | null
          notification_channels?: string[]
          sources?: string[] | null
          threshold?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          position: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          position: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          position?: string
          updated_at?: string
        }
        Relationships: []
      }
      pdf_processing_jobs: {
        Row: {
          created_at: string | null
          error: string | null
          file_path: string
          id: string
          progress: number | null
          publication_name: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          file_path: string
          id?: string
          progress?: number | null
          publication_name: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          file_path?: string
          id?: string
          progress?: number | null
          publication_name?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      press_clippings: {
        Row: {
          category: string
          client_relevance: string[] | null
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          keywords: string[] | null
          page_number: number
          publication_date: string | null
          publication_name: string
          summary_what: string | null
          summary_when: string | null
          summary_where: string | null
          summary_who: string | null
          summary_why: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          client_relevance?: string[] | null
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          keywords?: string[] | null
          page_number: number
          publication_date?: string | null
          publication_name: string
          summary_what?: string | null
          summary_when?: string | null
          summary_where?: string | null
          summary_who?: string | null
          summary_why?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          client_relevance?: string[] | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          keywords?: string[] | null
          page_number?: number
          publication_date?: string | null
          publication_name?: string
          summary_what?: string | null
          summary_when?: string | null
          summary_where?: string | null
          summary_who?: string | null
          summary_why?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      press_genres: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      press_rates: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      press_sections: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      press_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      processing_errors: {
        Row: {
          article_info: Json | null
          created_at: string
          error_message: string
          id: string
          raw_content: string | null
          stage: string
        }
        Insert: {
          article_info?: Json | null
          created_at?: string
          error_message: string
          id?: string
          raw_content?: string | null
          stage: string
        }
        Update: {
          article_info?: Json | null
          created_at?: string
          error_message?: string
          id?: string
          raw_content?: string | null
          stage?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      radio_data_version: {
        Row: {
          id: number
          updated_at: string
          version: string
        }
        Insert: {
          id?: number
          updated_at?: string
          version: string
        }
        Update: {
          id?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      radio_migrations: {
        Row: {
          applied_at: string
          applied_by: string | null
          description: string | null
          id: string
          name: string
          rollback_info: Json | null
          status: string
          version: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          description?: string | null
          id?: string
          name: string
          rollback_info?: Json | null
          status?: string
          version: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          description?: string | null
          id?: string
          name?: string
          rollback_info?: Json | null
          status?: string
          version?: string
        }
        Relationships: []
      }
      radio_programs: {
        Row: {
          created_at: string
          days: string[]
          end_time: string
          host: string | null
          id: string
          name: string
          start_time: string
          station_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days: string[]
          end_time: string
          host?: string | null
          id?: string
          name: string
          start_time: string
          station_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: string[]
          end_time?: string
          host?: string | null
          id?: string
          name?: string
          start_time?: string
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_programs_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_rates: {
        Row: {
          created_at: string
          days: string[]
          end_time: string
          id: string
          program_id: string
          rate_15s: number | null
          rate_30s: number | null
          rate_45s: number | null
          rate_60s: number | null
          start_time: string
          station_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days: string[]
          end_time: string
          id?: string
          program_id: string
          rate_15s?: number | null
          rate_30s?: number | null
          rate_45s?: number | null
          rate_60s?: number | null
          start_time: string
          station_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: string[]
          end_time?: string
          id?: string
          program_id?: string
          rate_15s?: number | null
          rate_30s?: number | null
          rate_45s?: number | null
          rate_60s?: number | null
          start_time?: string
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_rates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "radio_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_rates_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_transcriptions: {
        Row: {
          analysis_result: Json | null
          created_at: string | null
          emisora: string | null
          horario: string | null
          id: string
          programa: string | null
          transcription_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string | null
          emisora?: string | null
          horario?: string | null
          id?: string
          programa?: string | null
          transcription_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string | null
          emisora?: string | null
          horario?: string | null
          id?: string
          programa?: string | null
          transcription_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          data: Json | null
          date_range: unknown
          file_path: string | null
          format: string
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          date_range: unknown
          file_path?: string | null
          format: string
          id?: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          date_range?: unknown
          file_path?: string | null
          format?: string
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      speaker_labels: {
        Row: {
          created_at: string
          custom_name: string
          id: string
          original_speaker: string
          transcription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_name: string
          id?: string
          original_speaker: string
          transcription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_name?: string
          id?: string
          original_speaker?: string
          transcription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          analysis_alerts: Json | null
          analysis_category: string | null
          analysis_client_relevance: Json | null
          analysis_content_summary: string | null
          analysis_cuando: string | null
          analysis_donde: string | null
          analysis_keywords: string[] | null
          analysis_notifications: Json[] | null
          analysis_porque: string | null
          analysis_que: string | null
          analysis_quien: string | null
          analysis_report_data: Json | null
          analysis_summary: string | null
          assembly_chapters: Json | null
          assembly_content_safety: Json | null
          assembly_entities: Json | null
          assembly_key_phrases: Json | null
          assembly_sentiment_analysis: Json | null
          assembly_summary: string | null
          assembly_topics: Json | null
          audio_file_path: string | null
          broadcast_time: string | null
          category: string | null
          channel: string | null
          created_at: string
          id: string
          keywords: string[] | null
          original_file_path: string
          program: string | null
          progress: number | null
          relevant_clients: string[] | null
          status: string
          summary: string | null
          transcription_text: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_alerts?: Json | null
          analysis_category?: string | null
          analysis_client_relevance?: Json | null
          analysis_content_summary?: string | null
          analysis_cuando?: string | null
          analysis_donde?: string | null
          analysis_keywords?: string[] | null
          analysis_notifications?: Json[] | null
          analysis_porque?: string | null
          analysis_que?: string | null
          analysis_quien?: string | null
          analysis_report_data?: Json | null
          analysis_summary?: string | null
          assembly_chapters?: Json | null
          assembly_content_safety?: Json | null
          assembly_entities?: Json | null
          assembly_key_phrases?: Json | null
          assembly_sentiment_analysis?: Json | null
          assembly_summary?: string | null
          assembly_topics?: Json | null
          audio_file_path?: string | null
          broadcast_time?: string | null
          category?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          original_file_path: string
          program?: string | null
          progress?: number | null
          relevant_clients?: string[] | null
          status?: string
          summary?: string | null
          transcription_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_alerts?: Json | null
          analysis_category?: string | null
          analysis_client_relevance?: Json | null
          analysis_content_summary?: string | null
          analysis_cuando?: string | null
          analysis_donde?: string | null
          analysis_keywords?: string[] | null
          analysis_notifications?: Json[] | null
          analysis_porque?: string | null
          analysis_que?: string | null
          analysis_quien?: string | null
          analysis_report_data?: Json | null
          analysis_summary?: string | null
          assembly_chapters?: Json | null
          assembly_content_safety?: Json | null
          assembly_entities?: Json | null
          assembly_key_phrases?: Json | null
          assembly_sentiment_analysis?: Json | null
          assembly_summary?: string | null
          assembly_topics?: Json | null
          audio_file_path?: string | null
          broadcast_time?: string | null
          category?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          original_file_path?: string
          program?: string | null
          progress?: number | null
          relevant_clients?: string[] | null
          status?: string
          summary?: string | null
          transcription_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tv_data_version: {
        Row: {
          id: number
          updated_at: string
          version: string
        }
        Insert: {
          id?: number
          updated_at?: string
          version: string
        }
        Update: {
          id?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      tv_migrations: {
        Row: {
          applied_at: string
          applied_by: string | null
          description: string | null
          id: string
          name: string
          rollback_info: Json | null
          status: string
          version: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          description?: string | null
          id?: string
          name: string
          rollback_info?: Json | null
          status?: string
          version: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          description?: string | null
          id?: string
          name?: string
          rollback_info?: Json | null
          status?: string
          version?: string
        }
        Relationships: []
      }
      tv_news_segments: {
        Row: {
          created_at: string | null
          embedding: string | null
          end_ms: number | null
          id: string
          keywords: string[] | null
          segment_number: number
          segment_title: string
          start_ms: number | null
          timestamp_end: string | null
          timestamp_start: string | null
          transcript: string
          transcription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          end_ms?: number | null
          id?: string
          keywords?: string[] | null
          segment_number: number
          segment_title: string
          start_ms?: number | null
          timestamp_end?: string | null
          timestamp_start?: string | null
          transcript: string
          transcription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          end_ms?: number | null
          id?: string
          keywords?: string[] | null
          segment_number?: number
          segment_title?: string
          start_ms?: number | null
          timestamp_end?: string | null
          timestamp_start?: string | null
          transcript?: string
          transcription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_news_segments_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "tv_transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_programs: {
        Row: {
          channel_id: string
          created_at: string
          days: string[]
          end_time: string
          id: string
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          days: string[]
          end_time: string
          id?: string
          name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          days?: string[]
          end_time?: string
          id?: string
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_programs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_rates: {
        Row: {
          channel_id: string
          created_at: string
          days: string[]
          end_time: string
          id: string
          program_id: string
          rate_15s: number | null
          rate_30s: number | null
          rate_45s: number | null
          rate_60s: number | null
          start_time: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          days: string[]
          end_time: string
          id?: string
          program_id: string
          rate_15s?: number | null
          rate_30s?: number | null
          rate_45s?: number | null
          rate_60s?: number | null
          start_time: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          days?: string[]
          end_time?: string
          id?: string
          program_id?: string
          rate_15s?: number | null
          rate_30s?: number | null
          rate_45s?: number | null
          rate_60s?: number | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_rates_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_rates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "tv_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_transcriptions: {
        Row: {
          analysis_alerts: Json | null
          analysis_category: string | null
          analysis_client_relevance: Json | null
          analysis_content_summary: string | null
          analysis_cuando: string | null
          analysis_donde: string | null
          analysis_keywords: string[] | null
          analysis_notifications: string[] | null
          analysis_porque: string | null
          analysis_que: string | null
          analysis_quien: string | null
          analysis_report_data: Json | null
          analysis_summary: string | null
          assembly_chapters: Json | null
          assembly_content_safety: Json | null
          assembly_entities: Json | null
          assembly_key_phrases: Json | null
          assembly_sentiment_analysis: Json | null
          assembly_summary: string | null
          assembly_topics: Json | null
          audio_file_path: string | null
          broadcast_time: string | null
          category: string | null
          channel: string | null
          created_at: string
          id: string
          keywords: string[] | null
          original_file_path: string
          program: string | null
          progress: number | null
          relevant_clients: string[] | null
          status: string
          summary: string | null
          transcription_text: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_alerts?: Json | null
          analysis_category?: string | null
          analysis_client_relevance?: Json | null
          analysis_content_summary?: string | null
          analysis_cuando?: string | null
          analysis_donde?: string | null
          analysis_keywords?: string[] | null
          analysis_notifications?: string[] | null
          analysis_porque?: string | null
          analysis_que?: string | null
          analysis_quien?: string | null
          analysis_report_data?: Json | null
          analysis_summary?: string | null
          assembly_chapters?: Json | null
          assembly_content_safety?: Json | null
          assembly_entities?: Json | null
          assembly_key_phrases?: Json | null
          assembly_sentiment_analysis?: Json | null
          assembly_summary?: string | null
          assembly_topics?: Json | null
          audio_file_path?: string | null
          broadcast_time?: string | null
          category?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          original_file_path: string
          program?: string | null
          progress?: number | null
          relevant_clients?: string[] | null
          status?: string
          summary?: string | null
          transcription_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_alerts?: Json | null
          analysis_category?: string | null
          analysis_client_relevance?: Json | null
          analysis_content_summary?: string | null
          analysis_cuando?: string | null
          analysis_donde?: string | null
          analysis_keywords?: string[] | null
          analysis_notifications?: string[] | null
          analysis_porque?: string | null
          analysis_que?: string | null
          analysis_quien?: string | null
          analysis_report_data?: Json | null
          analysis_summary?: string | null
          assembly_chapters?: Json | null
          assembly_content_safety?: Json | null
          assembly_entities?: Json | null
          assembly_key_phrases?: Json | null
          assembly_sentiment_analysis?: Json | null
          assembly_summary?: string | null
          assembly_topics?: Json | null
          audio_file_path?: string | null
          broadcast_time?: string | null
          category?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          original_file_path?: string
          program?: string | null
          progress?: number | null
          relevant_clients?: string[] | null
          status?: string
          summary?: string | null
          transcription_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      video_chunk_manifests: {
        Row: {
          chunk_order: Json
          created_at: string
          duration: number | null
          file_name: string
          id: string
          mime_type: string | null
          session_id: string
          total_chunks: number
          total_size: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_order: Json
          created_at?: string
          duration?: number | null
          file_name: string
          id?: string
          mime_type?: string | null
          session_id: string
          total_chunks: number
          total_size: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_order?: Json
          created_at?: string
          duration?: number | null
          file_name?: string
          id?: string
          mime_type?: string | null
          session_id?: string
          total_chunks?: number
          total_size?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_chunk_manifests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chunked_upload_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string | null
          id: string
          instagram_post_id: string | null
          status: string | null
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instagram_post_id?: string | null
          status?: string | null
          storage_path: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instagram_post_id?: string | null
          status?: string | null
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_processing_errors_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_user: {
        Args: { user_id: string }
        Returns: undefined
      }
      get_platforms_with_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          count: number
        }[]
      }
      get_user_audio_files: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          duration: number | null
          file_size: number | null
          filename: string
          id: string
          mime_type: string | null
          storage_path: string
          transcription_id: string | null
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      get_users_email: {
        Args: { user_ids: string[] }
        Returns: {
          id: string
          email: string
        }[]
      }
      insert_audio_file: {
        Args: {
          p_filename: string
          p_storage_path: string
          p_file_size: number
          p_mime_type: string
          p_duration?: number
          p_transcription_id?: string
        }
        Returns: Json
      }
      insert_tv_rate: {
        Args: {
          channel_name: string
          program_name: string
          days: string[]
          start_time: string
          end_time: string
          rate_15s: number
          rate_30s: number
          rate_45s: number
          rate_60s: number
        }
        Returns: undefined
      }
      match_news_segments: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          segment_number: number
          segment_title: string
          transcript: string
          timestamp_start: string
          timestamp_end: string
          start_ms: number
          end_ms: number
          keywords: string[]
          similarity: number
        }[]
      }
      match_press_clippings: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          title: string
          content: string
          page_number: number
          publication_name: string
          category: string
          similarity: number
        }[]
      }
      schedule_content_notification_processing: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_tv_programs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      content_category:
        | "ACCIDENTES"
        | "AGENCIAS DE GOBIERNO"
        | "AMBIENTE"
        | "AMBIENTE & EL TIEMPO"
        | "CIENCIA & TECNOLOGIA"
        | "COMUNIDAD"
        | "CRIMEN"
        | "DEPORTES"
        | "ECONOMIA & NEGOCIOS"
        | "EDUCACION & CULTURA"
        | "EE.UU. & INTERNACIONALES"
        | "ENTRETENIMIENTO"
        | "GOBIERNO"
        | "OTRAS"
        | "POLITICA"
        | "RELIGION"
        | "SALUD"
        | "TRIBUNALES"
      user_role: "administrator" | "data_entry"
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
    Enums: {
      content_category: [
        "ACCIDENTES",
        "AGENCIAS DE GOBIERNO",
        "AMBIENTE",
        "AMBIENTE & EL TIEMPO",
        "CIENCIA & TECNOLOGIA",
        "COMUNIDAD",
        "CRIMEN",
        "DEPORTES",
        "ECONOMIA & NEGOCIOS",
        "EDUCACION & CULTURA",
        "EE.UU. & INTERNACIONALES",
        "ENTRETENIMIENTO",
        "GOBIERNO",
        "OTRAS",
        "POLITICA",
        "RELIGION",
        "SALUD",
        "TRIBUNALES",
      ],
      user_role: ["administrator", "data_entry"],
    },
  },
} as const
