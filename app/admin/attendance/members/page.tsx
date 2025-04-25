'use client'

import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { debounce } from 'lodash'
import { formatDistance, format } from 'date-fns'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Download, Search, UserCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Types
type Member = {
  id: string;
  full_name: string | null;
  email: string;
};

type CheckInRecord = {
  id: number;
  checked_in_at: string;
  location_name: string;
  class_name: string | null;
  check_in_method: string;
};

type AttendanceStats = {
  totalCheckIns: number;
  averagePerWeek: number;
  firstCheckIn: string | null;
  lastCheckIn: string | null;
  mostFrequentLocation: string;
  mostFrequentClass: string;
};

type MonthlyAttendance = {
  month: string;
  count: number;
};

// Table columns
const columns: ColumnDef<CheckInRecord>[] = [
  {
    accessorKey: 'checked_in_at',
    header: 'Date & Time',
    cell: ({ row }) => {
      const date = new Date(row.getValue('checked_in_at'));
      return (
        <div>
          <div>{format(date, 'MMM d, yyyy')}</div>
          <div className="text-xs text-muted-foreground">{format(date, 'h:mm a')}</div>
        </div>
      );
    }
  },
  {
    accessorKey: 'location_name',
    header: 'Location',
  },
  {
    accessorKey: 'class_name',
    header: 'Class',
    cell: ({ row }) => row.getValue('class_name') || 'N/A'
  },
  {
    accessorKey: 'check_in_method',
    header: 'Check-in Method',
  },
];

