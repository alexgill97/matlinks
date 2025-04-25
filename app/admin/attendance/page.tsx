'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Type for check-in record with joined data
type CheckInRecord = {
  id: number;
  checked_in_at: string;
  profile_id: string;
  full_name: string | null;
  email: string | null;
  location_id: number;
  location_name: string | null;
  class_id?: number | null;
  class_name?: string | null;
  instructor_name?: string | null;
};

// Type for location filter options
type Location = {
  id: number;
  name: string;
};

// Type for class type filter options
type ClassType = {
  id: number;
  name: string;
};

// Define a simple date range type
type DateRange = {
  from: Date;
  to: Date;
};

export default function AttendancePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State for check-ins
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filters
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)), // Default to last 7 days
    to: new Date()
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>('all');
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('all');
  const [locations, setLocations] = useState<Location[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [instructors, setInstructors] = useState<{id: string, name: string}[]>([]);
  
  // Fetch locations for filter dropdown
  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }
      
      setLocations(data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  }, [supabase]);
  
  // Fetch class types for filter dropdown
  const fetchClassTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('class_types')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching class types:', error);
        return;
      }
      
      setClassTypes(data || []);
    } catch (err) {
      console.error('Failed to fetch class types:', err);
    }
  }, [supabase]);
  
  // Fetch instructors for filter dropdown
  const fetchInstructors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'instructor')
        .order('full_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching instructors:', error);
        return;
      }
      
      setInstructors(data?.map(instructor => ({
        id: instructor.id,
        name: instructor.full_name || 'Unknown'
      })) || []);
    } catch (err) {
      console.error('Failed to fetch instructors:', err);
    }
  }, [supabase]);
  
  // Fetch check-ins with filters
  const fetchCheckIns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          profile_id,
          location_id,
          class_id,
          profiles (
            full_name,
            users ( email )
          ),
          locations (
            name
          ),
          classes (
            name,
            instructor_id,
            profiles (
              full_name
            )
          )
        `)
        .order('checked_in_at', { ascending: false });
      
      // Apply date filter if set
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      query = query.gte('checked_in_at', fromDate.toISOString());
      
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('checked_in_at', toDate.toISOString());
      
      // Apply location filter if set
      if (selectedLocationId !== 'all') {
        query = query.eq('location_id', parseInt(selectedLocationId));
      }
      
      // Apply class filter if set
      if (selectedClassTypeId !== 'all') {
        query = query.eq('classes.class_type_id', parseInt(selectedClassTypeId));
      }
      
      // Apply instructor filter if set
      if (selectedInstructorId !== 'all') {
        query = query.eq('classes.instructor_id', selectedInstructorId);
      }
      
      // Fetch data
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching check-ins:', error);
        setError('Failed to load check-in data');
        setCheckIns([]);
      } else {
        // First cast to unknown to avoid TypeScript error with complex nested types
        const rawData = data as unknown;
        
        // Then map the data to match our expected CheckInRecord type
        const mappedData = (rawData as any[]).map(record => ({
          id: record.id as number,
          checked_in_at: record.checked_in_at as string,
          profile_id: record.profile_id as string,
          full_name: record.profiles?.full_name as string | null,
          email: record.profiles?.users?.[0]?.email as string | null,
          location_id: record.location_id as number,
          location_name: record.locations?.name as string | null,
          class_id: record.class_id as number | null || null,
          class_name: record.classes?.name as string | null || null,
          instructor_name: record.classes?.profiles?.full_name as string | null || null
        }));
        
        // Apply name/email search filter in memory (if provided)
        let filteredData = mappedData;
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          filteredData = mappedData.filter(record => 
            (record.full_name && record.full_name.toLowerCase().includes(search)) || 
            (record.email && record.email.toLowerCase().includes(search))
          );
        }
        
        setCheckIns(filteredData);
      }
    } catch (err) {
      console.error('Failed to fetch check-ins:', err);
      setError('An unexpected error occurred');
      setCheckIns([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, dateRange, selectedLocationId, selectedClassTypeId, selectedInstructorId, searchTerm]);
  
  // Initialize
  useEffect(() => {
    fetchLocations();
    fetchClassTypes();
    fetchInstructors();
  }, [fetchLocations, fetchClassTypes, fetchInstructors]);
  
  // Fetch check-ins when filters change
  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

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
  
  // Handle date range changes
  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }));
  };
  
  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }));
  };
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Attendance Management</h1>
      
      {/* Filters */}
      <div className="mb-8 space-y-4">
        <h2 className="text-xl font-semibold">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range Picker - Simplified to standard inputs */}
          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">From</label>
                <Input 
                  type="date" 
                  value={dateRange.from.toISOString().split('T')[0]} 
                  onChange={handleFromDateChange}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">To</label>
                <Input 
                  type="date" 
                  value={dateRange.to.toISOString().split('T')[0]} 
                  onChange={handleToDateChange}
                />
              </div>
            </div>
          </div>
          
          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <Select 
              value={selectedLocationId} 
              onValueChange={setSelectedLocationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Class Type Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Class Type</label>
            <Select 
              value={selectedClassTypeId} 
              onValueChange={setSelectedClassTypeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classTypes.map((classType) => (
                  <SelectItem key={classType.id} value={classType.id.toString()}>
                    {classType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Instructor Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Instructor</label>
            <Select 
              value={selectedInstructorId} 
              onValueChange={setSelectedInstructorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Instructors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instructors</SelectItem>
                {instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Member Name/Email Search */}
          <div>
            <label className="block text-sm font-medium mb-1">Search Member</label>
            <div className="flex items-center">
              <Input 
                type="text" 
                placeholder="Name or email..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <Button 
                variant="ghost" 
                className="ml-2" 
                onClick={() => setSearchTerm('')}
                disabled={!searchTerm}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={fetchCheckIns}>
            Apply Filters
          </Button>
        </div>
      </div>
      
      {/* Results */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="text-center p-8">Loading check-in data...</div>
      ) : checkIns.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground">No check-ins found matching your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary-100">
                <th className="p-3 text-left border-b">Date & Time</th>
                <th className="p-3 text-left border-b">Member</th>
                <th className="p-3 text-left border-b">Email</th>
                <th className="p-3 text-left border-b">Location</th>
                <th className="p-3 text-left border-b">Class</th>
                <th className="p-3 text-left border-b">Instructor</th>
                <th className="p-3 text-left border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map((checkIn) => (
                <tr key={checkIn.id} className="hover:bg-secondary-50">
                  <td className="p-3 border-b">
                    {new Date(checkIn.checked_in_at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="p-3 border-b">
                    {checkIn.full_name || 'Unknown'}
                  </td>
                  <td className="p-3 border-b">
                    {checkIn.email || 'No email'}
                  </td>
                  <td className="p-3 border-b">
                    {checkIn.location_name || `Location ID: ${checkIn.location_id}`}
                  </td>
                  <td className="p-3 border-b">
                    {checkIn.class_name || 'General Check-in'}
                  </td>
                  <td className="p-3 border-b">
                    {checkIn.instructor_name || '-'}
                  </td>
                  <td className="p-3 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/gyms/0/locations/${checkIn.location_id}/members/${checkIn.profile_id}/edit`)}
                    >
                      View Member
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 