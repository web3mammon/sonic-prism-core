import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const clientId = url.searchParams.get('client_id');
    const filename = url.searchParams.get('filename');

    if (!clientId) {
      throw new Error('client_id is required');
    }

    switch (action) {
      case 'get_file':
        return await getAudioFile(clientId, filename!, supabaseClient);
      
      case 'list_files':
        return await listAudioFiles(clientId, supabaseClient);
      
      case 'get_snippet':
        return await getAudioSnippet(clientId, filename!, supabaseClient);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Audio manager error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getAudioFile(clientId: string, filename: string, supabase: any) {
  // Get audio file metadata from database
  const { data: fileData, error: fileError } = await supabase
    .from('audio_files')
    .select('*')
    .eq('client_id', clientId)
    .eq('file_name', filename)
    .single();

  if (fileError || !fileData) {
    throw new Error('Audio file not found');
  }

  // Get file from storage
  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('audio-snippets')
    .download(`${clientId}/${filename}`);

  if (storageError) {
    throw new Error(`Failed to download file: ${storageError.message}`);
  }

  // Convert blob to base64
  const arrayBuffer = await storageData.arrayBuffer();
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  return new Response(
    JSON.stringify({
      success: true,
      file_name: filename,
      audio_data: base64Audio,
      format: fileData.file_type,
      metadata: fileData.metadata
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listAudioFiles(clientId: string, supabase: any) {
  const { data: files, error } = await supabase
    .from('audio_files')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      files: files,
      count: files.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAudioSnippet(clientId: string, snippetKey: string, supabase: any) {
  // Get client's audio snippet mapping
  const { data: client, error: clientError } = await supabase
    .from('voice_ai_clients')
    .select('audio_snippets')
    .eq('client_id', clientId)
    .single();

  if (clientError || !client) {
    throw new Error('Client not found');
  }

  const audioSnippets = client.audio_snippets || {};
  const filename = audioSnippets[snippetKey];

  if (!filename) {
    throw new Error(`No audio snippet configured for: ${snippetKey}`);
  }

  // Return the audio file
  return await getAudioFile(clientId, filename, supabase);
}
