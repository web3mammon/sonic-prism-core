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

    const { clientId, metricType, dateRange } = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Fetch call sessions data
    const { data: sessions, error: sessionsError } = await supabaseClient
      .from('call_sessions')
      .select('*')
      .eq('client_id', clientId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (sessionsError) throw sessionsError;

    let insights: any = {};

    switch (metricType) {
      case 'sentiment_trends':
        insights = calculateSentimentTrends(sessions);
        break;
      case 'intent_analysis':
        insights = calculateIntentAnalysis(sessions);
        break;
      case 'conversion_funnel':
        insights = calculateConversionFunnel(sessions);
        break;
      case 'revenue_forecast':
        insights = calculateRevenueForecast(sessions);
        break;
      case 'peak_hours':
        insights = calculatePeakHours(sessions);
        break;
      case 'customer_behavior':
        insights = calculateCustomerBehavior(sessions);
        break;
      default:
        insights = calculateAllMetrics(sessions);
    }

    // Store insights in database
    await supabaseClient
      .from('business_insights')
      .insert({
        client_id: clientId,
        metric_type: metricType || 'all_metrics',
        metric_value: insights,
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString()
      });

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating business intelligence:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateSentimentTrends(sessions: any[]) {
  const sentimentSessions = sessions.filter(s => s.sentiment_score !== null);
  
  const avgSentiment = sentimentSessions.reduce((sum, s) => sum + s.sentiment_score, 0) / sentimentSessions.length || 0;
  
  const sentimentByDay = sentimentSessions.reduce((acc: any, s) => {
    const day = s.created_at.split('T')[0];
    if (!acc[day]) acc[day] = { total: 0, count: 0 };
    acc[day].total += s.sentiment_score;
    acc[day].count += 1;
    return acc;
  }, {});

  const trends = Object.entries(sentimentByDay).map(([day, data]: [string, any]) => ({
    date: day,
    avgSentiment: data.total / data.count,
    callCount: data.count
  }));

  return {
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    trends,
    positive: sentimentSessions.filter(s => s.sentiment_score > 0.3).length,
    neutral: sentimentSessions.filter(s => s.sentiment_score >= -0.3 && s.sentiment_score <= 0.3).length,
    negative: sentimentSessions.filter(s => s.sentiment_score < -0.3).length
  };
}

function calculateIntentAnalysis(sessions: any[]) {
  const intents: any = {};
  
  sessions.forEach(s => {
    if (s.primary_intent) {
      intents[s.primary_intent] = (intents[s.primary_intent] || 0) + 1;
    }
  });

  const total = sessions.length;
  const intentDistribution = Object.entries(intents).map(([intent, count]: [string, any]) => ({
    intent: intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count,
    percentage: Math.round((count / total) * 100)
  }));

  return {
    distribution: intentDistribution,
    topIntent: intentDistribution.sort((a, b) => b.count - a.count)[0]?.intent || 'Unknown',
    totalCalls: total
  };
}

function calculateConversionFunnel(sessions: any[]) {
  const stages = {
    greeting: sessions.filter(s => s.conversation_stage === 'greeting').length,
    qualification: sessions.filter(s => s.conversation_stage === 'qualification').length,
    booking: sessions.filter(s => s.conversation_stage === 'booking').length,
    closing: sessions.filter(s => s.conversation_stage === 'closing').length
  };

  const outcomes = {
    appointment_booked: sessions.filter(s => s.outcome_type === 'appointment_booked').length,
    quote_requested: sessions.filter(s => s.outcome_type === 'quote_requested').length,
    transferred: sessions.filter(s => s.outcome_type === 'transferred_to_agent').length,
    completed: sessions.filter(s => s.outcome_type === 'completed').length,
    no_action: sessions.filter(s => s.outcome_type === 'no_action').length
  };

  const total = sessions.length;
  const conversionRate = total > 0 ? ((outcomes.appointment_booked + outcomes.quote_requested) / total) * 100 : 0;

  return {
    stages,
    outcomes,
    conversionRate: Math.round(conversionRate * 10) / 10,
    totalCalls: total
  };
}

function calculateRevenueForecast(sessions: any[]) {
  const totalRevenue = sessions.reduce((sum, s) => sum + (s.cost_amount || 0), 0);
  const avgCallCost = sessions.length > 0 ? totalRevenue / sessions.length : 0;
  
  // Calculate daily average
  const days = [...new Set(sessions.map(s => s.created_at.split('T')[0]))].length || 1;
  const dailyAvgCalls = sessions.length / days;
  const dailyAvgRevenue = totalRevenue / days;

  // 30-day forecast
  const forecast30Days = dailyAvgRevenue * 30;
  const forecast90Days = dailyAvgRevenue * 90;

  return {
    currentRevenue: Math.round(totalRevenue * 100) / 100,
    avgCallCost: Math.round(avgCallCost * 100) / 100,
    dailyAvgCalls: Math.round(dailyAvgCalls * 10) / 10,
    dailyAvgRevenue: Math.round(dailyAvgRevenue * 100) / 100,
    forecast30Days: Math.round(forecast30Days * 100) / 100,
    forecast90Days: Math.round(forecast90Days * 100) / 100
  };
}

function calculatePeakHours(sessions: any[]) {
  const hourCounts: any = {};
  
  sessions.forEach(s => {
    const hour = new Date(s.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts).sort((a: any, b: any) => b[1] - a[1])[0];
  
  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    calls: hourCounts[hour] || 0
  }));

  return {
    peakHour: peakHour ? `${peakHour[0]}:00 - ${parseInt(peakHour[0]) + 1}:00` : 'N/A',
    peakHourCalls: peakHour ? peakHour[1] : 0,
    hourlyDistribution
  };
}

function calculateCustomerBehavior(sessions: any[]) {
  const avgDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length || 0;
  
  const repeatCallers = sessions.reduce((acc: any, s) => {
    if (s.caller_number) {
      acc[s.caller_number] = (acc[s.caller_number] || 0) + 1;
    }
    return acc;
  }, {});

  const repeatCallersCount = Object.values(repeatCallers).filter((count: any) => count > 1).length;
  const uniqueCallers = Object.keys(repeatCallers).length;

  return {
    avgCallDuration: Math.round(avgDuration / 60 * 10) / 10,
    uniqueCallers,
    repeatCallers: repeatCallersCount,
    repeatRate: uniqueCallers > 0 ? Math.round((repeatCallersCount / uniqueCallers) * 100) : 0
  };
}

function calculateAllMetrics(sessions: any[]) {
  return {
    sentimentTrends: calculateSentimentTrends(sessions),
    intentAnalysis: calculateIntentAnalysis(sessions),
    conversionFunnel: calculateConversionFunnel(sessions),
    revenueForecast: calculateRevenueForecast(sessions),
    peakHours: calculatePeakHours(sessions),
    customerBehavior: calculateCustomerBehavior(sessions)
  };
}
