import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModernButton } from "@/components/ui/modern-button";
import { Badge } from "@/components/ui/badge";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Search, Download, Eye, Calendar, Filter, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function ChatData() {
  const [searchTerm, setSearchTerm] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [chatData, setChatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { client } = useCurrentClient();
  const { profile } = useAuth();
  const { region } = useTenant();

  // Fetch real chat data from Supabase
  useEffect(() => {
    async function fetchChatData() {
      if (!client?.client_id) return;

      try {
        setLoading(true);

        // Build query with optional date filtering
        let query = supabase
          .from('chat_sessions')
          .select('chat_id, visitor_name, visitor_email, status, start_time, end_time, duration_seconds, message_count, outcome_type, intent, transcript_summary, sentiment_score, metadata, created_at')
          .eq('client_id', client.client_id);

        // Add date range filtering if specified
        if (dateRange.from) {
          query = query.gte('start_time', dateRange.from.toISOString());
        }
        if (dateRange.to) {
          query = query.lte('start_time', dateRange.to.toISOString());
        }

        // Add outcome filtering if not "all"
        if (outcomeFilter !== "all") {
          query = query.eq('outcome_type', outcomeFilter);
        }

        const { data, error } = await query.order('start_time', { ascending: false });

        if (error) {
          console.error('Error fetching chat data:', error);
          return;
        }

        // Transform data to match UI format
        const transformedData = data?.map((chat: any) => {
          return {
            id: chat.chat_id,
            date: new Date(chat.start_time).toLocaleString(),
            visitorName: chat.visitor_name || 'Anonymous',
            visitorEmail: chat.visitor_email || 'N/A',
            duration: chat.duration_seconds ? `${Math.floor(chat.duration_seconds / 60)}:${(chat.duration_seconds % 60).toString().padStart(2, '0')}` : 'N/A',
            messageCount: chat.message_count || 0,
            status: chat.status,
            outcome: chat.outcome_type || 'Unknown',
            intent: chat.intent || 'General Inquiry',
            sentiment: chat.sentiment_score || 0,
            rawData: chat
          };
        }) || [];

        setChatData(transformedData);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchChatData();
  }, [client?.client_id, outcomeFilter, dateRange]);

  const filteredData = chatData.filter(chat => {
    const matchesSearch = chat.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.visitorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.intent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Export to CSV functionality
  const exportToCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Chat ID', 'Date & Time', 'Visitor Name', 'Email', 'Duration', 'Messages', 'Outcome', 'Intent', 'Sentiment'];
    const csvData = [
      headers.join(','),
      ...filteredData.map(chat => [
        chat.id,
        `"${chat.date}"`,
        `"${chat.visitorName}"`,
        chat.visitorEmail,
        chat.duration,
        chat.messageCount,
        `"${chat.outcome}"`,
        `"${chat.intent}"`,
        chat.sentiment
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `chat-data-${client?.business_name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case "booked":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Booked</Badge>;
      case "info_provided":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Info Provided</Badge>;
      case "abandoned":
        return <Badge variant="destructive">Abandoned</Badge>;
      case "transferred":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">Transferred</Badge>;
      default:
        return <Badge variant="secondary">{outcome}</Badge>;
    }
  };

  const getSentimentBadge = (score: number) => {
    if (score >= 0.5) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Positive</Badge>;
    } else if (score >= -0.5) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">Neutral</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Negative</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <h1 className="text-5xl font-extralight mb-2">Chat Data</h1>
        <p className="text-muted-foreground">
          View and analyze all website chat conversations handled by your AI agent
        </p>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-extralight">Chat History</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Search and filter through your website chat conversations
          </p>
        </div>
        <div>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by visitor name, email, intent, or chat ID..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="info_provided">Info Provided</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-56 justify-start text-left">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, yyyy")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange(range || {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <ModernButton
              variant="outline"
              onClick={exportToCSV}
              disabled={filteredData.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </ModernButton>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No chat sessions found</p>
            <p className="text-sm mt-2">Chat conversations will appear here once visitors start using your website widget</p>
          </div>
        ) : (
          <div className="rounded-xl border border-black/[0.08] dark:border-white/8 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Sentiment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((chat) => (
                  <TableRow key={chat.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer">
                    <TableCell className="font-medium">{chat.date}</TableCell>
                    <TableCell>{chat.visitorName}</TableCell>
                    <TableCell className="text-muted-foreground">{chat.visitorEmail}</TableCell>
                    <TableCell>{chat.duration}</TableCell>
                    <TableCell>{chat.messageCount}</TableCell>
                    <TableCell>{getOutcomeBadge(chat.outcome)}</TableCell>
                    <TableCell className="text-muted-foreground">{chat.intent}</TableCell>
                    <TableCell>{getSentimentBadge(chat.sentiment)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Results count */}
        {!loading && filteredData.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredData.length} chat{filteredData.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </motion.div>
    </div>
  );
}
