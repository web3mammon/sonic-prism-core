import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModernButton } from "@/components/ui/modern-button";
import { Badge } from "@/components/ui/badge";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Users,
  Download,
  Phone,
  Mail,
  Calendar,
  Filter,
  Loader2,
  Globe,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Lead {
  lead_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  source: 'phone' | 'website';
  status: 'new' | 'contacted' | 'converted' | 'lost';
  captured_at: string;
}

export default function Leads() {
  const { client, loading: clientLoading } = useCurrentClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch leads
  useEffect(() => {
    async function fetchLeads() {
      if (!client?.client_id) return;

      setLoading(true);
      try {
        let query = supabase
          .from('leads')
          .select('*')
          .eq('client_id', client.client_id)
          .order('captured_at', { ascending: false });

        if (sourceFilter !== 'all') {
          query = query.eq('source', sourceFilter);
        }

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) throw error;
        setLeads(data || []);
      } catch (error) {
        console.error('Error fetching leads:', error);
        toast.error('Failed to load leads');
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, [client?.client_id, sourceFilter, statusFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (leads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    // CSV headers
    const headers = ['Name', 'Email', 'Phone', 'Notes', 'Source', 'Status', 'Captured Date'];

    // CSV rows
    const rows = leads.map(lead => [
      lead.name || '',
      lead.email || '',
      lead.phone || '',
      (lead.notes || '').replace(/"/g, '""'), // Escape quotes
      lead.source,
      lead.status,
      new Date(lead.captured_at).toLocaleString()
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${leads.length} leads to CSV`);
  };

  // Update lead status
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('lead_id', leadId);

      if (error) throw error;

      // Update local state
      setLeads(leads.map(lead =>
        lead.lead_id === leadId ? { ...lead, status: newStatus as any } : lead
      ));

      toast.success('Lead status updated');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead status');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      contacted: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      converted: 'bg-green-500/10 text-green-500 border-green-500/20',
      lost: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };
    return styles[status as keyof typeof styles] || styles.new;
  };

  const getSourceIcon = (source: string) => {
    return source === 'phone' ? <Phone className="h-4 w-4" /> : <Globe className="h-4 w-4" />;
  };

  if (clientLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-2">
          <h1 className="text-5xl font-extralight mb-2">Leads</h1>
          <p className="text-muted-foreground">
            Customer contact information captured from calls and chats
          </p>
        </div>
        <ModernButton onClick={handleExportCSV} disabled={leads.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </ModernButton>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-4"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="phone">Phone Only</SelectItem>
            <SelectItem value="website">Website Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>

        {(sourceFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSourceFilter('all');
              setStatusFilter('all');
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </Button>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          {leads.length} lead{leads.length !== 1 ? 's' : ''}
        </div>
      </motion.div>

      {/* Leads Table */}
      {leads.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-12 text-center"
        >
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No leads captured yet</h3>
          <p className="text-sm text-muted-foreground">
            Leads will appear here when customers provide contact information during calls or chats
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-black/[0.05] dark:border-white/5">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Notes</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Captured</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, index) => (
                  <motion.tr
                    key={lead.lead_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-black/[0.05] dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-medium">{lead.name || <span className="text-muted-foreground italic">No name</span>}</div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {!lead.email && !lead.phone && (
                          <span className="text-sm text-muted-foreground italic">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="text-sm text-muted-foreground truncate">
                        {lead.notes || '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(lead.source)}
                        <span className="text-sm capitalize">{lead.source}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Select
                        value={lead.status}
                        onValueChange={(value) => handleUpdateStatus(lead.lead_id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <Badge className={getStatusBadge(lead.status)}>
                            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.captured_at).toLocaleDateString()}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
