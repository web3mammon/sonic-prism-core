import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { VoiceAIClient, CallSession, PhoneNumber, SMSLog } from '@/types/voice-ai';

// Hook for managing Voice AI clients
export const useVoiceAIClients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voice_ai_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching Voice AI clients:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to fetch Voice AI clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createClient = useCallback(async (clientData: any) => {
    try {
      const { data, error } = await supabase
        .from('voice_ai_clients')
        .insert(clientData)
        .select()
        .single();

      if (error) throw error;

      await fetchClients();
      toast({
        title: "Success",
        description: "Voice AI client created successfully"
      });

      return data;
    } catch (err) {
      console.error('Error creating Voice AI client:', err);
      toast({
        title: "Error",
        description: "Failed to create Voice AI client",
        variant: "destructive"
      });
      throw err;
    }
  }, [fetchClients, toast]);

  const updateClient = useCallback(async (clientId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('voice_ai_clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('client_id', clientId);

      if (error) throw error;

      await fetchClients();
      toast({
        title: "Success",
        description: "Voice AI client updated successfully"
      });
    } catch (err) {
      console.error('Error updating Voice AI client:', err);
      toast({
        title: "Error",
        description: "Failed to update Voice AI client",
        variant: "destructive"
      });
      throw err;
    }
  }, [fetchClients, toast]);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('voice_ai_clients')
        .delete()
        .eq('client_id', clientId);

      if (error) throw error;

      await fetchClients();
      toast({
        title: "Success",
        description: "Voice AI client deleted successfully"
      });
    } catch (err) {
      console.error('Error deleting Voice AI client:', err);
      toast({
        title: "Error",
        description: "Failed to delete Voice AI client",
        variant: "destructive"
      });
      throw err;
    }
  }, [fetchClients, toast]);

  const manageClient = useCallback(async (clientId: string, action: string, data?: any) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('voice-ai-manager', {
        body: { action, clientId, ...data }
      });

      if (error) throw error;

      await fetchClients();
      toast({
        title: "Success",
        description: response.message || `Action ${action} completed successfully`
      });

      return response;
    } catch (err) {
      console.error('Error managing Voice AI client:', err);
      toast({
        title: "Error",
        description: `Failed to ${action} Voice AI client`,
        variant: "destructive"
      });
      throw err;
    }
  }, [fetchClients, toast]);

  useEffect(() => {
    fetchClients();

    // Set up real-time subscription
    const subscription = supabase
      .channel('voice-ai-clients')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'voice_ai_clients' }, 
        () => fetchClients()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    manageClient
  };
};

// Hook for managing call sessions
export const useCallSessions = (clientId?: string) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('call_sessions')
        .select('*')
        .order('start_time', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSessions(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching call sessions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchSessions();

    // Set up real-time subscription
    const subscription = supabase
      .channel('call-sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_sessions' }, 
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    fetchSessions
  };
};

// Hook for managing phone numbers
export const usePhoneNumbers = () => {
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPhoneNumbers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('phone_number_pool')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setPhoneNumbers(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPhoneNumber = useCallback(async (phoneData: any) => {
    try {
      const { error } = await supabase
        .from('phone_number_pool')
        .insert(phoneData);

      if (error) throw error;

      await fetchPhoneNumbers();
      toast({
        title: "Success",
        description: "Phone number added successfully"
      });
    } catch (err) {
      console.error('Error adding phone number:', err);
      toast({
        title: "Error",
        description: "Failed to add phone number",
        variant: "destructive"
      });
      throw err;
    }
  }, [fetchPhoneNumbers, toast]);

  const assignPhoneNumber = useCallback(async (phoneId: string, clientId: string) => {
    try {
      const { error } = await supabase
        .from('phone_number_pool')
        .update({
          status: 'assigned',
          assigned_client_id: clientId,
          assigned_at: new Date().toISOString()
        })
        .eq('id', phoneId);

      if (error) throw error;

      await fetchPhoneNumbers();
      toast({
        title: "Success",
        description: "Phone number assigned successfully"
      });
    } catch (err) {
      console.error('Error assigning phone number:', err);
      toast({
        title: "Error",
        description: "Failed to assign phone number",
        variant: "destructive"
      });
      throw err;
    }
  }, [fetchPhoneNumbers, toast]);

  const unassignPhoneNumber = useCallback(async (phoneId: string) => {
    try {
      const { error } = await supabase
        .from('phone_number_pool')
        .update({
          status: 'available',
          assigned_client_id: null,
          assigned_at: null
        })
        .eq('id', phoneId);

      if (error) throw error;

      await fetchPhoneNumbers();
      toast({
        title: "Success",
        description: "Phone number unassigned successfully"
      });
    } catch (err) {
      console.error('Error unassigning phone number:', err);
      toast({
        title: "Error",
        description: "Failed to unassign phone number",
        variant: "destructive"
      });
      throw err;
    }
  }, [fetchPhoneNumbers, toast]);

  useEffect(() => {
    fetchPhoneNumbers();
  }, [fetchPhoneNumbers]);

  return {
    phoneNumbers,
    loading,
    error,
    fetchPhoneNumbers,
    addPhoneNumber,
    assignPhoneNumber,
    unassignPhoneNumber
  };
};

// Hook for SMS management
export const useSMSLogs = (clientId?: string) => {
  const [smsLogs, setSMSLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSMSLogs = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSMSLogs(data || []);
    } catch (err) {
      console.error('Error fetching SMS logs:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const sendSMS = useCallback(async (
    clientId: string, 
    phoneNumber: string, 
    message: string, 
    messageType: string = 'custom'
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('sms-manager', {
        body: {
          action: 'send_sms',
          clientId,
          phoneNumber,
          message,
          messageType
        }
      });

      if (error) throw error;

      await fetchSMSLogs();
      toast({
        title: "Success",
        description: "SMS sent successfully"
      });

      return data;
    } catch (err) {
      console.error('Error sending SMS:', err);
      toast({
        title: "Error",
        description: "Failed to send SMS",
        variant: "destructive"
      });
      throw err;
    }
  }, [fetchSMSLogs, toast]);

  useEffect(() => {
    fetchSMSLogs();
  }, [fetchSMSLogs]);

  return {
    smsLogs,
    loading,
    fetchSMSLogs,
    sendSMS
  };
};