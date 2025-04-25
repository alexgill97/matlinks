'use client'

import { useState, useEffect } from 'react'
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
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Star, Users, UserCheck, Award, Clock } from 'lucide-react'
import Link from 'next/link'

// Types for instructor metrics data
type InstructorPerformance = {
  id: string;
  name: string;
  classes: number;
  attendanceRate: number;
  memberRetention: number;
  studentSatisfaction: number;
  rankProgressions: number;
}

type ClassAttendanceByInstructor = {
  instructor: string;
  attendanceRate: number;
}

type RetentionByInstructor = {
  instructor: string;
  retention: number;
}

type InstructorSkill = {
  instructor: string;
  technical: number;
  communication: number;
  motivation: number;
  organization: number;
  adaptability: number;
}

type InstructorDetailedMetrics = {
  instructorId: string;
  name: string;
  profileImage: string | null;
  classTypes: { type: string; count: number }[];
  attendanceByMonth: { month: string; attendance: number }[];
  studentFeedback: { category: string; score: number }[];
  totalClasses: number;
  totalStudents: number;
  avgAttendance: number;
  retentionRate: number;
}

export default function InstructorMetricsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [instructorMetrics, setInstructorMetrics] = useState<InstructorPerformance[]>([]);
  const [instructorAttendance, setInstructorAttendance] = useState<ClassAttendanceByInstructor[]>([]);
  const [instructorRetention, setInstructorRetention] = useState<RetentionByInstructor[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [instructorSkills, setInstructorSkills] = useState<InstructorSkill[]>([]);
  const [detailedMetrics, setDetailedMetrics] = useState<InstructorDetailedMetrics | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
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
        fetchData(timeRange);
      }
    };

    checkUserRole();
  }, [supabase, router, timeRange]);
  
  // Fetch metrics data
  const fetchData = async (range: 'month' | 'quarter' | 'year') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, fetch all this data from Supabase
      // For now, we'll use mock data
      
      // Mock Instructor Performance Data
      const performanceData: InstructorPerformance[] = [
        { id: '1', name: 'John Smith', classes: 48, attendanceRate: 92, memberRetention: 87, studentSatisfaction: 4.8, rankProgressions: 12 },
        { id: '2', name: 'Maria Garcia', classes: 36, attendanceRate: 88, memberRetention: 92, studentSatisfaction: 4.9, rankProgressions: 8 },
        { id: '3', name: 'David Lee', classes: 42, attendanceRate: 85, memberRetention: 82, studentSatisfaction: 4.6, rankProgressions: 7 },
        { id: '4', name: 'Sarah Johnson', classes: 24, attendanceRate: 78, memberRetention: 75, studentSatisfaction: 4.3, rankProgressions: 5 },
        { id: '5', name: 'Michael Chen', classes: 52, attendanceRate: 90, memberRetention: 89, studentSatisfaction: 4.7, rankProgressions: 10 }
      ];
      
      // Mock Attendance Data
      const attendanceData: ClassAttendanceByInstructor[] = performanceData.map(instructor => ({
        instructor: instructor.name,
        attendanceRate: instructor.attendanceRate
      }));
      
      // Mock Retention Data
      const retentionData: RetentionByInstructor[] = performanceData.map(instructor => ({
        instructor: instructor.name,
        retention: instructor.memberRetention
      }));
      
      // Mock Instructor Skills Data
      const skillsData: InstructorSkill[] = [
        { 
          instructor: 'John Smith', 
          technical: 90, 
          communication: 85, 
          motivation: 95, 
          organization: 80, 
          adaptability: 88 
        },
        { 
          instructor: 'Maria Garcia', 
          technical: 88, 
          communication: 92, 
          motivation: 90, 
          organization: 86, 
          adaptability: 85 
        },
        { 
          instructor: 'David Lee', 
          technical: 95, 
          communication: 78, 
          motivation: 82, 
          organization: 79, 
          adaptability: 90 
        },
        { 
          instructor: 'Sarah Johnson', 
          technical: 82, 
          communication: 89, 
          motivation: 76, 
          organization: 81, 
          adaptability: 75 
        },
        { 
          instructor: 'Michael Chen', 
          technical: 87, 
          communication: 90, 
          motivation: 88, 
          organization: 92, 
          adaptability: 86 
        }
      ];
      
      // Set state with mock data
      setInstructorMetrics(performanceData);
      setInstructorAttendance(attendanceData);
      setInstructorRetention(retentionData);
      setInstructorSkills(skillsData);
      
      // If an instructor is selected, fetch their detailed metrics
      if (selectedInstructor) {
        await fetchInstructorDetails(selectedInstructor);
      }
      
    } catch (err) {
      console.error('Failed to fetch instructor metrics data:', err);
      setError('An unexpected error occurred while fetching instructor metrics data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch detailed metrics for a specific instructor
  const fetchInstructorDetails = async (instructorId: string) => {
    try {
      // In a real implementation, fetch from Supabase
      // For now, use mock data
      
      const instructor = instructorMetrics.find(i => i.id === instructorId);
      
      if (!instructor) {
        throw new Error('Instructor not found');
      }
      
      // Generate mock monthly attendance data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyAttendance = months.map(month => ({
        month,
        attendance: Math.round(70 + Math.random() * 25) // 70-95% attendance
      }));
      
      // Generate mock class types
      const classTypes = [
        { type: 'Fundamentals', count: Math.round(10 + Math.random() * 20) },
        { type: 'Advanced', count: Math.round(5 + Math.random() * 15) },
        { type: 'Competition', count: Math.round(3 + Math.random() * 10) },
        { type: 'Open Mat', count: Math.round(2 + Math.random() * 8) }
      ];
      
      // Generate mock student feedback
      const feedback = [
        { category: 'Knowledge', score: Math.round(40 + Math.random() * 10) / 10 },
        { category: 'Teaching Style', score: Math.round(40 + Math.random() * 10) / 10 },
        { category: 'Attentiveness', score: Math.round(40 + Math.random() * 10) / 10 },
        { category: 'Helpfulness', score: Math.round(40 + Math.random() * 10) / 10 },
        { category: 'Motivation', score: Math.round(40 + Math.random() * 10) / 10 }
      ];
      
      // Create detailed metrics
      const detailedData: InstructorDetailedMetrics = {
        instructorId: instructor.id,
        name: instructor.name,
        profileImage: null, // In a real implementation, fetch from database
        classTypes,
        attendanceByMonth: monthlyAttendance,
        studentFeedback: feedback,
        totalClasses: instructor.classes,
        totalStudents: Math.round(15 * instructor.classes), // Estimate students based on classes
        avgAttendance: instructor.attendanceRate,
        retentionRate: instructor.memberRetention
      };
      
      setDetailedMetrics(detailedData);
      
    } catch (err) {
      console.error('Failed to fetch instructor details:', err);
      setError('An unexpected error occurred while fetching instructor details');
    }
  };
  
  // Handle time range change
  const handleTimeRangeChange = (value: 'month' | 'quarter' | 'year') => {
    setTimeRange(value);
    fetchData(value);
  };
  
  // Handle instructor selection
  const handleInstructorChange = (instructorId: string) => {
    setSelectedInstructor(instructorId);
    fetchInstructorDetails(instructorId);
  };
  
  // Export instructor metrics to CSV
  const handleExportCSV = async () => {
    setExportLoading(true);
    
    try {
      // Format instructor metrics data for CSV
      const csvRows = [
        // Header row
        ['ID', 'Instructor Name', 'Classes Taught', 'Attendance Rate (%)', 'Member Retention (%)', 'Student Satisfaction', 'Rank Progressions'].join(',')
      ];
      
      // Data rows
      instructorMetrics.forEach(instructor => {
        csvRows.push([
          instructor.id,
          instructor.name,
          instructor.classes,
          instructor.attendanceRate,
          instructor.memberRetention,
          instructor.studentSatisfaction,
          instructor.rankProgressions
        ].join(','));
      });
      
      // Create and download the CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `instructor_metrics_${timeRange}.csv`);
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
    return (
      <div className="container p-6">
        <h1 className="text-2xl font-bold mb-6">Instructor Metrics</h1>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container p-6">
        <h1 className="text-2xl font-bold mb-6">Instructor Metrics</h1>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Instructor Performance Metrics</h1>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <Select value={timeRange} onValueChange={(value: 'month' | 'quarter' | 'year') => handleTimeRangeChange(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExportCSV} disabled={exportLoading}>
            {exportLoading ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2">⏳</span> Exporting...
              </span>
            ) : (
              <span className="flex items-center">
                <Download className="mr-2 h-4 w-4" /> Export Metrics
              </span>
            )}
          </Button>
        </div>
      </div>
      
      {/* Error display if any */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Instructor selection */}
      <div className="mb-6">
        <Select 
          value={selectedInstructor || ''} 
          onValueChange={handleInstructorChange}
        >
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="Select Instructor for Detailed Metrics" />
          </SelectTrigger>
          <SelectContent>
            {instructorMetrics.map(instructor => (
              <SelectItem key={instructor.id} value={instructor.id}>
                {instructor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Overview metrics or detailed instructor view */}
      {!selectedInstructor ? (
        <>
          {/* Top instructor metrics cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Top Attendance Rate</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {instructorAttendance.length > 0 && (
                  <>
                    <div className="text-2xl font-bold">
                      {Math.max(...instructorAttendance.map(i => i.attendanceRate))}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {instructorAttendance.sort((a, b) => b.attendanceRate - a.attendanceRate)[0].instructor}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Top Student Retention</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {instructorRetention.length > 0 && (
                  <>
                    <div className="text-2xl font-bold">
                      {Math.max(...instructorRetention.map(i => i.retention))}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {instructorRetention.sort((a, b) => b.retention - a.retention)[0].instructor}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Top Satisfaction Score</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {instructorMetrics.length > 0 && (
                  <>
                    <div className="text-2xl font-bold">
                      {Math.max(...instructorMetrics.map(i => i.studentSatisfaction))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {instructorMetrics.sort((a, b) => b.studentSatisfaction - a.studentSatisfaction)[0].name}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Most Rank Progressions</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {instructorMetrics.length > 0 && (
                  <>
                    <div className="text-2xl font-bold">
                      {Math.max(...instructorMetrics.map(i => i.rankProgressions))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {instructorMetrics.sort((a, b) => b.rankProgressions - a.rankProgressions)[0].name}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Main analytics tabs */}
          <Tabs defaultValue="comparison" className="space-y-6">
            <TabsList>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
              <TabsTrigger value="attendance">Attendance Rates</TabsTrigger>
              <TabsTrigger value="skills">Instructor Skills</TabsTrigger>
            </TabsList>
            
            {/* Comparison tab */}
            <TabsContent value="comparison" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Instructor Performance Comparison</CardTitle>
                  <CardDescription>Key metrics across all instructors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={instructorMetrics}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        barGap={0}
                        barCategoryGap={20}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                          tickMargin={25}
                        />
                        <YAxis />
                        <Tooltip formatter={(value, name) => {
                          if (name === 'studentSatisfaction') return [value, 'Student Satisfaction'];
                          if (name === 'attendanceRate') return [`${value}%`, 'Attendance Rate'];
                          if (name === 'memberRetention') return [`${value}%`, 'Member Retention'];
                          if (name === 'rankProgressions') return [value, 'Rank Progressions'];
                          if (name === 'classes') return [value, 'Classes Taught'];
                          return [value, name];
                        }} />
                        <Legend />
                        <Bar dataKey="attendanceRate" name="Attendance Rate" fill="#8884d8" />
                        <Bar dataKey="memberRetention" name="Member Retention" fill="#82ca9d" />
                        <Bar dataKey="studentSatisfaction" name="Satisfaction (x20)" fill="#ffc658" />
                        <Bar dataKey="rankProgressions" name="Rank Progressions" fill="#ff8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Attendance tab */}
            <TabsContent value="attendance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Rates by Instructor</CardTitle>
                  <CardDescription>Average class attendance percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={instructorAttendance}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="instructor" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                          tickMargin={25}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                        <Legend />
                        <Bar dataKey="attendanceRate" name="Attendance Rate" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Student Retention by Instructor</CardTitle>
                  <CardDescription>Percentage of students who continue training</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={instructorRetention}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="instructor" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                          tickMargin={25}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Retention Rate']} />
                        <Legend />
                        <Bar dataKey="retention" name="Retention Rate" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Skills tab */}
            <TabsContent value="skills" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Instructor Skills Assessment</CardTitle>
                  <CardDescription>Radar chart comparing instructor skills</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={instructorSkills}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="instructor" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Technical" dataKey="technical" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                        <Radar name="Communication" dataKey="communication" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                        <Radar name="Motivation" dataKey="motivation" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                        <Radar name="Organization" dataKey="organization" stroke="#ff8042" fill="#ff8042" fillOpacity={0.6} />
                        <Radar name="Adaptability" dataKey="adaptability" stroke="#a4de6c" fill="#a4de6c" fillOpacity={0.6} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        // Detailed instructor view
        detailedMetrics && (
          <div className="space-y-6">
            {/* Instructor header card */}
            <Card>
              <CardContent className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                  {detailedMetrics.profileImage ? (
                    <img 
                      src={detailedMetrics.profileImage} 
                      alt={detailedMetrics.name} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-gray-400">{detailedMetrics.name.charAt(0)}</span>
                  )}
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold">{detailedMetrics.name}</h2>
                  <p className="text-gray-500">Instructor</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Classes Taught</p>
                      <p className="text-xl font-bold">{detailedMetrics.totalClasses}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Students</p>
                      <p className="text-xl font-bold">{detailedMetrics.totalStudents}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg. Attendance</p>
                      <p className="text-xl font-bold">{detailedMetrics.avgAttendance}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Retention Rate</p>
                      <p className="text-xl font-bold">{detailedMetrics.retentionRate}%</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedInstructor(null)}
                  >
                    Back to Overview
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Instructor detailed metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Class Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Class Types</CardTitle>
                  <CardDescription>Distribution of classes taught by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={detailedMetrics.classTypes}
                        margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="type"
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                          tickMargin={25}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Classes" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Monthly Attendance */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Attendance</CardTitle>
                  <CardDescription>Average attendance rate by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={detailedMetrics.attendanceByMonth}
                        margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                          tickMargin={25}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="attendance" 
                          name="Attendance Rate" 
                          stroke="#8884d8" 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Student Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Feedback</CardTitle>
                  <CardDescription>Average ratings across categories (out of 5)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={detailedMetrics.studentFeedback}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} />
                        <Radar 
                          name="Score" 
                          dataKey="score" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6} 
                        />
                        <Tooltip formatter={(value) => [value, 'Rating']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Link to Student List */}
              <Card>
                <CardHeader>
                  <CardTitle>Instructor Actions</CardTitle>
                  <CardDescription>Quick links for instructor management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link
                    href={`/admin/instructors/${detailedMetrics.instructorId}/edit`}
                    className="flex items-center p-4 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">Edit Instructor Profile</h3>
                      <p className="text-sm text-gray-500">Update instructor details and specialties</p>
                    </div>
                  </Link>
                  
                  <Link
                    href={`/admin/instructors/${detailedMetrics.instructorId}/schedule`}
                    className="flex items-center p-4 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">Manage Class Schedule</h3>
                      <p className="text-sm text-gray-500">Assign or update instructor classes</p>
                    </div>
                  </Link>
                  
                  <Link
                    href={`/admin/instructors/${detailedMetrics.instructorId}/students`}
                    className="flex items-center p-4 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">View Students</h3>
                      <p className="text-sm text-gray-500">See all students taught by this instructor</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      )}
    </div>
  );
} 