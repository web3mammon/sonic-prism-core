import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BusinessHours {
  monday?: { open?: string; close?: string; closed?: boolean };
  tuesday?: { open?: string; close?: string; closed?: boolean };
  wednesday?: { open?: string; close?: string; closed?: boolean };
  thursday?: { open?: string; close?: string; closed?: boolean };
  friday?: { open?: string; close?: string; closed?: boolean };
  saturday?: { open?: string; close?: string; closed?: boolean };
  sunday?: { open?: string; close?: string; closed?: boolean };
}

interface BusinessHoursEditorProps {
  value: BusinessHours;
  timezone: string;
  onChange: (hours: BusinessHours, timezone: string) => void;
  isEditing: boolean;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT)' },
];

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export function BusinessHoursEditor({ value, timezone, onChange, isEditing }: BusinessHoursEditorProps) {
  const handleDayChange = (day: string, field: 'open' | 'close' | 'closed', fieldValue: string | boolean) => {
    const newHours = { ...value };
    if (!newHours[day as keyof BusinessHours]) {
      newHours[day as keyof BusinessHours] = {};
    }

    if (field === 'closed') {
      newHours[day as keyof BusinessHours]!.closed = fieldValue as boolean;
      if (fieldValue) {
        // Clear open/close times when marking as closed
        delete newHours[day as keyof BusinessHours]!.open;
        delete newHours[day as keyof BusinessHours]!.close;
      }
    } else {
      newHours[day as keyof BusinessHours]![field] = fieldValue as string;
    }

    onChange(newHours, timezone);
  };

  const handleTimezoneChange = (newTimezone: string) => {
    onChange(value, newTimezone);
  };

  const formatHoursDisplay = (dayHours?: { open?: string; close?: string; closed?: boolean }) => {
    if (!dayHours || dayHours.closed) return 'Closed';
    if (dayHours.open && dayHours.close) {
      return `${dayHours.open} - ${dayHours.close}`;
    }
    return 'Not set';
  };

  if (!isEditing) {
    // Display mode
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Timezone</Label>
          <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
            {TIMEZONES.find(tz => tz.value === timezone)?.label || timezone || 'Not set'}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Weekly Schedule</Label>
          <div className="space-y-1">
            {DAYS.map(({ key, label }) => {
              const dayHours = value[key as keyof BusinessHours];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]"
                >
                  <span className="text-sm font-medium w-28">{label}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatHoursDisplay(dayHours)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select value={timezone} onValueChange={handleTimezoneChange}>
          <SelectTrigger id="timezone">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Weekly Schedule</Label>
        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const dayHours = value[key as keyof BusinessHours] || { closed: false };
            const isClosed = dayHours.closed === true;

            return (
              <div
                key={key}
                className="p-4 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${key}-closed`} className="text-sm text-muted-foreground">
                      Closed
                    </Label>
                    <Switch
                      id={`${key}-closed`}
                      checked={isClosed}
                      onCheckedChange={(checked) => handleDayChange(key, 'closed', checked)}
                    />
                  </div>
                </div>

                {!isClosed && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`${key}-open`} className="text-xs text-muted-foreground">
                        Opens
                      </Label>
                      <Input
                        id={`${key}-open`}
                        type="time"
                        value={dayHours.open || ''}
                        onChange={(e) => handleDayChange(key, 'open', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${key}-close`} className="text-xs text-muted-foreground">
                        Closes
                      </Label>
                      <Input
                        id={`${key}-close`}
                        type="time"
                        value={dayHours.close || ''}
                        onChange={(e) => handleDayChange(key, 'close', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
