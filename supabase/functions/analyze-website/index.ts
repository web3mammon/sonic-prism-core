import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }

    // Parse request body
    let { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Normalize URL
    url = url.trim();
    // Remove trailing slash
    url = url.replace(/\/$/, '');
    // Add https:// if no protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    console.log(`[analyze-website] Analyzing normalized URL: ${url}`);

    // Step 1: Fetch website content using Jina.ai
    console.log('[analyze-website] Fetching website content with Jina.ai...');

    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text'
      }
    });

    if (!jinaResponse.ok) {
      throw new Error(`Failed to fetch website content: ${jinaResponse.status}`);
    }

    const websiteContent = await jinaResponse.text();
    console.log('[analyze-website] Website content fetched, length:', websiteContent.length);

    // Limit content to avoid token limits (keep first 8000 chars)
    const limitedContent = websiteContent.substring(0, 8000);

    // Step 2: Analyze with gpt-oss
    const analysisPrompt = `Analyze this website content and extract the following business information:

1. Business name (exact name from the website)
2. Industry/sector (e.g., SaaS, E-commerce, Healthcare, Restaurant, etc.)
3. Main services or products offered (list the top 3-5)
4. Pricing information (if available - plans, pricing tiers, cost)
5. Target audience (who is this business for?)
6. Business tone (professional, casual, friendly, technical, etc.)
7. Key unique selling points or value propositions

Website content:
${limitedContent}

Provide a detailed analysis.`;

    console.log('[analyze-website] Analyzing with gpt-oss...');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{
          role: 'user',
          content: analysisPrompt
        }],
        temperature: 0.3,
        max_completion_tokens: 2048
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('[analyze-website] Groq API error:', errorText);
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    console.log('[analyze-website] Groq response received');

    // Extract the analysis from the response
    const analysisText = groqData.choices[0]?.message?.content || '';

    if (!analysisText) {
      console.error('[analyze-website] No content in response');
      throw new Error('No analysis content received from Groq');
    }

    console.log('[analyze-website] Analysis text:', analysisText.substring(0, 500) + '...');

    // Step 3: Parse the analysis into structured data
    // Use gpt-oss again to structure the data into JSON
    const structurePrompt = `Extract the following from this analysis and return ONLY a JSON object (no markdown, no extra text):

{
  "business_name": "exact business name",
  "industry": "industry/sector",
  "services": ["service 1", "service 2"],
  "pricing": "pricing info or Not available",
  "target_audience": "target audience",
  "tone": "professional",
  "usps": ["usp 1", "usp 2"]
}

Analysis:
${analysisText.substring(0, 2000)}

Return only the JSON object, nothing else.`;

    console.log('[analyze-website] Structuring data...');

    const structureResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{
          role: 'user',
          content: structurePrompt
        }],
        temperature: 0.1,
        max_completion_tokens: 1024
      })
    });

    if (!structureResponse.ok) {
      const errorText = await structureResponse.text();
      console.error('[analyze-website] Structure API error:', structureResponse.status, errorText);
      throw new Error(`Structure API error: ${structureResponse.status}. ${errorText.substring(0, 200)}`);
    }

    const structureData = await structureResponse.json();
    let structuredText = structureData.choices[0]?.message?.content || '{}';

    // Clean up response - remove markdown code blocks if present
    structuredText = structuredText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(structuredText);
    } catch (e) {
      console.error('[analyze-website] JSON parse error:', e);
      console.error('[analyze-website] Received text:', structuredText);
      throw new Error('Failed to parse structured data');
    }

    console.log('[analyze-website] Structured analysis:', analysis);

    // Step 4: Generate system prompt based on analysis
    const systemPrompt = generateSystemPrompt(analysis);

    // Return complete result
    const result = {
      success: true,
      analysis,
      system_prompt: systemPrompt
    };

    console.log('[analyze-website] Analysis complete');

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[analyze-website] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to analyze website'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to generate system prompt from analysis
function generateSystemPrompt(analysis: any): string {
  const { business_name, industry, services, pricing, target_audience, tone, usps } = analysis;

  let prompt = `You are an AI assistant for ${business_name}, a ${industry} business.\n\n`;

  // Add services
  if (services && services.length > 0) {
    prompt += `Main services offered:\n`;
    services.forEach((service: string) => {
      prompt += `- ${service}\n`;
    });
    prompt += `\n`;
  }

  // Add pricing if available
  if (pricing && pricing !== 'Not available') {
    prompt += `Pricing: ${pricing}\n\n`;
  }

  // Add target audience
  if (target_audience) {
    prompt += `Target audience: ${target_audience}\n\n`;
  }

  // Add tone instruction
  if (tone) {
    prompt += `Your tone should be ${tone}. `;
  }

  // Add USPs
  if (usps && usps.length > 0) {
    prompt += `Highlight these key benefits: ${usps.join(', ')}.\n\n`;
  }

  // Add responsibilities
  prompt += `Your responsibilities:\n`;
  prompt += `1. Answer customer questions about our services\n`;
  prompt += `2. Provide pricing information when asked\n`;
  prompt += `3. Book appointments or demos when requested\n`;
  prompt += `4. Qualify leads by understanding their needs\n`;
  prompt += `5. Escalate complex issues to a human representative\n\n`;

  prompt += `Always be helpful, accurate, and represent ${business_name} professionally.`;

  return prompt;
}
