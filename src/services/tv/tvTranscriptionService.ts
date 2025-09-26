import { supabase } from "@/integrations/supabase/client";

export interface TvTranscription {
  id: string;
  user_id: string;
  original_file_path: string;
  audio_file_path?: string;
  transcription_text?: string;
  channel?: string;
  program?: string;
  category?: string;
  broadcast_time?: string;
  keywords?: string[];
  relevant_clients?: string[];
  summary?: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
  // Analysis fields
  analysis_summary?: string;
  analysis_keywords?: string[];
  analysis_quien?: string;
  analysis_que?: string;
  analysis_cuando?: string;
  analysis_donde?: string;
  analysis_porque?: string;
}

export interface TvNewsSegment {
  id: string;
  transcription_id: string;
  segment_number: number;
  segment_title: string;
  transcript: string;
  timestamp_start?: string;
  timestamp_end?: string;
  start_ms?: number;
  end_ms?: number;
  keywords?: string[];
  created_at: string;
  updated_at: string;
}

export class TvTranscriptionService {
  // Create a new TV transcription record
  static async createTranscription(data: {
    original_file_path: string;
    audio_file_path?: string;
    transcription_text?: string;
    channel?: string;
    program?: string;
    category?: string;
    broadcast_time?: string;
    keywords?: string[];
    relevant_clients?: string[];
    summary?: string;
    status?: string;
    progress?: number;
  }): Promise<TvTranscription | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Authentication error:', authError);
      throw new Error('Authentication failed');
    }
    if (!user) throw new Error('User not authenticated');

    // Ensure user_id is explicitly set
    const insertData = {
      user_id: user.id,
      original_file_path: data.original_file_path,
      audio_file_path: data.audio_file_path,
      transcription_text: data.transcription_text,
      channel: data.channel,
      program: data.program,
      category: data.category,
      broadcast_time: data.broadcast_time,
      keywords: data.keywords,
      relevant_clients: data.relevant_clients,
      summary: data.summary,
      status: data.status || 'pending',
      progress: data.progress || 0
    };

    console.log('[TvTranscriptionService] Creating transcription with user_id:', user.id);

    const { data: transcription, error } = await supabase
      .from('tv_transcriptions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating TV transcription:', error);
      throw error;
    }

    return transcription;
  }

  // Update a TV transcription
  static async updateTranscription(
    id: string, 
    updates: Partial<Omit<TvTranscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<TvTranscription | null> {
    const { data: transcription, error } = await supabase
      .from('tv_transcriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating TV transcription:', error);
      throw error;
    }

    return transcription;
  }

  // Get TV transcription by ID
  static async getTranscription(id: string): Promise<TvTranscription | null> {
    const { data: transcription, error } = await supabase
      .from('tv_transcriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching TV transcription:', error);
      return null;
    }

    return transcription;
  }

  // Get user's TV transcriptions
  static async getUserTranscriptions(): Promise<TvTranscription[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: transcriptions, error } = await supabase
      .from('tv_transcriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user TV transcriptions:', error);
      return [];
    }

    return transcriptions || [];
  }

  // Delete TV transcription
  static async deleteTranscription(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tv_transcriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting TV transcription:', error);
      return false;
    }

    return true;
  }

  // Get TV news segments for a transcription
  static async getNewsSegments(transcriptionId: string): Promise<TvNewsSegment[]> {
    const { data: segments, error } = await supabase
      .from('tv_news_segments')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .order('segment_number', { ascending: true });

    if (error) {
      console.error('Error fetching TV news segments:', error);
      return [];
    }

    return segments || [];
  }

  // Create TV news segments
  static async createNewsSegments(segments: Omit<TvNewsSegment, 'id' | 'created_at' | 'updated_at'>[]): Promise<TvNewsSegment[]> {
    const { data: newSegments, error } = await supabase
      .from('tv_news_segments')
      .insert(segments)
      .select();

    if (error) {
      console.error('Error creating TV news segments:', error);
      throw error;
    }

    return newSegments || [];
  }

  // Delete TV news segments for a transcription
  static async deleteNewsSegments(transcriptionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('tv_news_segments')
      .delete()
      .eq('transcription_id', transcriptionId);

    if (error) {
      console.error('Error deleting TV news segments:', error);
      return false;
    }

    return true;
  }
}
