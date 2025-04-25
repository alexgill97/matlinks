'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, dateFnsLocalizer, EventProps } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Define the structure of the data fetched from Supabase
interface ClassSchedule {
  id: string;
  day_of_week: number; // sunday=0, monday=1, ...
  start_time: string; // "HH:mm:ss"
  end_time: string;   // "HH:mm:ss"
  class_type_id: string;
  location_id: string;
  instructor_id: string;
  created_at: string;
  class_types: { // Nested object, not array
    name: string | null;
    color: string | null;
  } | null;
  locations: { // Nested object, not array
    name: string | null;
  } | null;
  user_profiles: { // Nested object, not array
    full_name: string | null;
  } | null;
}

interface ClassType {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: ClassSchedule; // Use ClassSchedule type
  color?: string;
}

// Setup the localizer by providing the functions we want `react-big-calendar` to use
const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales, // Use defined locales object
});

// Helper function to calculate the date for a specific day of the week within the target week
function getDateForDayOfWeek(targetDate: Date, dayOfWeek: number): Date {
  const currentDayOfWeek = getDay(targetDate); // 0 for Sunday, 1 for Monday, etc.
  const difference = dayOfWeek - currentDayOfWeek;
  const newDate = new Date(targetDate);
  newDate.setDate(targetDate.getDate() + difference);
  return newDate;
}

// Function to transform schedule rules into calendar events for a given week
function mapSchedulesToEvents(schedules: ClassSchedule[], classTypes: { [id: string]: ClassType }, weekStartDate: Date): CalendarEvent[] {
  return schedules.reduce((acc, schedule) => {
    const eventDate = getDateForDayOfWeek(weekStartDate, schedule.day_of_week);

    // Ensure start_time and end_time are valid before parsing
    if (!schedule.start_time || !schedule.end_time) {
        console.warn(`Schedule ${schedule.id} has invalid time, skipping.`);
        return acc;
    }

    try {
        const startTime = parse(schedule.start_time, 'HH:mm:ss', eventDate);
        const endTime = parse(schedule.end_time, 'HH:mm:ss', eventDate);

        // Combine date with parsed time
        const eventStart = new Date(eventDate);
        eventStart.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());

        const eventEnd = new Date(eventDate);
        eventEnd.setHours(endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());

        // Handle cases where end time is on the next day (e.g., ends past midnight)
        if (eventEnd <= eventStart) {
            eventEnd.setDate(eventEnd.getDate() + 1);
        }

        const classType = schedule.class_type_id ? classTypes[schedule.class_type_id] : null;

        acc.push({
            title: `${classType?.name || 'Class'} @ ${schedule.locations?.name || 'Location'} w/ ${schedule.user_profiles?.full_name || 'Instructor'}`,
            start: eventStart,
            end: eventEnd,
            allDay: false,
            resource: schedule, // Store original schedule data
            color: classType?.color || '#3174ad' // Use class color or default
        });
    } catch (error) {
        console.error(`Error parsing time for schedule ${schedule.id}:`, error);
        // Skip this event if time parsing fails
    }

    return acc;
  }, [] as CalendarEvent[]);
}

function EventComponent({ event }: EventProps<CalendarEvent>) {
  return (
    <div style={{ backgroundColor: event.color, borderRadius: '3px', padding: '2px 4px', color: 'white', height: '100%', fontSize: '0.8em' }}>
      <strong>{event.title}</strong>
      {/* Optionally add more details: */}
      {/* <div>{format(event.start, 'p')} - {format(event.end, 'p')}</div> */}
    </div>
  );
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [classTypes, setClassTypes] = useState<{ [id: string]: ClassType }>({});
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Start week on Monday
  const router = useRouter();
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch schedule rules
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('class_schedules')
          .select('*, class_types(name, color), locations(name), user_profiles(full_name)'); // Ensure nested selects match ClassSchedule type

        if (scheduleError) throw scheduleError;
        if (!scheduleData) throw new Error('No schedule data found.');

        // Fetch class types for coloring/naming
        const { data: classTypeData, error: classTypeError } = await supabase
          .from('class_types')
          .select('*');

        if (classTypeError) throw classTypeError;
        if (!classTypeData) throw new Error('No class type data found.');

        const typesMap = classTypeData.reduce((acc, type) => {
          acc[type.id] = type;
          return acc;
        }, {} as { [id: string]: ClassType });

        setSchedules(scheduleData); // Should now match ClassSchedule[]
        setClassTypes(typesMap);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching schedule data:", err);
        setError(err.message || 'Failed to fetch schedule data. Please try again.');
        setSchedules([]); // Clear schedules on error
        setClassTypes({});
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]); // Added supabase to dependency array

  // Recalculate events when schedules, class types, or the current date (week) changes
  useEffect(() => {
    if (schedules.length > 0 && Object.keys(classTypes).length > 0) {
      const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Ensure week starts on Monday
      const newEvents = mapSchedulesToEvents(schedules, classTypes, weekStartDate);
      setEvents(newEvents);
    } else {
        setEvents([]); // Clear events if no schedules/types
    }
  }, [schedules, classTypes, currentDate]);

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(startOfWeek(newDate, { weekStartsOn: 1 })); // Navigate week by week, starting Monday
  };

  if (loading) {
    return <div>Loading schedule...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Class Schedule</h1>
        <Link href="/admin/schedule/new" passHref>
          <Button variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Schedule Rule
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 800 }}
        date={currentDate}
        onNavigate={handleNavigate}
        view={'week'} // Keep view fixed to 'week'
        views={['week']} // Only allow 'week' view
        step={30} // 30-minute intervals
        timeslots={2} // 2 slots per hour = 30 min
        onSelectEvent={(event) => {
          if (event.resource?.id) {
            router.push(`/admin/schedule/${event.resource.id}/edit`);
          }
          console.log('Selected event:', event);
        }}
        components={{
          event: EventComponent,
        }}
        eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.color || '#3174ad', // Use event's color property
              borderRadius: '3px',
              opacity: 0.8,
              color: 'white',
              border: '0px',
              display: 'block',
            },
          })}
        dayLayoutAlgorithm="no-overlap" // Prevent events from overlapping horizontally
        min={new Date(0, 0, 0, 6, 0, 0)} // Start day at 6:00 AM
        max={new Date(0, 0, 0, 22, 0, 0)} // End day at 10:00 PM
        formats={{
            timeGutterFormat: 'ha', // Format time gutter (e.g., 6am)
            eventTimeRangeFormat: ({ start, end }, culture, local) =>
              `${local?.format(start, 'p', culture)} - ${local?.format(end, 'p', culture)}`, // Format time on events
            dayFormat: 'EEE M/d', // Format day headers (e.g., Mon 7/15)
          }}
      />
    </div>
  );
} 