'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { recordCheckIn } from '@/app/locations/[locationId]/check-in/actions'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle } from 'lucide-react'

// Type for class instance
type ClassInstance = {
  id: number;
  start_time: string;
  end_time: string;
  location_id: number;
  location_name: string;
  class_name: string;
  class_type: string;
  instructor_id: string;
  instructor_name: string;
};

// Type for member for attendance
type ClassMember = {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  rank_name: string | null;
  membership_plan: string | null;
  is_active: boolean;
  checked_in: boolean;
};

// Type for Supabase class instance query results
type ClassInstanceData = {
  id: number;
  start_time: string;
  end_time: string;
  location_id: number;
  locations: { name: string };
  classes: {
    name: string;
    class_type_id: number;
    instructor_id: string | null;
    class_types: { name: string };
  };
};

// Type for our transformed class data
type TransformedClassInstance = {
  id: number;
  start_time: string;
  end_time: string;
  location_id: number;
  location_name: string;
  class_name: string;
  class_type: string;
  instructor_id: string;
  instructor_name: string;
};

export default function ClassAttendancePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayClasses, setTodayClasses] = useState<ClassInstance[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInstance | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get current user role for auth check
  useEffect(() => {
    const checkUserRole = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth/signin');
        return;
      }

      setUserId(data.session.user.id);

      const { data: userData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      if (error || !userData) {
        router.push('/dashboard');
        return;
      }

      setUserRole(userData.role);
      
      // Redirect if not authorized
      if (!['admin', 'owner', 'instructor'].includes(userData.role)) {
        router.push('/dashboard');
      }
    };

    checkUserRole();
  }, [supabase, router]);

  // Fetch today's classes
  const fetchTodayClasses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      let query = supabase
        .from('class_instances')
        .select(`
          id,
          start_time,
          end_time,
          location_id,
          locations (name),
          classes (
            name,
            class_type_id,
            instructor_id,
            class_types (name)
          )
        `)
        .gte('start_time', startOfDay)
        .lte('end_time', endOfDay)
        .order('start_time', { ascending: true });
        
      // If instructor, only show their classes
      if (userRole === 'instructor' && userId) {
        query = query.eq('classes.instructor_id', userId);
      }
        
      const { data, error: fetchError } = await query;
      
      if (fetchError) {
        console.error('Error fetching classes:', fetchError);
        setError('Failed to load class data');
        setTodayClasses([]);
      } else {
        // Transform the data to our expected format
        const classData = await Promise.all((data || []).map(async (item) => {
          // Fetch instructor name if we have an instructor_id
          let instructorName = 'No Instructor';
          if (item.classes?.instructor_id) {
            const { data: instructorData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', item.classes.instructor_id)
              .single();
            
            instructorName = instructorData?.full_name || 'Unknown Instructor';
          }
          
          return {
            id: item.id,
            start_time: item.start_time,
            end_time: item.end_time,
            location_id: item.location_id,
            location_name: item.locations?.name || 'Unknown Location',
            class_name: item.classes?.name || 'Unnamed Class',
            class_type: item.classes?.class_types?.name || 'Unknown Type',
            instructor_id: item.classes?.instructor_id || '',
            instructor_name: instructorName
          };
        }));
        
        setTodayClasses(classData);
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
      setError('An unexpected error occurred');
      setTodayClasses([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userRole, userId]);

  // Fetch members for a class
  const fetchClassMembers = useCallback(async (classId: number, locationId: number) => {
    if (!classId || !locationId) return;
    
    setIsLoadingMembers(true);
    setMembers([]);
    
    try {
      // First, get all profiles associated with this location
      const { data: locationMembers, error: locationError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          users (email),
          current_plan_id,
          membership_plans (name, is_active),
          ranks (name)
        `)
        .eq('primary_location_id', locationId);
        
      if (locationError) {
        console.error('Error fetching location members:', locationError);
        return;
      }
      
      // Then, get all check-ins for this class instance to see who's already checked in
      const { data: existingCheckIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('profile_id')
        .eq('class_id', classId);
        
      if (checkInsError) {
        console.error('Error fetching check-ins:', checkInsError);
        return;
      }
      
      // Create a Set of profile IDs that have already checked in
      const checkedInMemberIds = new Set(existingCheckIns?.map(c => c.profile_id) || []);
      
      // Map the members with their check-in status
      const membersList = locationMembers?.map(member => ({
        profile_id: member.id,
        full_name: member.full_name,
        email: member.users?.[0]?.email || null,
        rank_name: member.ranks?.[0]?.name || null,
        membership_plan: member.membership_plans?.[0]?.name || null,
        is_active: member.membership_plans?.[0]?.is_active || false,
        checked_in: checkedInMemberIds.has(member.id)
      })) || [];
      
      // Sort by name
      membersList.sort((a, b) => {
        const aName = a.full_name || '';
        const bName = b.full_name || '';
        return aName.localeCompare(bName);
      });
      
      setMembers(membersList);
    } catch (err) {
      console.error('Error fetching class members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [supabase]);
  
  // Handle class selection
  const handleClassSelect = (classId: string) => {
    const selectedClassId = parseInt(classId);
    const classInstance = todayClasses.find(c => c.id === selectedClassId) || null;
    setSelectedClass(classInstance);
    
    if (classInstance) {
      fetchClassMembers(classInstance.id, classInstance.location_id);
    } else {
      setMembers([]);
    }
  };
  
  // Toggle member attendance
  const toggleAttendance = async (member: ClassMember) => {
    if (!selectedClass || updatingAttendance) return;
    
    setUpdatingAttendance(true);
    setSuccessMessage(null);
    
    try {
      if (member.checked_in) {
        // Remove check-in
        const { error } = await supabase
          .from('check_ins')
          .delete()
          .match({ profile_id: member.profile_id, class_id: selectedClass.id });
          
        if (error) throw error;
      } else {
        // Add check-in
        const result = await recordCheckIn(
          member.profile_id,
          selectedClass.location_id,
          selectedClass.id,
          'INSTRUCTOR'
        );
        
        if (result.error) {
          setError(`Failed to check in ${member.full_name}: ${result.error}`);
          setUpdatingAttendance(false);
          return;
        }
      }
      
      // Update the members state
      setMembers(prevMembers => 
        prevMembers.map(m => 
          m.profile_id === member.profile_id 
            ? { ...m, checked_in: !m.checked_in }
            : m
        )
      );
      
      setSuccessMessage(`Attendance updated for ${member.full_name}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating attendance:', err);
      setError(`Failed to update attendance: ${err}`);
    } finally {
      setUpdatingAttendance(false);
    }
  };
  
  // Handle bulk check-in
  const handleBulkCheckIn = async () => {
    if (!selectedClass || updatingAttendance) return;
    
    setUpdatingAttendance(true);
    setSuccessMessage(null);
    
    try {
      // Filter for active members not already checked in
      const membersToCheckIn = members.filter(m => m.is_active && !m.checked_in);
      
      if (membersToCheckIn.length === 0) {
        setSuccessMessage('All active members are already checked in');
        setUpdatingAttendance(false);
        return;
      }
      
      // Check in each member
      let successCount = 0;
      for (const member of membersToCheckIn) {
        const result = await recordCheckIn(
          member.profile_id,
          selectedClass.location_id,
          selectedClass.id,
          'INSTRUCTOR'
        );
        
        if (!result.error) {
          successCount++;
        }
      }
      
      // Refresh the member list
      await fetchClassMembers(selectedClass.id, selectedClass.location_id);
      
      setSuccessMessage(`Successfully checked in ${successCount} members`);
    } catch (err) {
      console.error('Error during bulk check-in:', err);
      setError(`Failed to complete bulk check-in: ${err}`);
    } finally {
      setUpdatingAttendance(false);
    }
  };
  
  // Initialize
  useEffect(() => {
    if (userRole) {
      fetchTodayClasses();
    }
  }, [fetchTodayClasses, userRole]);
  
  // Format time for display
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Filter members by search term
  const filteredMembers = searchTerm.trim()
    ? members.filter(m => 
        (m.full_name && m.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : members;
    
  if (!userRole) {
    return <div className="p-6 text-center">Checking authorization...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Class Attendance</h1>
      
      {/* Class Selection */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Select Class</h2>
        
        {isLoading ? (
          <div className="text-center p-8">Loading class data...</div>
        ) : todayClasses.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayClasses.map((classItem) => (
              <div 
                key={classItem.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedClass?.id === classItem.id 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'hover:border-gray-400'
                }`}
                onClick={() => handleClassSelect(classItem.id.toString())}
              >
                <h3 className="font-bold text-lg">{classItem.class_name}</h3>
                <p className="text-sm text-gray-600">{classItem.class_type}</p>
                <p className="text-sm my-1">
                  {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                </p>
                <p className="text-sm">{classItem.location_name}</p>
                <p className="text-sm text-gray-500 mt-1">Instructor: {classItem.instructor_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Attendance Management */}
      {selectedClass && (
        <div className="mt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h2 className="text-xl font-semibold">
              Class Attendance: {selectedClass.class_name}
            </h2>
            <Button 
              onClick={handleBulkCheckIn}
              disabled={updatingAttendance || isLoadingMembers}
              className="mt-2 md:mt-0"
            >
              Check In All Active Members
            </Button>
          </div>
          
          {/* Search and Filters */}
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          {/* Success/Error Messages */}
          {successMessage && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Member List */}
          {isLoadingMembers ? (
            <div className="text-center p-8">Loading members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'No members found matching your search.' 
                  : 'No members associated with this location.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary-100">
                    <th className="p-3 text-left border-b">Member</th>
                    <th className="p-3 text-left border-b">Email</th>
                    <th className="p-3 text-left border-b">Rank</th>
                    <th className="p-3 text-left border-b">Membership Plan</th>
                    <th className="p-3 text-left border-b">Status</th>
                    <th className="p-3 text-left border-b">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.profile_id} className="hover:bg-secondary-50">
                      <td className="p-3 border-b">
                        {member.full_name || 'Unknown'}
                      </td>
                      <td className="p-3 border-b">
                        {member.email || 'No email'}
                      </td>
                      <td className="p-3 border-b">
                        {member.rank_name || '-'}
                      </td>
                      <td className="p-3 border-b">
                        {member.membership_plan || 'No plan'}
                      </td>
                      <td className="p-3 border-b">
                        <span 
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            member.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 border-b">
                        <Button
                          variant={member.checked_in ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleAttendance(member)}
                          disabled={updatingAttendance || !member.is_active}
                          className="flex items-center"
                        >
                          {member.checked_in ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Present
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Absent
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 