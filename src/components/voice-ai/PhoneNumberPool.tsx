import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Plus, PhoneCall, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhoneNumber {
  id: string;
  phone_number: string;
  twilio_sid: string;
  region: string;
  status: string;
  assigned_client_id?: string;
  assigned_at?: string;
  purchase_date: string;
  monthly_cost: number;
  metadata: any;
}

interface VoiceAIClient {
  client_id: string;
  business_name: string;
}

const addPhoneNumberSchema = z.object({
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
  twilio_sid: z.string().min(1, 'Twilio SID is required'),
  region: z.string().min(2, 'Region is required'),
  monthly_cost: z.number().min(0, 'Cost must be positive')
});

type AddPhoneNumberForm = z.infer<typeof addPhoneNumberSchema>;

export const PhoneNumberPool: React.FC = () => {
  const { toast } = useToast();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [clients, setClients] = useState<VoiceAIClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<AddPhoneNumberForm>({
    resolver: zodResolver(addPhoneNumberSchema),
    defaultValues: {
      phone_number: '',
      twilio_sid: '',
      region: 'us',
      monthly_cost: 1.00
    }
  });

  useEffect(() => {
    fetchPhoneNumbers();
    fetchClients();
  }, []);

  const fetchPhoneNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_number_pool')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setPhoneNumbers(data || []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch phone numbers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_ai_clients')
        .select('client_id, business_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const onSubmit = async (data: AddPhoneNumberForm) => {
    try {
      const { error } = await supabase
        .from('phone_number_pool')
        .insert({
          phone_number: data.phone_number,
          twilio_sid: data.twilio_sid,
          region: data.region,
          status: 'available',
          monthly_cost: data.monthly_cost,
          metadata: {}
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Phone number added successfully"
      });

      form.reset();
      setDialogOpen(false);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error adding phone number:', error);
      toast({
        title: "Error",
        description: "Failed to add phone number",
        variant: "destructive"
      });
    }
  };

  const assignPhoneNumber = async (phoneId: string, clientId: string) => {
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

      // Update the client with the phone number
      const phoneNumber = phoneNumbers.find(p => p.id === phoneId);
      if (phoneNumber) {
        await supabase
          .from('voice_ai_clients')
          .update({ phone_number: phoneNumber.phone_number })
          .eq('client_id', clientId);
      }

      toast({
        title: "Success",
        description: "Phone number assigned successfully"
      });

      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error assigning phone number:', error);
      toast({
        title: "Error",
        description: "Failed to assign phone number",
        variant: "destructive"
      });
    }
  };

  const unassignPhoneNumber = async (phoneId: string) => {
    try {
      const phoneNumber = phoneNumbers.find(p => p.id === phoneId);
      
      const { error } = await supabase
        .from('phone_number_pool')
        .update({
          status: 'available',
          assigned_client_id: null,
          assigned_at: null
        })
        .eq('id', phoneId);

      if (error) throw error;

      // Remove phone number from client
      if (phoneNumber?.assigned_client_id) {
        await supabase
          .from('voice_ai_clients')
          .update({ phone_number: null })
          .eq('client_id', phoneNumber.assigned_client_id);
      }

      toast({
        title: "Success",
        description: "Phone number unassigned successfully"
      });

      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error unassigning phone number:', error);
      toast({
        title: "Error",
        description: "Failed to unassign phone number",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatPhoneNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return number;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const availableNumbers = phoneNumbers.filter(p => p.status === 'available');
  const assignedNumbers = phoneNumbers.filter(p => p.status === 'assigned');
  const totalMonthlyCost = phoneNumbers.reduce((sum, p) => sum + p.monthly_cost, 0);

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Phone Number Pool</h3>
          <p className="text-sm text-muted-foreground">
            {phoneNumbers.length} total numbers • ${totalMonthlyCost.toFixed(2)}/month
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Number
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Phone Number</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="twilio_sid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twilio SID</FormLabel>
                      <FormControl>
                        <Input placeholder="PHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="us">United States</SelectItem>
                          <SelectItem value="ca">Canada</SelectItem>
                          <SelectItem value="au">Australia</SelectItem>
                          <SelectItem value="uk">United Kingdom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="monthly_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Cost ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Number</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Available Numbers ({availableNumbers.length})
          </CardTitle>
          <CardDescription>Phone numbers ready to be assigned to clients</CardDescription>
        </CardHeader>
        <CardContent>
          {availableNumbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No available phone numbers</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {availableNumbers.map((number) => (
                <div
                  key={number.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className={getStatusColor(number.status)}>
                      {number.status}
                    </Badge>
                    <div>
                      <p className="font-mono font-medium">{formatPhoneNumber(number.phone_number)}</p>
                      <p className="text-sm text-muted-foreground">{number.region.toUpperCase()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-muted-foreground">
                      ${number.monthly_cost}/month
                    </div>
                    
                    <Select onValueChange={(clientId) => assignPhoneNumber(number.id, clientId)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Assign to client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.client_id} value={client.client_id}>
                            {client.business_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Assigned Numbers ({assignedNumbers.length})
          </CardTitle>
          <CardDescription>Phone numbers currently assigned to clients</CardDescription>
        </CardHeader>
        <CardContent>
          {assignedNumbers.length === 0 ? (
            <div className="text-center py-8">
              <PhoneCall className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No assigned phone numbers</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {assignedNumbers.map((number) => {
                const client = clients.find(c => c.client_id === number.assigned_client_id);
                return (
                  <div
                    key={number.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className={getStatusColor(number.status)}>
                        {number.status}
                      </Badge>
                      <div>
                        <p className="font-mono font-medium">{formatPhoneNumber(number.phone_number)}</p>
                        <p className="text-sm text-muted-foreground">
                          {client?.business_name || number.assigned_client_id}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-muted-foreground">
                        ${number.monthly_cost}/month
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unassignPhoneNumber(number.id)}
                      >
                        Unassign
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};