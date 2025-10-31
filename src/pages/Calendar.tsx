import { useState, useEffect } from "react";
import { Calendar as BigCalendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  X,
  Loader2,
  CheckCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { toast } from "sonner";
import BookingModal from "@/components/BookingModal";

const localizer = momentLocalizer(moment);

interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes: string;
  source: 'phone' | 'website' | 'manual';
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  lead_id?: string;
  lead?: {
    lead_id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    source: string;
  } | null;
}

export default function Calendar() {
  const { client, loading: clientLoading } = useCurrentClient();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start?: Date; end?: Date; date?: Date }>({});

  // Fetch appointments from Supabase
  useEffect(() => {
    async function fetchAppointments() {
      if (!client?.client_id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('client_id', client.client_id)
          .order('date', { ascending: true });

        if (error) throw error;

        // Fetch lead data for appointments with lead_id
        const appointmentsWithLeads = await Promise.all(
          (data || []).map(async (apt) => {
            let leadData = null;

            if (apt.lead_id) {
              const { data: lead } = await supabase
                .from('leads')
                .select('lead_id, name, email, phone, status, source')
                .eq('lead_id', apt.lead_id)
                .single();

              leadData = lead;
            }

            return {
              id: apt.id,
              title: `${apt.customer_name}`,
              start: new Date(`${apt.date}T${apt.start_time}`),
              end: new Date(`${apt.date}T${apt.end_time}`),
              customer_name: apt.customer_name,
              customer_email: apt.customer_email || '',
              customer_phone: apt.customer_phone || '',
              status: apt.status as 'scheduled' | 'completed' | 'cancelled' | 'no-show',
              notes: apt.notes || '',
              source: apt.source as 'phone' | 'website' | 'manual',
              date: apt.date,
              start_time: apt.start_time,
              end_time: apt.end_time,
              duration_minutes: apt.duration_minutes,
              lead_id: apt.lead_id,
              lead: leadData,
            };
          })
        );

        setAppointments(appointmentsWithLeads);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Failed to load appointments');
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [client?.client_id]);

  const handleSelectEvent = (event: any) => {
    setSelectedAppointment(event);
    setIsDetailsOpen(true);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end,
      date: slotInfo.start
    });
    setIsBookingModalOpen(true);
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleNewAppointment = () => {
    setSelectedAppointment(null);
    setSelectedSlot({ date: new Date() });
    setIsBookingModalOpen(true);
  };

  const handleEditAppointment = () => {
    setIsDetailsOpen(false);
    setIsBookingModalOpen(true);
  };

  const handleSaveAppointment = (newAppointment: any) => {
    // Transform and add/update in state
    const transformed = {
      id: newAppointment.id,
      title: `${newAppointment.customer_name}`,
      start: new Date(`${newAppointment.date}T${newAppointment.start_time}`),
      end: new Date(`${newAppointment.date}T${newAppointment.end_time}`),
      customer_name: newAppointment.customer_name,
      customer_email: newAppointment.customer_email || '',
      customer_phone: newAppointment.customer_phone || '',
      status: newAppointment.status,
      notes: newAppointment.notes || '',
      source: newAppointment.source,
      date: newAppointment.date,
      start_time: newAppointment.start_time,
      end_time: newAppointment.end_time,
      duration_minutes: newAppointment.duration_minutes,
      lead_id: newAppointment.lead_id,
    };

    setAppointments(prev => {
      const existingIndex = prev.findIndex(a => a.id === transformed.id);
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = transformed;
        return updated;
      } else {
        // Add new
        return [...prev, transformed];
      }
    });
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const handleMarkComplete = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast.success('Appointment marked as completed');

      // Update in state
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === selectedAppointment.id
            ? { ...apt, status: 'completed' as const }
            : apt
        )
      );
      setIsDetailsOpen(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const handleViewToday = () => {
    setDate(new Date());
  };

  // Custom event style function - uses red/primary color scheme
  const eventStyleGetter = (event: any) => {
    // All appointments use the same red/primary color tone for simplicity
    const backgroundColor = 'hsl(var(--primary))';

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '13px',
        padding: '4px 6px'
      }
    };
  };

  const upcomingAppointments = appointments
    .filter(apt => apt.start >= new Date() && apt.status === 'scheduled')
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 3);

  if (clientLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 font-manrope relative">
      {/* Dotted background pattern */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-2">
          <h1 className="text-5xl font-extralight mb-2">Calendar</h1>
          <p className="text-muted-foreground">
            Manage your AI-booked appointments
          </p>
        </div>
        <Button className="gap-2" onClick={handleNewAppointment}>
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-light mt-1">{appointments.length}</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-light mt-1">
                {appointments.filter(a => a.status === 'scheduled').length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-light mt-1">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <User className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-light mt-1">
                {appointments.filter(a =>
                  a.start.getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 calendar-container"
        >
          <BigCalendar
            localizer={localizer}
            events={appointments}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 700 }}
            view={view}
            onView={handleViewChange}
            date={date}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
          />
        </motion.div>

        {/* Upcoming Appointments Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          {/* Upcoming Section */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-medium mb-4">Upcoming</h3>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming appointments
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors cursor-pointer"
                    onClick={() => handleSelectEvent(apt)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{apt.customer_name}</p>
                      <Badge variant={apt.source === 'phone' ? 'default' : 'secondary'} className="text-xs">
                        {apt.source}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {moment(apt.start).format('MMM DD, h:mm A')}
                      </span>
                    </div>
                    {apt.notes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-medium mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                size="sm"
                onClick={handleNewAppointment}
              >
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                size="sm"
                onClick={handleViewToday}
              >
                <CalendarIcon className="h-4 w-4" />
                View Today
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-1">
                  {selectedAppointment?.customer_name}
                </DialogTitle>
                <DialogDescription>
                  {selectedAppointment && moment(selectedAppointment.start).format('MMMM DD, YYYY at h:mm A')}
                </DialogDescription>
              </div>
              <Badge
                variant={
                  selectedAppointment?.status === 'scheduled' ? 'default' :
                  selectedAppointment?.status === 'completed' ? 'default' :
                  'destructive'
                }
                className={
                  selectedAppointment?.status === 'completed' ? 'bg-green-500' :
                  selectedAppointment?.status === 'cancelled' ? 'bg-red-500' :
                  selectedAppointment?.status === 'no-show' ? 'bg-orange-500' :
                  ''
                }
              >
                {selectedAppointment?.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Duration */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">
                  {selectedAppointment &&
                    `${Math.round((selectedAppointment.end.getTime() - selectedAppointment.start.getTime()) / (1000 * 60))} minutes`
                  }
                </p>
              </div>
            </div>

            {/* Contact Information */}
            {selectedAppointment?.customer_email && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedAppointment.customer_email}</p>
                </div>
              </div>
            )}

            {selectedAppointment?.customer_phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{selectedAppointment.customer_phone}</p>
                </div>
              </div>
            )}

            {/* Lead Information */}
            {selectedAppointment?.lead && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Linked Lead
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium">{selectedAppointment.lead.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedAppointment.lead.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Source:</span>
                    <span className="text-sm capitalize">{selectedAppointment.lead.source}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedAppointment?.notes && (
              <div className="p-3 rounded-lg bg-card border border-border">
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm">{selectedAppointment.notes}</p>
              </div>
            )}

            {/* Source */}
            <div className="flex items-center gap-2">
              <Badge variant={selectedAppointment?.source === 'phone' ? 'default' : 'secondary'}>
                {selectedAppointment?.source}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Booked via {selectedAppointment?.source}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {selectedAppointment?.status === 'scheduled' && (
                <Button
                  variant="outline"
                  className="flex-1"
                  size="sm"
                  onClick={handleMarkComplete}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                size="sm"
                onClick={handleEditAppointment}
              >
                Edit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedAppointment(null);
          setSelectedSlot({});
        }}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        selectedDate={selectedSlot.date}
        selectedSlotStart={selectedSlot.start}
        selectedSlotEnd={selectedSlot.end}
        editingAppointment={selectedAppointment}
        clientId={client.client_id}
        userId={client.user_id}
      />

      {/* Custom Calendar Styles */}
      <style>{`
        .calendar-container .rbc-calendar {
          font-family: inherit;
          color: hsl(var(--foreground));
        }

        .calendar-container .rbc-header {
          padding: 12px 6px;
          font-weight: 500;
          font-size: 14px;
          color: hsl(var(--muted-foreground));
          border-bottom: 1px solid hsl(var(--border));
        }

        /* Week/Day view - Date headers with better spacing */
        .calendar-container .rbc-time-header-cell .rbc-header {
          padding: 16px 6px 36px 6px !important;
          font-size: 13px;
        }

        .calendar-container .rbc-allday-cell .rbc-header {
          padding-bottom: 36px !important;
        }

        .calendar-container .rbc-month-view {
          border: none;
        }

        .calendar-container .rbc-month-row {
          border: none;
          border-top: 1px solid hsl(var(--border) / 0.5);
        }

        .calendar-container .rbc-day-bg {
          border-left: 1px solid hsl(var(--border) / 0.5);
        }

        .calendar-container .rbc-today {
          background-color: hsl(var(--primary) / 0.1);
        }

        .calendar-container .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.2);
        }

        .calendar-container .rbc-date-cell {
          padding: 8px;
          text-align: right;
        }

        .calendar-container .rbc-button-link {
          color: hsl(var(--foreground));
          font-size: 14px;
        }

        .calendar-container .rbc-today .rbc-button-link {
          color: hsl(var(--primary));
          font-weight: 600;
        }

        .calendar-container .rbc-event {
          padding: 4px 6px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .calendar-container .rbc-event:hover {
          opacity: 1 !important;
        }

        .calendar-container .rbc-toolbar {
          padding: 16px 0;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .calendar-container .rbc-toolbar button {
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          background-color: hsl(var(--card));
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .calendar-container .rbc-toolbar button:hover {
          background-color: hsl(var(--accent));
          border-color: hsl(var(--border));
        }

        .calendar-container .rbc-toolbar button.rbc-active {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        .calendar-container .rbc-toolbar-label {
          font-size: 18px;
          font-weight: 500;
          color: hsl(var(--foreground));
        }

        .calendar-container .rbc-time-view,
        .calendar-container .rbc-time-header {
          border: none;
          border-top: 1px solid hsl(var(--border) / 0.5);
        }

        .calendar-container .rbc-time-content {
          border-top: none;
        }

        /* Time labels - smaller, refined font */
        .calendar-container .rbc-time-slot {
          border-top: 1px solid hsl(var(--border) / 0.5);
        }

        .calendar-container .rbc-label {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
          padding: 0 8px;
        }

        .calendar-container .rbc-timeslot-group {
          border-left: 1px solid hsl(var(--border) / 0.5);
        }

        .rbc-timeslot-group {
          opacity: 0.3;
        }

        .calendar-container .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid hsl(var(--border) / 0.5);
        }

        .calendar-container .rbc-current-time-indicator {
          background-color: hsl(var(--primary));
        }

        .calendar-container .rbc-time-header-content {
          border-left: 1px solid hsl(var(--border) / 0.5);
        }

        .calendar-container .rbc-time-content > * + * > * {
          border-left: 1px solid hsl(var(--border) / 0.5);
        }

        .calendar-container .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid hsl(var(--border) / 0.5);
        }

        .calendar-container .rbc-header + .rbc-header {
          border-left: 1px solid hsl(var(--border) / 0.5);
        }
      `}</style>
    </div>
  );
}
