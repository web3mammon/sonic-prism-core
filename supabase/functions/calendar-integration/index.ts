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
    const { action, client_id, ...params } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client configuration
    const { data: client, error: clientError } = await supabaseClient
      .from('voice_ai_clients')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    switch (action) {
      case 'get_available_slots':
        return await getAvailableSlots(params, client);

      case 'check_availability':
        return await checkAvailability(params, client);

      case 'create_booking':
        return await createBooking(params, client_id, client, supabaseClient);
      
      case 'request_approval':
        return await requestBookingApproval(params, client_id, supabaseClient);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Calendar integration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getAvailableSlots(params: any, client: any) {
  const { date, duration_minutes = 30 } = params;

  // Parse business hours from client
  const businessHours = client.business_hours || {
    monday: { open: '09:00', close: '17:00' },
    tuesday: { open: '09:00', close: '17:00' },
    wednesday: { open: '09:00', close: '17:00' },
    thursday: { open: '09:00', close: '17:00' },
    friday: { open: '09:00', close: '17:00' },
    saturday: { open: '10:00', close: '14:00' },
    sunday: { closed: true }
  };

  const targetDate = new Date(date);
  const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const dayHours = businessHours[dayName];

  if (!dayHours || dayHours.closed) {
    return new Response(
      JSON.stringify({
        success: true,
        available_slots: [],
        message: 'Business is closed on this day'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate time slots
  const slots = [];
  const [openHour, openMin] = dayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
  
  let currentTime = new Date(targetDate);
  currentTime.setHours(openHour, openMin, 0, 0);
  
  const closingTime = new Date(targetDate);
  closingTime.setHours(closeHour, closeMin, 0, 0);

  while (currentTime < closingTime) {
    const endTime = new Date(currentTime.getTime() + duration_minutes * 60000);
    if (endTime <= closingTime) {
      slots.push({
        start: currentTime.toISOString(),
        end: endTime.toISOString(),
        display: currentTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      });
    }
    currentTime = endTime;
  }

  return new Response(
    JSON.stringify({
      success: true,
      available_slots: slots,
      date: date
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkAvailability(params: any, client: any) {
  const { start_time, end_time } = params;
  
  // For now, assume available (integrate with Google Calendar/Outlook if configured)
  const isAvailable = true;
  
  return new Response(
    JSON.stringify({
      success: true,
      available: isAvailable,
      start_time,
      end_time
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createBooking(params: any, clientId: string, client: any, supabase: any) {
  const {
    customer_name,
    customer_phone,
    customer_email,
    start_time,
    end_time,
    service_type,
    notes,
    session_id,
    source = 'phone',
    lead_id = null,
    requires_approval = false
  } = params;

  // Parse date and time from ISO timestamps
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  // Extract date and time components
  const date = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const start_time_only = startDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
  const end_time_only = endDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

  // Store appointment in database (FIXED: 'bookings' → 'appointments')
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      customer_name,
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      date: date,
      start_time: start_time_only,
      end_time: end_time_only,
      duration_minutes: durationMinutes,
      status: 'scheduled',
      source: source,
      session_id: session_id || null,
      lead_id: lead_id,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (appointmentError) {
    throw new Error(`Failed to create appointment: ${appointmentError.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      appointment: appointment,
      message: 'Appointment scheduled successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function requestBookingApproval(params: any, clientId: string, supabase: any) {
  const { appointment_id, action } = params; // action: 'approve' or 'reject'

  const newStatus = action === 'approve' ? 'scheduled' : 'cancelled';

  // FIXED: 'bookings' → 'appointments'
  const { error } = await supabase
    .from('appointments')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointment_id)
    .eq('client_id', clientId);

  if (error) {
    throw new Error(`Failed to update appointment: ${error.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      appointment_id,
      status: newStatus,
      message: `Appointment ${action}d successfully`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
