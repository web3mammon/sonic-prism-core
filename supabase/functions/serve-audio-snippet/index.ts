import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get('client_id');
    const filename = url.searchParams.get('filename');

    if (!clientId || !filename) {
      return new Response(
        JSON.stringify({ error: 'Missing client_id or filename parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract region, industry, business name from client_id
    // Format: {region}_{industry}_{businessname}_###
    const parts = clientId.split('_');
    if (parts.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid client_id format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const region = parts[0];
    const industry = parts[1];
    const businessFolder = `${region}_${industry}_${parts.slice(2, -1).join('_')}`;

    // Construct file path to audio snippet in repo
    const audioPath = `./audio-snippets/${businessFolder}/${filename}`;

    console.log(`🎵 Attempting to serve audio: ${audioPath}`);

    // Read the audio file
    let audioData: Uint8Array;
    try {
      audioData = await Deno.readFile(audioPath);
    } catch (error) {
      console.error(`❌ Audio file not found: ${audioPath}`, error);
      return new Response(
        JSON.stringify({ error: 'Audio snippet not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Convert to base64 for Twilio
    const base64Audio = btoa(String.fromCharCode(...audioData));

    return new Response(base64Audio, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    console.error('❌ Error serving audio snippet:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
