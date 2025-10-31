import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Clock, User, Mail, Phone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import moment from "moment";

interface AppointmentData {
  id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  source: 'phone' | 'website' | 'manual';
  notes: string;
  lead_id?: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: any) => void;
  onDelete?: (id: string) => void;
  selectedDate?: Date;
  selectedSlotStart?: Date;
  selectedSlotEnd?: Date;
  editingAppointment?: any;
  clientId: string;
  userId: string;
}

export default function BookingModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  selectedDate,
  selectedSlotStart,
  selectedSlotEnd,
  editingAppointment,
  clientId,
  userId
}: BookingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [formData, setFormData] = useState<AppointmentData>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    date: selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
    start_time: selectedSlotStart ? moment(selectedSlotStart).format('HH:mm') : "09:00",
    end_time: selectedSlotEnd ? moment(selectedSlotEnd).format('HH:mm') : "10:00",
    duration_minutes: 60,
    status: 'scheduled',
    source: 'manual',
    notes: "",
  });

  // Fetch leads when modal opens
  useEffect(() => {
    async function fetchLeads() {
      if (!isOpen || !clientId) return;

      try {
        const { data, error } = await supabase
          .from('leads')
          .select('lead_id, name, email, phone, status')
          .eq('client_id', clientId)
          .order('captured_at', { ascending: false });

        if (error) throw error;
        setLeads(data || []);
      } catch (error) {
        console.error('Error fetching leads:', error);
      }
    }

    fetchLeads();
  }, [isOpen, clientId]);

  // Update form when editing appointment or when slot is selected
  useEffect(() => {
    if (editingAppointment) {
      setFormData({
        id: editingAppointment.id,
        customer_name: editingAppointment.customer_name || "",
        customer_email: editingAppointment.customer_email || "",
        customer_phone: editingAppointment.customer_phone || "",
        date: moment(editingAppointment.date).format('YYYY-MM-DD'),
        start_time: editingAppointment.start_time,
        end_time: editingAppointment.end_time,
        duration_minutes: editingAppointment.duration_minutes,
        status: editingAppointment.status,
        source: editingAppointment.source,
        notes: editingAppointment.notes || "",
        lead_id: editingAppointment.lead_id,
      });
      setSelectedLeadId(editingAppointment.lead_id || '');
    } else if (selectedDate || selectedSlotStart) {
      setFormData({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        date: selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        start_time: selectedSlotStart ? moment(selectedSlotStart).format('HH:mm') : "09:00",
        end_time: selectedSlotEnd ? moment(selectedSlotEnd).format('HH:mm') : "10:00",
        duration_minutes: selectedSlotStart && selectedSlotEnd
          ? Math.round((selectedSlotEnd.getTime() - selectedSlotStart.getTime()) / (1000 * 60))
          : 60,
        status: 'scheduled',
        source: 'manual',
        notes: "",
      });
      setSelectedLeadId('');
    }
  }, [editingAppointment, selectedDate, selectedSlotStart, selectedSlotEnd]);

  // Handle lead selection
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);

    if (leadId === 'new') {
      // Clear form for new customer
      setFormData(prev => ({
        ...prev,
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        lead_id: undefined,
      }));
    } else if (leadId) {
      // Auto-populate from selected lead
      const lead = leads.find(l => l.lead_id === leadId);
      if (lead) {
        setFormData(prev => ({
          ...prev,
          customer_name: lead.name || "",
          customer_email: lead.email || "",
          customer_phone: lead.phone || "",
          lead_id: lead.lead_id,
        }));
      }
    }
  };

  // Calculate duration when times change
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const start = moment(formData.start_time, 'HH:mm');
      const end = moment(formData.end_time, 'HH:mm');
      const duration = end.diff(start, 'minutes');
      if (duration > 0) {
        setFormData(prev => ({ ...prev, duration_minutes: duration }));
      }
    }
  }, [formData.start_time, formData.end_time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.customer_name || !formData.date || !formData.start_time || !formData.end_time) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Check if end time is after start time
      const start = moment(formData.start_time, 'HH:mm');
      const end = moment(formData.end_time, 'HH:mm');
      if (end.isSameOrBefore(start)) {
        toast({
          title: "Invalid Time Range",
          description: "End time must be after start time",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const appointmentData = {
        client_id: clientId,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_minutes: formData.duration_minutes,
        status: formData.status,
        source: formData.source,
        notes: formData.notes || null,
        lead_id: formData.lead_id || null,
        created_by: userId,
      };

      if (editingAppointment?.id) {
        // Update existing appointment
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', editingAppointment.id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Appointment Updated",
          description: "The appointment has been updated successfully",
        });

        onSave(data);
      } else {
        // Create new appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Appointment Created",
          description: "New appointment has been added to your calendar",
        });

        onSave(data);
      }

      handleClose();
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save appointment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingAppointment?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', editingAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment Deleted",
        description: "The appointment has been removed from your calendar",
      });

      if (onDelete) {
        onDelete(editingAppointment.id);
      }
      handleClose();
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete appointment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      date: moment().format('YYYY-MM-DD'),
      start_time: "09:00",
      end_time: "10:00",
      duration_minutes: 60,
      status: 'scheduled',
      source: 'manual',
      notes: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
          <DialogDescription>
            {editingAppointment
              ? 'Update appointment details below'
              : 'Fill in the details to create a new appointment'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead Selection */}
          <div className="space-y-2">
            <Label htmlFor="lead_selection">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Link to Existing Lead
              </span>
            </Label>
            <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
              <SelectTrigger>
                <SelectValue placeholder="New customer (not linked)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New customer (not linked)</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.lead_id} value={lead.lead_id}>
                    {lead.name || lead.email || lead.phone || 'Unnamed Lead'}
                    {lead.status && ` - ${lead.status}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLeadId && selectedLeadId !== 'new' && (
              <p className="text-xs text-muted-foreground">
                Customer info auto-populated from lead
              </p>
            )}
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customer_name">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Name *
              </span>
            </Label>
            <Input
              id="customer_name"
              placeholder="John Doe"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="customer_email">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </span>
            </Label>
            <Input
              id="customer_email"
              type="email"
              placeholder="john@example.com"
              value={formData.customer_email}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="customer_phone">
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </span>
            </Label>
            <Input
              id="customer_phone"
              type="tel"
              placeholder="+1-555-0123"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Date *
              </span>
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time *
                </span>
              </Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Duration Display */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">
              Duration: <span className="font-medium text-foreground">{formData.duration_minutes} minutes</span>
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={formData.source}
              onValueChange={(value: any) => setFormData({ ...formData, source: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="phone">Phone (AI)</SelectItem>
                <SelectItem value="website">Website (AI)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            {editingAppointment && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editingAppointment ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
