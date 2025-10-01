import { useState, useEffect } from 'react';
import { useClientAPI } from '@/hooks/useClientAPI';

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
  const { apiUrl } = useClientAPI();

  const fetchAudioFiles = async () => {
    if (!clientId || !apiUrl) {
      setAudioFiles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/audio/files`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch audio files');
      }

      setAudioFiles(data.audio_files || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching audio files:', err);
      setError('Failed to fetch audio files');
      setAudioFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, [clientId, apiUrl]);

  return { audioFiles, loading, error, refetch: fetchAudioFiles };
}