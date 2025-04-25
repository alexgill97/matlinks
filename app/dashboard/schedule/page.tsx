'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, dateFnsLocalizer, Components, Event as CalendarLibEvent } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar as CalendarIcon, Clock, MapPin, User } from 'lucide-react'

// Set up the localizer for the calendar
const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

// Define the structure of the data fetched from Supabase
interface ClassSchedule {
  id: string;
  day_of_week: number; // sunday=0, monday=1, ...
  start_time: string; // "HH:mm:ss"
  end_time: string;   // "HH:mm:ss"
  class_type_id: string;
  location_id: string;
  instructor_id: string;
  class_types: {
    name: string | null;
    color: string | null;
  } | null;
  locations: {
    name: string | null;
  } | null;
  user_profiles: {
    full_name: string | null;
  } | null;
}

interface ClassType {
  id: string;
  name: string;
  color: string;
}

interface CalendarEvent extends CalendarLibEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: ClassSchedule;
  color?: string;
}

// Get date for a specific day of week
function getDateForDayOfWeek(weekStartDate: Date, dayOfWeek: number): Date {
  const date = new Date(weekStartDate);
  date.setDate(date.getDate() + (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Adjust for Sunday being 0
  return date;
}

// Event component for calendar
function EventComponent({ event }: { event: CalendarLibEvent }) {
  const calEvent = event as CalendarEvent;
  return (
    <div className="p-1">
      <div className="font-semibold text-sm">{calEvent.title}</div>
    </div>
  );
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
        resource: schedule,
        color: classType?.color || '#3174ad'
      });
    } catch (error) {
      console.error(`Error parsing time for schedule ${schedule.id}:`, error);
      // Skip this event if time parsing fails
    }

    return acc;
  }, [] as CalendarEvent[]);
}

export default function StudentSchedulePage() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [classTypes, setClassTypes] = useState<{ [id: string]: ClassType }>({});
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Start week on Monday
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        // Fetch schedule rules
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('class_schedules')
          .select('*, class_types(name, color), locations(name), user_profiles(full_name)');

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

        setSchedules(scheduleData);
        setClassTypes(typesMap);
        setError(null);
      } catch (err) {
        console.error("Error fetching schedule data:", err);
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule data. Please try again.');
        setSchedules([]);
        setClassTypes({});
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router, supabase]);

  // Recalculate events when schedules, class types, or the current date (week) changes
  useEffect(() => {
    if (schedules.length > 0 && Object.keys(classTypes).length > 0) {
      const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      const newEvents = mapSchedulesToEvents(schedules, classTypes, weekStartDate);
      setEvents(newEvents);
    } else {
      setEvents([]);
    }
  }, [schedules, classTypes, currentDate]);

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(startOfWeek(newDate, { weekStartsOn: 1 }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="text-center py-12">
          <p className="text-lg">Loading class schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Class Schedule</h1>
          <p className="text-gray-600">View upcoming classes and plan your training</p>
        </div>
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          date={currentDate}
          onNavigate={handleNavigate}
          view="week"
          views={["week"]}
          step={30}
          timeslots={2}
          onSelectEvent={(event) => {
            console.log('Selected event:', event);
            // Don't redirect to edit for students
          }}
          components={{
            event: EventComponent as Components['event'],
          }}
          eventPropGetter={(event) => {
            const calEvent = event as CalendarEvent;
            return {
              style: {
                backgroundColor: calEvent.color || '#3174ad',
                borderRadius: '3px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block',
              },
            };
          }}
          dayLayoutAlgorithm="no-overlap"
          min={new Date(0, 0, 0, 6, 0, 0)}  // Start day at 6:00 AM
          max={new Date(0, 0, 0, 22, 0, 0)} // End day at 10:00 PM
        />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Classes This Week
          </h2>
          <div className="space-y-4">
            {events.length > 0 ? (
              events.slice(0, 5).map((event, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                  <div className="font-medium">{event.title.split('@')[0]}</div>
                  <div className="text-sm text-gray-600 flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    {format(event.start, 'EEEE, h:mm a')} - {format(event.end, 'h:mm a')}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {event.resource?.locations?.name || 'Location not specified'}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center mt-1">
                    <User className="h-4 w-4 mr-1" />
                    {event.resource?.user_profiles?.full_name || 'Instructor not assigned'}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No classes scheduled for this week.</p>
            )}
          </div>
          {events.length > 5 && (
            <div className="mt-4 text-sm text-blue-600 font-medium">
              +{events.length - 5} more classes this week
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 