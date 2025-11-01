import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const createClientSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  region: z.string().min(2, 'Region must be at least 2 characters'),
  industry: z.string().min(3, 'Industry must be at least 3 characters'),
  system_prompt: z.string().optional(),
  voice_id: z.string().optional(),
  response_format: z.string().optional()
});

type CreateClientForm = z.infer<typeof createClientSchema>;

interface CreateVoiceAIClientProps {
  onClientCreated: () => void;
}

export const CreateVoiceAIClient: React.FC<CreateVoiceAIClientProps> = ({ 
  onClientCreated 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      business_name: '',
      region: '',
      industry: '',
      system_prompt: 'You are a helpful AI assistant for this business. Be professional and courteous.',
      voice_id: 'alloy',
      response_format: 'text'
    }
  });

  const generateClientId = (businessName: string) => {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 12);
  };

  const onSubmit = async (data: CreateClientForm) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a client",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const clientId = generateClientId(data.business_name);

      const clientConfig = {
        system_prompt: data.system_prompt,
        voice_id: data.voice_id,
        response_format: data.response_format,
        features: {
          sms_enabled: true,
          calendar_integration: true,
          session_memory: true,
          transcript_logging: true
        }
      };

      const { error} = await supabase
        .from('voice_ai_clients')
        .insert({
          user_id: user.id,
          client_id: clientId,
          region: data.region,
          industry: data.industry,
          business_name: data.business_name,
          channel_type: 'phone', // Default to phone (will get 30 trial_minutes)
          status: 'inactive',
          config: clientConfig
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Voice AI client created successfully with 10 free trial calls`
      });

      form.reset();
      setOpen(false);
      onClientCreated();
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create Voice AI client",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Client
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Voice AI Client</DialogTitle>
          <DialogDescription>
            Set up a new Voice AI client for a business. This will create a dedicated
            Voice AI server instance.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="ACME Plumbing" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will be used to generate the client ID
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="au" maxLength={2} {...field} />
                    </FormControl>
                    <FormDescription>2-letter region code</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="plmb" maxLength={4} {...field} />
                    </FormControl>
                    <FormDescription>3-4 letter industry code</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="voice_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voice</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                      <SelectItem value="echo">Echo (Male)</SelectItem>
                      <SelectItem value="fable">Fable (British)</SelectItem>
                      <SelectItem value="onyx">Onyx (Deep)</SelectItem>
                      <SelectItem value="nova">Nova (Female)</SelectItem>
                      <SelectItem value="shimmer">Shimmer (Energetic)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="You are a helpful AI assistant for this business..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This defines how the AI will behave during calls
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Client'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};