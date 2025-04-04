
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
    };
    Views: OriginalDatabase['public']['Views'];
    Functions: OriginalDatabase['public']['Functions'];
    Enums: OriginalDatabase['public']['Enums'];
  };
}
