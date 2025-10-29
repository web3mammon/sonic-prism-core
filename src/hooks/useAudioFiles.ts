import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AudioFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  category: string;
  text_content?: string;
  duration_ms?: number;
  file_size_bytes?: number;
  created_at: string;
  metadata: {
    category: string;
    exists: boolean;
  };
}

export function useAudioFiles(clientId: string | null) {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudioFiles = async () => {
    if (!clientId) {
      setAudioFiles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch client data
      const { data: client, error: clientError } = await supabase
        .from('voice_ai_clients')
        .select('created_at, business_name')
        .eq('client_id', clientId)
        .single();

      if (clientError) throw clientError;

      // Construct intro audio file paths using naming convention
      const files: AudioFile[] = [];

      if (client) {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const audioFileName_mp3 = `${clientId}_intro.mp3`;
        const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/audio-snippets/${audioFileName_mp3}`;

        // Check if file exists in storage by attempting to fetch metadata
        let fileExists = true;
        try {
          const checkResponse = await fetch(audioUrl, { method: 'HEAD' });
          fileExists = checkResponse.ok;
        } catch {
          fileExists = false;
        }

        files.push({
          id: audioFileName_mp3,
          file_name: audioFileName_mp3,
          file_path: audioUrl,
          file_type: 'audio/mpeg', // mp3 format
          category: 'introductions',
          text_content: `Introduction message for ${client.business_name}`,
          duration_ms: null, // We don't track duration yet
          file_size_bytes: null, // We don't track size yet
          created_at: client.created_at,
          metadata: {
            category: 'introductions',
            exists: fileExists
          }
        });
      }

      setAudioFiles(files);
      setError(null);
    } catch (err) {
      console.error('Error fetching audio files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audio files');
      setAudioFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, [clientId]);

  return { audioFiles, loading, error, refetch: fetchAudioFiles };
}