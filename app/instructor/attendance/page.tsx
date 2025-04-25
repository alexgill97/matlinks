"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Users, ClipboardCheck } from "lucide-react";

export default function AttendancePage() {
  const [recentAttendance, setRecentAttendance] = useState<Array<{
    id: string;
    created_at: string;
    check_in_method?: string;
    profiles?: { full_name?: string };
    class_instances?: {
      class_schedules?: { name?: string }
    };
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchRecentAttendance = async () => {
      setIsLoading(true);
      
      // Get instructor ID for the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (instructorError || !instructorData) {
        console.error("Error fetching instructor data:", instructorError);
        setIsLoading(false);
        return;
      }
      
      // Fetch recent attendance records for classes taught by this instructor
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          class_instances(
            *,
            class_schedules(*)
          ),
          profiles(full_name)
        `)
        .eq('class_instances.instructor_id', instructorData.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error("Error fetching recent attendance:", error);
      } else {
        setRecentAttendance(data || []);
      }
      
      setIsLoading(false);
    };
    
    fetchRecentAttendance();
  }, []);
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Attendance Management</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/instructor/attendance/single">
          <Card className="h-full hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center">
                <UserCheck className="h-6 w-6 text-blue-600 mr-2" />
                Individual Check-in
              </CardTitle>
              <CardDescription>Check in students one at a time</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p>Record attendance for individual students with detailed notes and options.</p>
              <Button className="mt-4 w-full">Start Individual Check-in</Button>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/instructor/attendance/bulk">
          <Card className="h-full hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="bg-purple-50">
              <CardTitle className="flex items-center">
                <Users className="h-6 w-6 text-purple-600 mr-2" />
                Bulk Check-in
              </CardTitle>
              <CardDescription>Check in multiple students at once</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p>Quickly record attendance for multiple students in a single session.</p>
              <Button className="mt-4 w-full bg-purple-600 hover:bg-purple-700">Start Bulk Check-in</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <h2 className="text-xl font-bold mb-4">Recent Attendance</h2>
      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : recentAttendance.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Method</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentAttendance.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.profiles?.full_name || 'Unknown Student'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {record.class_instances?.class_schedules?.name || 'Unknown Class'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(record.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {record.check_in_method || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Recent Attendance</h3>
          <p className="text-gray-500">Start checking in students to see their attendance records here.</p>
        </div>
      )}
    </div>
  );
} 