import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getExchangeRates, calculateCallCost, formatCurrency } from "@/lib/currency";
import { CallDetailModal } from "@/components/CallDetailModal";
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
import { Search, Download, Eye, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";

export default function CallData() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [callData, setCallData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState({});
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { client } = useCurrentClient();
  const { profile } = useAuth();
  const { region } = useTenant();

  // Load exchange rates on component mount
  useEffect(() => {
    async function loadExchangeRates() {
      const rates = await getExchangeRates();
      setExchangeRates(rates);
    }
    loadExchangeRates();
  }, []);

  // Fetch real call data from Supabase
  useEffect(() => {
    async function fetchCallData() {
      if (!client?.client_id) return;

      try {
        setLoading(true);

        // Build query with optional date filtering
        let query = supabase
          .from('call_sessions')
          .select('call_sid, caller_number, status, start_time, end_time, duration_seconds, cost_amount, intent, transcript_summary, metadata, created_at')
          .eq('client_id', client.client_id);

        // Add date range filtering if specified
        if (dateRange.from) {
          query = query.gte('start_time', dateRange.from.toISOString());
        }
        if (dateRange.to) {
          query = query.lte('start_time', dateRange.to.toISOString());
        }

        // Add status filtering if not "all"
        if (statusFilter !== "all") {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query.order('start_time', { ascending: false });

        if (error) {
          console.error('Error fetching call data:', error);
          return;
        }

        // Get call cost for this region
        const callCostInfo = calculateCallCost(region, exchangeRates);

        // Transform data to match UI format (SMB-focused)
        const transformedData = data?.map((call: any) => {
          // Calculate cost: $2 USD base, converted to local currency for completed calls
          let displayCost = "Free";
          if (call.status === 'completed' && call.duration_seconds > 0) {
            displayCost = formatCurrency(callCostInfo.amount, callCostInfo.currency);
          }

          return {
            id: call.call_sid,
            date: new Date(call.start_time).toLocaleString(),
            phoneNumber: call.caller_number || 'Unknown',
            duration: call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}` : 'N/A',
            status: call.status,
            intent: call.intent || 'General Inquiry', // Now using real DB column
            cost: displayCost,
            rawData: call
          };
        }) || [];

        setCallData(transformedData);
      } catch (error) {
        console.error('Error fetching calls:', error);
      } finally {
        setLoading(false);
      }
    }

    if (Object.keys(exchangeRates).length > 0) {
      fetchCallData();
    }
  }, [client?.client_id, statusFilter, dateRange, exchangeRates, region]);

  const filteredData = callData.filter(call => {
    const matchesSearch = call.phoneNumber.includes(searchTerm) ||
                         call.intent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         call.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch; // Status filtering now happens in the database query
  });

  // Export to CSV functionality
  const exportToCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Call ID', 'Date & Time', 'Phone Number', 'Duration', 'Status', 'Intent', 'Cost'];
    const csvData = [
      headers.join(','),
      ...filteredData.map(call => [
        call.id,
        `"${call.date}"`,
        call.phoneNumber,
        call.duration,
        call.status,
        `"${call.intent}"`,
        `"${call.cost}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `call-data-${client?.business_name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "in-progress":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };


  return (
    <div className="space-y-6 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <div className="space-y-2">
        <h1 className="text-5xl font-extralight mb-2">Call Data</h1>
        <p className="text-muted-foreground">
          View and analyze all incoming calls handled by your AI agent
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="font-extralight">Call History</CardTitle>
          <CardDescription>
            Search and filter through your call records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number, intent, or call ID..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="ringing">Ringing</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
                    ) : (
                      format(dateRange.from, "MMM dd, yyyy")
                    )
                  ) : (
                    "Date Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange?.from && dateRange?.to ? dateRange as any : undefined}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={2}
                />
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setDateRange({})}
                  >
                    Clear dates
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Call Data Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-medium">{call.id}</TableCell>
                    <TableCell className="text-sm">{call.date}</TableCell>
                    <TableCell>{call.phoneNumber}</TableCell>
                    <TableCell>{call.duration}</TableCell>
                    <TableCell>{getStatusBadge(call.status)}</TableCell>
                    <TableCell>{call.intent}</TableCell>
                    <TableCell>{call.cost}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="View call details"
                        onClick={() => {
                          setSelectedCall(call);
                          setModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No calls found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>

      <CallDetailModal 
        call={selectedCall}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}