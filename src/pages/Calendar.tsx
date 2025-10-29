import { useState } from "react";
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar';
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
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const localizer = momentLocalizer(moment);

// Dummy appointment data for visual testing
const dummyAppointments = [
  {
    id: '1',
    title: 'Demo Call - Rachel Green',
    start: new Date(2025, 9, 30, 10, 0),
    end: new Date(2025, 9, 30, 11, 0),
    customer_name: 'Rachel Green',
    customer_email: 'rachel@example.com',
    customer_phone: '+1-555-0123',
    status: 'scheduled',
    notes: 'Interested in premium package',
    source: 'website' as const
  },
  {
    id: '2',
    title: 'Consultation - Ross Geller',
    start: new Date(2025, 9, 30, 14, 0),
    end: new Date(2025, 9, 30, 15, 30),
    customer_name: 'Ross Geller',
    customer_email: 'ross@example.com',
    customer_phone: '+1-555-0456',
    status: 'scheduled',
    notes: 'Technical support inquiry',
    source: 'phone' as const
  },
  {
    id: '3',
    title: 'Follow-up - Monica Bing',
    start: new Date(2025, 9, 31, 9, 0),
    end: new Date(2025, 9, 31, 9, 30),
    customer_name: 'Monica Bing',
    customer_email: 'monica@example.com',
    customer_phone: '+1-555-0789',
    status: 'completed',
    notes: 'Discuss enterprise pricing',
    source: 'website' as const
  },
  {
    id: '4',
    title: 'Discovery Call - Chandler Bing',
    start: new Date(2025, 10, 1, 11, 0),
    end: new Date(2025, 10, 1, 12, 0),
    customer_name: 'Chandler Bing',
    customer_email: 'chandler@example.com',
    customer_phone: '+1-555-0321',
    status: 'scheduled',
    notes: 'New customer onboarding',
    source: 'phone' as const
  }
];

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
  source: 'phone' | 'website';
}

export default function Calendar() {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [appointments] = useState<Appointment[]>(dummyAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleSelectEvent = (event: any) => {
    setSelectedAppointment(event);
    setIsDetailsOpen(true);
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  // Custom event style function
  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3b82f6'; // blue for scheduled

    if (event.status === 'completed') {
      backgroundColor = '#10b981'; // green
    } else if (event.status === 'cancelled') {
      backgroundColor = '#ef4444'; // red
    } else if (event.status === 'no-show') {
      backgroundColor = '#f59e0b'; // orange
    }

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

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-light">Calendar</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your AI-booked appointments
              </p>
            </div>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-light mt-1">{appointments.length}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <CalendarIcon className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
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

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
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

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-light mt-1">
                {appointments.filter(a =>
                  a.start.getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CalendarIcon className="h-5 w-5 text-purple-500" />
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
          className="lg:col-span-3 rounded-2xl border border-white/8 bg-white/[0.02] p-6 calendar-container"
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
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
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
                    className="p-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer"
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
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <h3 className="font-medium mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
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
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
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
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedAppointment.customer_email}</p>
                </div>
              </div>
            )}

            {selectedAppointment?.customer_phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{selectedAppointment.customer_phone}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedAppointment?.notes && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
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
              <Button variant="outline" className="flex-1" size="sm">
                Reschedule
              </Button>
              <Button variant="outline" className="flex-1" size="sm">
                Edit
              </Button>
              <Button variant="destructive" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Calendar Styles */}
      <style>{`
        .calendar-container .rbc-calendar {
          font-family: inherit;
          color: inherit;
        }

        .calendar-container .rbc-header {
          padding: 12px 6px;
          font-weight: 500;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .calendar-container .rbc-month-view {
          border: none;
        }

        .calendar-container .rbc-month-row {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .calendar-container .rbc-day-bg {
          border-left: 1px solid rgba(255, 255, 255, 0.05);
        }

        .calendar-container .rbc-today {
          background-color: rgba(59, 130, 246, 0.1);
        }

        .calendar-container .rbc-off-range-bg {
          background-color: rgba(255, 255, 255, 0.01);
        }

        .calendar-container .rbc-date-cell {
          padding: 8px;
          text-align: right;
        }

        .calendar-container .rbc-button-link {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }

        .calendar-container .rbc-today .rbc-button-link {
          color: rgb(59, 130, 246);
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
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          background-color: rgba(255, 255, 255, 0.02);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .calendar-container .rbc-toolbar button:hover {
          background-color: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .calendar-container .rbc-toolbar button.rbc-active {
          background-color: rgb(59, 130, 246);
          border-color: rgb(59, 130, 246);
          color: white;
        }

        .calendar-container .rbc-toolbar-label {
          font-size: 18px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .calendar-container .rbc-time-view,
        .calendar-container .rbc-time-header {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .calendar-container .rbc-time-content {
          border-top: none;
        }

        .calendar-container .rbc-time-slot {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .calendar-container .rbc-timeslot-group {
          border-left: 1px solid rgba(255, 255, 255, 0.08);
        }

        .calendar-container .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid rgba(255, 255, 255, 0.03);
        }

        .calendar-container .rbc-current-time-indicator {
          background-color: rgb(59, 130, 246);
        }
      `}</style>
    </div>
  );
}
