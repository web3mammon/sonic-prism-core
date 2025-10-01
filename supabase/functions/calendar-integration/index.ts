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

    const calendarConfig = client.config?.calendar_integration || {};

    switch (action) {
      case 'get_available_slots':
        return await getAvailableSlots(params, calendarConfig);
      
      case 'check_availability':
        return await checkAvailability(params, calendarConfig);
      
      case 'create_booking':
        return await createBooking(params, client_id, calendarConfig, supabaseClient);
      
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

async function getAvailableSlots(params: any, config: any) {
  const { date, duration_minutes = 30 } = params;
  
  // Parse business hours from config
  const businessHours = config.business_hours || {
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

async function checkAvailability(params: any, config: any) {
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

async function createBooking(params: any, clientId: string, config: any, supabase: any) {
  const { 
    customer_name, 
    customer_phone, 
    customer_email,
    start_time, 
    end_time, 
    service_type,
    notes,
    requires_approval = true
  } = params;

  // Store booking in database
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      client_id: clientId,
      customer_name,
      customer_phone,
      customer_email,
      start_time,
      end_time,
      service_type,
      notes,
      status: requires_approval ? 'pending_approval' : 'confirmed',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (bookingError) {
    throw new Error(`Failed to create booking: ${bookingError.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      booking: booking,
      requires_approval: requires_approval,
      message: requires_approval 
        ? 'Booking request submitted for approval' 
        : 'Booking confirmed'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function requestBookingApproval(params: any, clientId: string, supabase: any) {
  const { booking_id, action } = params; // action: 'approve' or 'reject'
  
  const newStatus = action === 'approve' ? 'confirmed' : 'rejected';
  
  const { error } = await supabase
    .from('bookings')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking_id)
    .eq('client_id', clientId);

  if (error) {
    throw new Error(`Failed to update booking: ${error.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      booking_id,
      status: newStatus,
      message: `Booking ${action}d successfully`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
