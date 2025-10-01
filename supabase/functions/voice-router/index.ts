import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { user_input, client_id, call_sid, conversation_history = [] } = await req.json();
    
    if (!user_input || !client_id) {
      throw new Error('Missing required parameters');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log(`🧠 Router request for client: ${client_id}`);

    // Get client configuration from database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: client, error: clientError } = await supabaseClient
      .from('voice_ai_clients')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Check for audio snippet match first (replaces smart_router.py logic)
    const audioSnippet = await checkAudioSnippets(user_input, client.audio_snippets);
    
    if (audioSnippet) {
      console.log(`🎵 Using audio snippet: ${audioSnippet}`);
      return new Response(
        JSON.stringify({
          type: 'audio',
          audio_files: audioSnippet,
          text: `[Audio: ${audioSnippet}]`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // No audio snippet match, use GPT for dynamic response
    console.log('🤖 Generating GPT response');

    const systemPrompt = buildSystemPrompt(client);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation_history
        .slice(-10)
        .filter((msg: any) => msg.speaker === 'user' || msg.speaker === 'assistant')
        .map((msg: any) => ({
          role: msg.speaker === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
      { role: 'user', content: user_input }
    ];

    const conversationConfig = client.conversation_config || {};

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: conversationConfig.model || 'gpt-4',
        messages: messages,
        max_tokens: conversationConfig.max_tokens || 150,
        temperature: conversationConfig.temperature || 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, I didn\'t catch that.';

    console.log(`✅ GPT response: ${aiResponse.substring(0, 50)}...`);

    return new Response(
      JSON.stringify({
        type: 'text',
        text: aiResponse,
        model: conversationConfig.model,
        tokens_used: data.usage?.total_tokens
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Router error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'text',
        text: 'I apologize, I\'m having trouble processing that right now.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function buildSystemPrompt(client: any): string {
  // Replaces router.py:_build_prompt() logic
  
  const basePrompt = client.system_prompt || `You are an AI assistant for ${client.business_name}.`;
  
  const businessContext = client.business_context || {};
  const contextParts: string[] = [basePrompt];

  if (businessContext.services) {
    contextParts.push(`\n\nServices offered: ${businessContext.services}`);
  }

  if (businessContext.location) {
    contextParts.push(`\nLocation: ${businessContext.location}`);
  }

  if (businessContext.pricing) {
    contextParts.push(`\nPricing: ${businessContext.pricing}`);
  }

  if (client.active_hours) {
    const hours = client.active_hours.hours || {};
    contextParts.push(`\n\nBusiness hours: ${JSON.stringify(hours)}`);
  }

  contextParts.push(`\n\nInstructions:
- Keep responses concise (under 50 words for voice)
- Be professional and friendly
- If asked about services not offered, politely redirect
- If transfer needed, mention: "${client.transfer_context || 'I can transfer you to a team member'}"`);

  return contextParts.join('');
}

async function checkAudioSnippets(userInput: string, audioSnippets: any): Promise<string | null> {
  // Replaces smart_router.py logic for audio snippet matching
  
  if (!audioSnippets || typeof audioSnippets !== 'object') {
    return null;
  }

  const inputLower = userInput.toLowerCase().trim();

  // Check for keyword matches in audio snippet mappings
  for (const [intent, audioFile] of Object.entries(audioSnippets)) {
    const keywords = intent.toLowerCase().split('_');
    
    if (keywords.some(keyword => inputLower.includes(keyword))) {
      return audioFile as string;
    }
  }

  return null;
}
