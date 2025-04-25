'use client'

import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar 
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download } from 'lucide-react'

// Types for our analytics data
type CheckInsByDate = {
  date: string;
  count: number;
  dayOfWeek: string;
};

type CheckInsByHour = {
  hour: string;
  count: number;
};

type CheckInsByLocation = {
  location_name: string;
  count: number;
};

type CheckInsByClass = {
  class_name: string;
  count: number;
};

type AttendanceStats = {
  totalCheckIns: number;
  uniqueMembers: number;
  activeClasses: number;
  averageAttendancePerClass: number;
};

// Types for Supabase data
type CheckInData = {
  checked_in_at: string;
  profile_id?: string;
};

type LocationCheckInData = {
  location_id: string;
  locations?: {
    name: string;
  };
};

type ClassCheckInData = {
  class_id: string | null;
  classes?: {
    name: string;
  };
};

// Type for export data item from Supabase
type CheckInExportData = {
  id: number;
  checked_in_at: string;
  check_in_method: string;
  profiles: {
    id: string;
    full_name: string | null;
  } | null;
  locations: {
    name: string;
  } | null;
  classes: {
    name: string;
  } | null;
};

export default function AttendanceAnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('week');
  const [checkInsByDate, setCheckInsByDate] = useState<CheckInsByDate[]>([]);
  const [checkInsByHour, setCheckInsByHour] = useState<CheckInsByHour[]>([]);
  const [checkInsByLocation, setCheckInsByLocation] = useState<CheckInsByLocation[]>([]);
  const [checkInsByClass, setCheckInsByClass] = useState<CheckInsByClass[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalCheckIns: 0,
    uniqueMembers: 0,
    activeClasses: 0,
    averageAttendancePerClass: 0
  });
  const [exportLoading, setExportLoading] = useState(false);
  
  // Get current user role for auth check
  useEffect(() => {
    const checkUserRole = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth/signin');
        return;
      }

      const { data: userData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      if (error || !userData || !['admin', 'owner'].includes(userData.role)) {
        router.push('/dashboard');
      } else {
        fetchData(dateRange);
      }
    };

    checkUserRole();
  }, [supabase, router, dateRange]);
  
  // Fetch analytics data
  const fetchData = useCallback(async (range: 'week' | 'month' | 'year') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate date range
      const today = new Date();
      let startDate: Date;
      
      switch (range) {
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date(today);
          startDate.setFullYear(today.getFullYear() - 1);
          break;
      }
      
      const fromDate = startDate.toISOString();
      const toDate = today.toISOString();
      
      // Fetch check-ins by date
      const { data: dateData, error: dateError } = await supabase
        .from('check_ins')
        .select('checked_in_at, profile_id')
        .gte('checked_in_at', fromDate)
        .lte('checked_in_at', toDate);
        
      if (dateError) throw dateError;
      
      // Process date data
      const checkInDates = processCheckInsByDate((dateData || []) as CheckInData[], range);
      setCheckInsByDate(checkInDates);
      
      // Fetch check-ins by hour
      const { data: hourData, error: hourError } = await supabase
        .from('check_ins')
        .select('checked_in_at')
        .gte('checked_in_at', fromDate)
        .lte('checked_in_at', toDate);
        
      if (hourError) throw hourError;
      
      // Process hour data
      const checkInHours = processCheckInsByHour((hourData || []) as CheckInData[]);
      setCheckInsByHour(checkInHours);
      
      // Fetch check-ins by location
      const { data: locationData, error: locationError } = await supabase
        .from('check_ins')
        .select(`
          location_id,
          locations (name)
        `)
        .gte('checked_in_at', fromDate)
        .lte('checked_in_at', toDate);
        
      if (locationError) throw locationError;
      
      // Process location data
      const checkInLocations = processCheckInsByLocation(
        (locationData || []) as unknown as Array<{
          location_id: string;
          locations?: {
            name: string;
          };
        }>
      );
      setCheckInsByLocation(checkInLocations);
      
      // Fetch check-ins by class
      const { data: classData, error: classError } = await supabase
        .from('check_ins')
        .select(`
          class_id,
          classes (name)
        `)
        .gte('checked_in_at', fromDate)
        .lte('checked_in_at', toDate)
        .not('class_id', 'is', null);
        
      if (classError) throw classError;
      
      // Process class data
      const checkInClasses = processCheckInsByClass(
        (classData || []) as unknown as Array<{
          class_id: string | null;
          classes?: {
            name: string;
          };
        }>
      );
      setCheckInsByClass(checkInClasses);
      
      // Calculate overall stats
      const calculatedStats = calculateStats(
        (dateData || []) as CheckInData[], 
        (classData || []) as unknown as Array<{
          class_id: string | null;
          classes?: {
            name: string;
          };
        }>
      );
      setStats(calculatedStats);
      
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('An unexpected error occurred while fetching analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);
  
  // Helper function to process check-ins by date
  const processCheckInsByDate = (data: CheckInData[], range: 'week' | 'month' | 'year'): CheckInsByDate[] => {
    const counts: Record<string, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Initialize all dates in the range
    const today = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
    }
    
    const datesInRange: CheckInsByDate[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayOfWeek = dayNames[currentDate.getDay()];
      
      datesInRange.push({
        date: dateStr,
        count: 0,
        dayOfWeek: range === 'week' ? dayOfWeek : dateStr
      });
      
      if (range === 'week' || range === 'month') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        // For yearly view, increment by month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    // Count check-ins by date
    data.forEach(item => {
      const dateStr = new Date(item.checked_in_at).toISOString().split('T')[0];
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    
    // Merge counts into the initialized dates
    return datesInRange.map(item => ({
      ...item,
      count: counts[item.date] || 0
    }));
  };
  
  // Helper function to process check-ins by hour
  const processCheckInsByHour = (data: CheckInData[]): CheckInsByHour[] => {
    const counts: Record<number, number> = {};
    
    // Initialize all hours (0-23)
    for (let i = 0; i < 24; i++) {
      counts[i] = 0;
    }
    
    // Count check-ins by hour
    data.forEach(item => {
      const hour = new Date(item.checked_in_at).getHours();
      counts[hour] = (counts[hour] || 0) + 1;
    });
    
    // Convert to array format
    return Object.entries(counts).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      count
    }));
  };
  
  // Helper function to process check-ins by location
  const processCheckInsByLocation = (data: LocationCheckInData[]): CheckInsByLocation[] => {
    const counts: Record<string, { name: string; count: number }> = {};
    
    // Count check-ins by location
    data.forEach(item => {
      const locationId = item.location_id;
      const locationName = item.locations?.name || `Location ${locationId}`;
      
      if (!counts[locationId]) {
        counts[locationId] = { name: locationName, count: 0 };
      }
      
      counts[locationId].count++;
    });
    
    // Convert to array format and sort by count (descending)
    return Object.values(counts)
      .map(item => ({
        location_name: item.name,
        count: item.count
      }))
      .sort((a, b) => b.count - a.count);
  };
  
  // Helper function to process check-ins by class
  const processCheckInsByClass = (data: ClassCheckInData[]): CheckInsByClass[] => {
    const counts: Record<string, { name: string; count: number }> = {};
    
    // Count check-ins by class
    data.forEach(item => {
      const classId = item.class_id;
      if (!classId) return; // Skip null class IDs
      
      const className = item.classes?.name || `Class ${classId}`;
      
      if (!counts[classId]) {
        counts[classId] = { name: className, count: 0 };
      }
      
      counts[classId].count++;
    });
    
    // Convert to array format and sort by count (descending)
    return Object.values(counts)
      .map(item => ({
        class_name: item.name,
        count: item.count
      }))
      .sort((a, b) => b.count - a.count);
  };
  
  // Helper function to calculate overall stats
  const calculateStats = (checkIns: CheckInData[], classCheckIns: ClassCheckInData[]): AttendanceStats => {
    // Count total check-ins
    const totalCheckIns = checkIns.length;
    
    // Count unique members
    const uniqueMembers = new Set(checkIns.filter(c => c.profile_id).map(c => c.profile_id)).size;
    
    // Count active classes (classes with at least one check-in)
    const activeClasses = new Set(classCheckIns.filter(c => c.class_id).map(c => c.class_id)).size;
    
    // Calculate average attendance per class
    const avgAttendance = activeClasses > 0 ? classCheckIns.length / activeClasses : 0;
    
    return {
      totalCheckIns,
      uniqueMembers,
      activeClasses,
      averageAttendancePerClass: Math.round(avgAttendance * 10) / 10 // Round to 1 decimal place
    };
  };
  
  // Handle date range change
  const handleRangeChange = (value: 'week' | 'month' | 'year') => {
    setDateRange(value);
    fetchData(value);
  };
  
  // Helper function to convert date to CSV-friendly format
  const formatDateForCSV = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  // Helper function to convert time to CSV-friendly format
  const formatTimeForCSV = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  // Function to generate and download CSV
  const handleExportCSV = async () => {
    setExportLoading(true);
    
    try {
      // Calculate date range (reusing logic from fetchData)
      const today = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date(today);
          startDate.setFullYear(today.getFullYear() - 1);
          break;
      }
      
      const fromDate = startDate.toISOString();
      const toDate = today.toISOString();
      
      // Fetch detailed check-in data for export
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          check_in_method,
          profiles (id, full_name),
          locations (name),
          classes (name)
        `)
        .gte('checked_in_at', fromDate)
        .lte('checked_in_at', toDate)
        .order('checked_in_at', { ascending: false });
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setError('No data available to export');
        setExportLoading(false);
        return;
      }
      
      // Type the data for proper access
      const typedData = data as unknown as CheckInExportData[];
      
      // Format data for CSV
      const csvRows = [
        // Header row
        [
          'Date', 
          'Time', 
          'Member', 
          'Location', 
          'Class', 
          'Check-in Method'
        ].join(',')
      ];
      
      // Data rows
      typedData.forEach((item) => {
        const rowData = [
          formatDateForCSV(item.checked_in_at),
          formatTimeForCSV(item.checked_in_at),
          item.profiles?.full_name || 'Unknown Member',
          item.locations?.name || 'Unknown Location',
          item.classes?.name || 'No Class',
          item.check_in_method || 'UNKNOWN'
        ];
        
        // Escape any commas in the data
        const escapedRowData = rowData.map(field => {
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        });
        
        csvRows.push(escapedRowData.join(','));
      });
      
      // Create CSV content
      const csvContent = csvRows.join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Set filename with date range
      const dateRangeText = dateRange === 'week' ? 'Last_7_Days' : 
                           dateRange === 'month' ? 'Last_30_Days' : 'Last_12_Months';
      
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_report_${dateRangeText}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      // Append to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Failed to export data:', err);
      setError('An error occurred while exporting data');
    } finally {
      setExportLoading(false);
    }
  };
  
  if (isLoading) {
    return <div className="p-6 text-center">Loading analytics data...</div>;
  }
  
  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Attendance Analytics</h1>
        <div className="mt-2 sm:mt-0">
          <Select 
            value={dateRange} 
            onValueChange={(value) => handleRangeChange(value as 'week' | 'month' | 'year')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Total Check-ins</CardTitle>
            <CardDescription>All check-ins during selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCheckIns}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Active Members</CardTitle>
            <CardDescription>Unique members with check-ins</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.uniqueMembers}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Active Classes</CardTitle>
            <CardDescription>Classes with at least one check-in</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.activeClasses}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Avg. Attendance</CardTitle>
            <CardDescription>Average check-ins per class</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.averageAttendancePerClass}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="date" className="w-full mb-6">
        <TabsList>
          <TabsTrigger value="date">By Date</TabsTrigger>
          <TabsTrigger value="hour">By Hour</TabsTrigger>
          <TabsTrigger value="location">By Location</TabsTrigger>
          <TabsTrigger value="class">By Class</TabsTrigger>
        </TabsList>
        
        <TabsContent value="date" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Check-ins By {dateRange === 'week' ? 'Day of Week' : 'Date'}</CardTitle>
              <CardDescription>
                Number of check-ins for each {dateRange === 'week' ? 'day' : dateRange === 'month' ? 'day' : 'month'} during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={checkInsByDate}
                    margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={dateRange === 'week' ? 'dayOfWeek' : 'date'} 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Check-ins" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="hour" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Check-ins By Hour</CardTitle>
              <CardDescription>
                Distribution of check-ins by hour of day during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={checkInsByHour}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Check-ins" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="location" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Check-ins By Location</CardTitle>
              <CardDescription>
                Number of check-ins at each facility location during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={checkInsByLocation}
                    margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="location_name" 
                      width={150}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Check-ins" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="class" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Check-ins By Class</CardTitle>
              <CardDescription>
                Top classes by attendance during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkInsByClass.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  No class-specific check-ins found during this period
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={checkInsByClass.slice(0, 10)} // Show top 10 classes
                      margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="class_name" 
                        width={200}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Check-ins" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Export Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={handleExportCSV} 
          disabled={isLoading || exportLoading}
          className="flex items-center gap-2"
        >
          <Download size={16} />
          {exportLoading ? 'Exporting...' : 'Export Data (CSV)'}
        </Button>
      </div>
    </div>
  );
} 