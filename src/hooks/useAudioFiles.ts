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

      // Fetch client's intro audio file
      const { data: client, error: clientError } = await supabase
        .from('voice_ai_clients')
        .select('intro_audio_file, created_at, business_name')
        .eq('client_id', clientId)
        .single();

      if (clientError) throw clientError;

      // If client has intro audio file, format it for display
      const files: AudioFile[] = [];

      if (client?.intro_audio_file) {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/audio-snippets/${client.intro_audio_file}`;

        // Check if file exists in storage by attempting to fetch metadata
        let fileExists = true;
        try {
          const checkResponse = await fetch(audioUrl, { method: 'HEAD' });
          fileExists = checkResponse.ok;
        } catch {
          fileExists = false;
        }

        files.push({
          id: client.intro_audio_file,
          file_name: client.intro_audio_file,
          file_path: audioUrl,
          file_type: 'audio/basic', // ulaw format
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