import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user session
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { reason, message, client_id, client_slug, business_name } = await req.json();

    console.log('[SendContactEmail] Received contact form:', {
      reason,
      client_id,
      user_email: user.email
    });

    // Format reason for display
    const reasonMap: Record<string, string> = {
      general_query: 'General Query',
      dashboard_issues: 'Dashboard Issues',
      phone_provisioning: 'Phone Provisioning',
      other: 'Other'
    };

    const reasonDisplay = reasonMap[reason] || reason;

    // Construct email body
    const emailBody = `
New Contact Form Submission from Klariqo Dashboard
====================================================

REASON: ${reasonDisplay}

FROM:
- User Email: ${user.email}
- Client ID: ${client_id}
- Client Slug: ${client_slug}
- Business Name: ${business_name}

MESSAGE:
${message}

====================================================
Received at: ${new Date().toISOString()}
    `.trim();

    console.log('[SendContactEmail] Sending email to ansh@klariqo.com');

    // Send email via PHP endpoint (uses server's mail() function)
    try {
      const emailResponse = await fetch('https://klariqo.com/api/send-email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'ansh@klariqo.com',
          subject: `Contact Form: ${reasonDisplay} - ${business_name}`,
          body: emailBody,
          from_email: user.email
        })
      });

      if (!emailResponse.ok) {
        console.error('[SendContactEmail] Email API error:', await emailResponse.text());
        // Don't fail the request, just log it
      } else {
        console.log('[SendContactEmail] Email sent successfully');
      }
    } catch (emailError) {
      console.error('[SendContactEmail] Failed to send email:', emailError);
      // Don't fail the request, continue to store in DB
    }

    // Store in contact_messages table for future ticketing system
    const { error: insertError } = await supabaseClient
      .from('contact_messages')
      .insert({
        user_id: user.id,
        user_email: user.email,
        client_id,
        client_slug,
        business_name,
        reason,
        message,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[SendContactEmail] Error storing message:', insertError);
      // Don't fail the request, just log it
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your message has been received. We\'ll get back to you within 24 hours.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[SendContactEmail] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
