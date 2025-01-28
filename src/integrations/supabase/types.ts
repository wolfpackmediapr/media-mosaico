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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
