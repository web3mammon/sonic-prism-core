import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Play, Square, Users, Activity, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VoiceAIClientCard } from './VoiceAIClientCard';
import { CreateVoiceAIClient } from './CreateVoiceAIClient';
import { CallSessionsMonitor } from './CallSessionsMonitor';
import { PhoneNumberPool } from './PhoneNumberPool';

interface VoiceAIClient {
  id: string;
  client_id: string;
  region: string;
  industry: string;
  business_name: string;
  port: number;
  status: string;
  phone_number?: string;
  config: any;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  activeCalls: number;
  todayRevenue: number;
}

export const VoiceAIDashboard = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<VoiceAIClient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    activeCalls: 0,
    todayRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
    fetchStats();
    
    // Set up real-time subscriptions
    const clientsSubscription = supabase
      .channel('voice-ai-clients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'voice_ai_clients' }, 
        () => fetchClients()
      )
      .subscribe();

    const callsSubscription = supabase
      .channel('call-sessions-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_sessions' }, 
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clientsSubscription);
      supabase.removeChannel(callsSubscription);
    };
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_ai_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Voice AI clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total and active clients count
      const { data: clientsData } = await supabase
        .from('voice_ai_clients')
        .select('status');

      const totalClients = clientsData?.length || 0;
      const activeClients = clientsData?.filter(c => c.status === 'active').length || 0;

      // Get active calls count
      const { data: callsData } = await supabase
        .from('call_sessions')
        .select('id')
        .in('status', ['ringing', 'in-progress']);

      const activeCalls = callsData?.length || 0;

      // Get today's revenue
      const today = new Date().toISOString().split('T')[0];
      const { data: revenueData } = await supabase
        .from('call_sessions')
        .select('cost_amount')
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`);

      const todayRevenue = revenueData?.reduce((sum, call) => 
        sum + (parseFloat(String(call.cost_amount)) || 0), 0) || 0;

      setStats({
        totalClients,
        activeClients,
        activeCalls,
        todayRevenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleClientStatusChange = async (clientId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('voice_ai_clients')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Client status updated to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating client status:', error);
      toast({
        title: "Error",
        description: "Failed to update client status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice AI Central HQ</h1>
          <p className="text-muted-foreground">
            Manage and monitor your Voice AI clients
          </p>
        </div>
        <CreateVoiceAIClient onClientCreated={fetchClients} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.todayRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="calls">Live Calls</TabsTrigger>
          <TabsTrigger value="phone-numbers">Phone Numbers</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          {clients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Voice AI Clients</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first Voice AI client to get started
                </p>
                <CreateVoiceAIClient onClientCreated={fetchClients} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {clients.map((client) => (
                <VoiceAIClientCard
                  key={client.id}
                  client={client as any}
                  onStatusChange={handleClientStatusChange}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calls">
          <CallSessionsMonitor />
        </TabsContent>

        <TabsContent value="phone-numbers">
          <PhoneNumberPool />
        </TabsContent>
      </Tabs>
    </div>
  );
};