export default function MemberAttendanceHistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [dateRange, setDateRange] = useState<'30' | '90' | '180' | '365'>('90');
  
  // State for attendance data
  const [attendanceRecords, setAttendanceRecords] = useState<CheckInRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalCheckIns: 0,
    averagePerWeek: 0,
    firstCheckIn: null,
    lastCheckIn: null,
    mostFrequentLocation: '',
    mostFrequentClass: '',
  });
  const [monthlyAttendance, setMonthlyAttendance] = useState<MonthlyAttendance[]>([]);
  
  // State for UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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
      }
    };

    checkUserRole();
  }, [supabase, router]);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            users ( email )
          `)
          .or(`full_name.ilike.%${query}%,users.email.ilike.%${query}%`)
          .limit(10);
          
        if (error) throw error;
        
        // Format the results to include email from the join
        const formattedResults = (data || []).map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
          email: profile.users[0]?.email || 'No email'
        }));
        
        setSearchResults(formattedResults);
      } catch (err) {
        console.error('Error searching members:', err);
        setError('Failed to search for members');
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [supabase]
  );
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };
  
  // Handle member selection
  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setSearchQuery(''); // Clear search
    setSearchResults([]); // Clear results
    fetchMemberAttendance(member.id);
  };
  
  // Fetch member attendance data
  const fetchMemberAttendance = useCallback(async (memberId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate date range
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - parseInt(dateRange));
      
      const fromDate = startDate.toISOString();
      const toDate = today.toISOString();
      
      // Fetch attendance records
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          check_in_method,
          locations (name),
          classes (name)
        `)
        .eq('profile_id', memberId)
        .gte('checked_in_at', fromDate)
        .lte('checked_in_at', toDate)
        .order('checked_in_at', { ascending: false });
        
      if (error) throw error;
      
      // Format and process data
      const formattedRecords = (data || []).map(record => ({
        id: record.id,
        checked_in_at: record.checked_in_at,
        location_name: record.locations?.name || 'Unknown Location',
        class_name: record.classes?.name || null,
        check_in_method: record.check_in_method,
      }));
      
      setAttendanceRecords(formattedRecords);
      
      // Calculate statistics
      if (formattedRecords.length > 0) {
        // Sort by date (oldest first) for calculations
        const sortedRecords = [...formattedRecords].sort((a, b) => 
          new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()
        );
        
        // Location frequency
        const locationCounts: Record<string, number> = {};
        formattedRecords.forEach(record => {
          locationCounts[record.location_name] = (locationCounts[record.location_name] || 0) + 1;
        });
        const mostFrequentLocation = Object.entries(locationCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        // Class frequency
        const classCounts: Record<string, number> = {};
        formattedRecords.forEach(record => {
          if (record.class_name) {
            classCounts[record.class_name] = (classCounts[record.class_name] || 0) + 1;
          }
        });
        const mostFrequentClass = Object.entries(classCounts).length > 0 
          ? Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
          : 'N/A';
        
        // Weeks in the period
        const weeksInPeriod = parseInt(dateRange) / 7;
        
        // Calculate stats
        setAttendanceStats({
          totalCheckIns: formattedRecords.length,
          averagePerWeek: Math.round((formattedRecords.length / weeksInPeriod) * 10) / 10,
          firstCheckIn: sortedRecords[0].checked_in_at,
          lastCheckIn: sortedRecords[sortedRecords.length - 1].checked_in_at,
          mostFrequentLocation,
          mostFrequentClass,
        });
        
        // Process monthly attendance for chart
        const monthlyData: Record<string, number> = {};
        
        // Initialize all months in range
        let currentMonth = new Date(startDate);
        while (currentMonth <= today) {
          const monthKey = format(currentMonth, 'MMM yyyy');
          monthlyData[monthKey] = 0;
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        
        // Count check-ins by month
        formattedRecords.forEach(record => {
          const month = format(new Date(record.checked_in_at), 'MMM yyyy');
          monthlyData[month] = (monthlyData[month] || 0) + 1;
        });
        
        // Convert to array format for chart
        const chartData = Object.entries(monthlyData).map(([month, count]) => ({
          month,
          count,
        }));
        
        setMonthlyAttendance(chartData);
      } else {
        // Reset stats if no records
        setAttendanceStats({
          totalCheckIns: 0,
          averagePerWeek: 0,
          firstCheckIn: null,
          lastCheckIn: null,
          mostFrequentLocation: 'N/A',
          mostFrequentClass: 'N/A',
        });
        setMonthlyAttendance([]);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance records');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, dateRange]);
  
  // Handle date range change
  const handleDateRangeChange = (value: '30' | '90' | '180' | '365') => {
    setDateRange(value);
    if (selectedMember) {
      fetchMemberAttendance(selectedMember.id);
    }
  };
  
  // Export attendance as CSV
  const handleExportCSV = () => {
    if (!selectedMember || attendanceRecords.length === 0) return;
    
    // Create CSV content
    const csvRows = [
      // Header row
      ['Date', 'Time', 'Location', 'Class', 'Check-in Method'].join(',')
    ];
    
    // Add data rows
    attendanceRecords.forEach(record => {
      const date = new Date(record.checked_in_at);
      const rowData = [
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm:ss'),
        record.location_name,
        record.class_name || 'N/A',
        record.check_in_method
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
    
    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedMember.full_name || selectedMember.id}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Member Attendance History</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Member Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Search Member</CardTitle>
          <CardDescription>
            Find a member to view their attendance history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md shadow-sm overflow-hidden">
              <ul className="divide-y">
                {searchResults.map(member => (
                  <li 
                    key={member.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectMember(member)}
                  >
                    <div className="font-medium">
                      {member.full_name || 'No Name'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.email}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {isSearching && (
            <div className="mt-2 text-center py-2">
              <div className="text-sm">Searching...</div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedMember && (
        <>
          {/* Member Info */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    {selectedMember.full_name || 'No Name'}
                  </CardTitle>
                  <CardDescription>{selectedMember.email}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select 
                    value={dateRange} 
                    onValueChange={(value) => handleDateRangeChange(value as '30' | '90' | '180' | '365')}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                      <SelectItem value="180">Last 180 Days</SelectItem>
                      <SelectItem value="365">Last 365 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={handleExportCSV}
                    disabled={attendanceRecords.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download size={16} />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          {isLoading ? (
            <div className="text-center py-8">Loading attendance data...</div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Total Check-ins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{attendanceStats.totalCheckIns}</p>
                    <p className="text-sm text-muted-foreground">
                      Avg. {attendanceStats.averagePerWeek} per week
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">First/Last Check-in</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attendanceStats.firstCheckIn ? (
                      <>
                        <div className="text-sm">
                          <span className="font-medium">First: </span>
                          {format(new Date(attendanceStats.firstCheckIn), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Last: </span>
                          {format(new Date(attendanceStats.lastCheckIn!), 'MMM d, yyyy')}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({formatDistance(new Date(attendanceStats.lastCheckIn!), new Date(), { addSuffix: true })})
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No check-ins in selected period</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Most Frequent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <span className="font-medium">Location: </span>
                      {attendanceStats.mostFrequentLocation}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Class: </span>
                      {attendanceStats.mostFrequentClass}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Attendance Chart */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Attendance Over Time</CardTitle>
                  <CardDescription>
                    Monthly check-in count for the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyAttendance.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyAttendance}
                          margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            name="Check-ins"
                            stroke="#8884d8" 
                            activeDot={{ r: 8 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No attendance data available for this period
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Attendance Records Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>
                    Detailed list of all check-ins during the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceRecords.length > 0 ? (
                    <DataTable 
                      columns={columns} 
                      data={attendanceRecords} 
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No attendance records found for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
} 