// Re-export the Profile type for convenience
import { Database } from '@/integrations/supabase/types';
export type Profile = Database['public']['Tables']['profiles']['Row'];