import { Database as OriginalDatabase } from './types';

// Extend the original Database type with our custom tables
export interface CustomDatabase extends OriginalDatabase {
  public: {
    Tables: OriginalDatabase['public']['Tables'] & {
      participants: {
        Row: {
          id: string;
          name: string;
          category: string;
          position: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          position: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          position?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      participant_categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      institution_categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
          category_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "institutions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "institution_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      agencies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      press_genres: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      press_sections: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      press_sources: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      press_rates: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monitoring_targets: {
        Row: {
          id: string;
          name: string;
          type: 'client' | 'topic' | 'brand';
          keywords?: string[];
          categories?: string[];
          importance?: number;
          client_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'client' | 'topic' | 'brand';
          keywords?: string[];
          categories?: string[];
          importance?: number;
          client_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'client' | 'topic' | 'brand';
          keywords?: string[];
          categories?: string[];
          importance?: number;
          client_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monitoring_targets_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      target_mentions: {
        Row: {
          id: string;
          target_id: string;
          content_id: string;
          content_type: 'news' | 'social' | 'radio' | 'tv' | 'press';
          matched_keywords: string[];
          importance: number;
          analysis_result?: any;
          read: boolean;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_id: string;
          content_id: string;
          content_type: 'news' | 'social' | 'radio' | 'tv' | 'press';
          matched_keywords?: string[];
          importance?: number;
          analysis_result?: any;
          read?: boolean;
          archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_id?: string;
          content_id?: string;
          content_type?: 'news' | 'social' | 'radio' | 'tv' | 'press';
          matched_keywords?: string[];
          importance?: number;
          analysis_result?: any;
          read?: boolean;
          archived?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "target_mentions_target_id_fkey";
            columns: ["target_id"];
            referencedRelation: "monitoring_targets";
            referencedColumns: ["id"];
          }
        ];
      };
      audio_files: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          duration?: number;
          transcription_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          filename: string;
          storage_path: string;
          file_size?: number;
          mime_type?: string;
          duration?: number;
          transcription_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          storage_path?: string;
          file_size?: number;
          mime_type?: string;
          duration?: number;
          transcription_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audio_files_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: OriginalDatabase['public']['Views'];
    Functions: OriginalDatabase['public']['Functions'] & {
      get_user_audio_files: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          user_id: string;
          filename: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          duration?: number;
          transcription_id?: string;
          created_at: string;
          updated_at: string;
        }[];
      };
      insert_audio_file: {
        Args: {
          p_filename: string;
          p_storage_path: string;
          p_file_size: number;
          p_mime_type: string;
          p_duration?: number;
          p_transcription_id?: string;
        };
        Returns: {
          id: string;
          filename: string;
          storage_path: string;
        };
      };
    };
    Enums: OriginalDatabase['public']['Enums'];
    CompositeTypes: OriginalDatabase['public']['CompositeTypes'];
  };
}
