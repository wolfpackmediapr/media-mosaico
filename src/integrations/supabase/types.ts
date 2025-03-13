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
      client_alerts: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          read_at: string | null
          title: string
          transcription_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority: string
          read_at?: string | null
          title: string
          transcription_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          read_at?: string | null
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
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      create_processing_errors_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
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
          match_threshold: number
          match_count: number
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
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
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
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
