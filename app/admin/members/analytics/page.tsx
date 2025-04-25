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
  PieChart, 
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Activity, TrendingDown, Users, Award } from 'lucide-react'

// Types for member analytics data
type MemberGrowth = {
  month: string;
  newSignups: number;
  cancellations: number;
  netGrowth: number;
}

type RetentionRate = {
  month: string;
  rate: number;
}

type RankDistribution = {
  rank: string;
  count: number;
  color: string;
}

type ChurnRisk = {
  id: string;
  name: string;
  lastAttendance: string;
  memberSince: string;
  attendanceRate: number;
  riskScore: number;
}

type MemberEngagement = {
  id: string;
  x: number; // months as member
  y: number; // attendance rate
  z: number; // size - risk score
  name: string;
}

type MembershipStats = {
  totalMembers: number;
  activeMembers: number;
  churnRate: number;
  averageLifespan: number;
  atRiskCount: number;
}

export default function MemberAnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'quarter' | 'year' | 'all'>('year');
  const [memberGrowth, setMemberGrowth] = useState<MemberGrowth[]>([]);
  const [retentionRates, setRetentionRates] = useState<RetentionRate[]>([]);
  const [rankDistribution, setRankDistribution] = useState<RankDistribution[]>([]);
  const [highChurnRiskMembers, setHighChurnRiskMembers] = useState<ChurnRisk[]>([]);
  const [memberEngagement, setMemberEngagement] = useState<MemberEngagement[]>([]);
  const [stats, setStats] = useState<MembershipStats>({
    totalMembers: 0,
    activeMembers: 0,
    churnRate: 0,
    averageLifespan: 0,
    atRiskCount: 0
  });
  const [exportLoading, setExportLoading] = useState(false);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const RANK_COLORS = {
    'WHITE': '#FFFFFF',
    'BLUE': '#2563EB',
    'PURPLE': '#9333EA',
    'BROWN': '#78350F',
    'BLACK': '#000000'
  };
  
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
  
  // Fetch analytics data
  const fetchData = async (range: 'quarter' | 'year' | 'all') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, fetch all this data from Supabase
      // For now, we'll use mock data
      
      // Mock Member Growth
      const growthData: MemberGrowth[] = range === 'quarter' 
        ? generateQuarterlyGrowthData() 
        : range === 'year' 
          ? generateYearlyGrowthData() 
          : generateAllTimeGrowthData();
      
      // Mock Retention Rates
      const retentionData: RetentionRate[] = growthData.map(item => ({
        month: item.month,
        rate: 75 + Math.random() * 20 // Random retention rate between 75-95%
      }));
      
      // Mock Rank Distribution
      const rankData: RankDistribution[] = [
        { rank: 'WHITE', count: 42, color: RANK_COLORS.WHITE },
        { rank: 'BLUE', count: 28, color: RANK_COLORS.BLUE },
        { rank: 'PURPLE', count: 15, color: RANK_COLORS.PURPLE },
        { rank: 'BROWN', count: 8, color: RANK_COLORS.BROWN },
        { rank: 'BLACK', count: 5, color: RANK_COLORS.BLACK }
      ];
      
      // Mock High Churn Risk Members
      const riskMembersData: ChurnRisk[] = [
        { id: '1', name: 'John Doe', lastAttendance: '2023-10-15', memberSince: '2023-08-01', attendanceRate: 25, riskScore: 85 },
        { id: '2', name: 'Jane Smith', lastAttendance: '2023-11-02', memberSince: '2022-04-15', attendanceRate: 40, riskScore: 75 },
        { id: '3', name: 'David Johnson', lastAttendance: '2023-10-28', memberSince: '2023-07-10', attendanceRate: 30, riskScore: 82 },
        { id: '4', name: 'Sarah Williams', lastAttendance: '2023-09-30', memberSince: '2023-01-20', attendanceRate: 15, riskScore: 90 },
        { id: '5', name: 'Michael Brown', lastAttendance: '2023-11-05', memberSince: '2023-05-12', attendanceRate: 35, riskScore: 70 }
      ];
      
      // Mock Member Engagement Scatter data
      const engagementData: MemberEngagement[] = Array.from({ length: 50 }, (_, i) => {
        const months = Math.floor(Math.random() * 24) + 1; // 1-24 months
        const attendance = Math.floor(Math.random() * 100); // 0-100%
        const risk = 100 - attendance * (0.7 + Math.random() * 0.3); // Risk formula
        
        return {
          id: `member-${i}`,
          x: months,
          y: attendance,
          z: risk,
          name: `Member ${i + 1}`
        };
      });
      
      // Mock Membership Stats
      const totalMembers = rankData.reduce((sum, item) => sum + item.count, 0);
      const activeMembers = Math.round(totalMembers * 0.85); // Assume 85% active
      const churnRate = 100 - retentionData[retentionData.length - 1].rate;
      const atRiskCount = riskMembersData.length;
      
      const statsData: MembershipStats = {
        totalMembers,
        activeMembers,
        churnRate,
        averageLifespan: 14, // 14 months average
        atRiskCount
      };
      
      // Set state with mock data
      setMemberGrowth(growthData);
      setRetentionRates(retentionData);
      setRankDistribution(rankData);
      setHighChurnRiskMembers(riskMembersData);
      setMemberEngagement(engagementData);
      setStats(statsData);
      
    } catch (err) {
      console.error('Failed to fetch member analytics data:', err);
      setError('An unexpected error occurred while fetching member analytics data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper functions to generate mock time-series data
  function generateQuarterlyGrowthData(): MemberGrowth[] {
    const months = ['Jan', 'Feb', 'Mar'];
    return months.map(month => {
      const newSignups = Math.round(5 + Math.random() * 10);
      const cancellations = Math.round(Math.random() * 5);
      return {
        month,
        newSignups,
        cancellations,
        netGrowth: newSignups - cancellations
      };
    });
  }
  
  function generateYearlyGrowthData(): MemberGrowth[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => {
      const newSignups = Math.round(5 + Math.random() * 15);
      const cancellations = Math.round(Math.random() * 8);
      return {
        month,
        newSignups,
        cancellations,
        netGrowth: newSignups - cancellations
      };
    });
  }
  
  function generateAllTimeGrowthData(): MemberGrowth[] {
    // Generate 24 months of data
    return Array.from({ length: 24 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (23 - i));
      const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      const newSignups = Math.round(5 + Math.random() * 15);
      const cancellations = Math.round(Math.random() * 8);
      return {
        month,
        newSignups,
        cancellations,
        netGrowth: newSignups - cancellations
      };
    });
  }
  
  // Handle time range change
  const handleTimeRangeChange = (value: 'quarter' | 'year' | 'all') => {
    setTimeRange(value);
    fetchData(value);
  };
  
  // Export data to CSV
  const handleExportCSV = async () => {
    setExportLoading(true);
    
    try {
      // Format churn risk data for CSV
      const csvRows = [
        // Header row
        ['ID', 'Name', 'Last Attendance', 'Member Since', 'Attendance Rate (%)', 'Risk Score (%)'].join(',')
      ];
      
      // Data rows
      highChurnRiskMembers.forEach(member => {
        csvRows.push([
          member.id,
          member.name,
          member.lastAttendance,
          member.memberSince,
          member.attendanceRate,
          member.riskScore
        ].join(','));
      });
      
      // Create and download the CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `churn_risk_members.csv`);
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
        <h1 className="text-2xl font-bold mb-6">Member Analytics</h1>
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
        <h1 className="text-2xl font-bold mb-6">Member Analytics</h1>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Member Analytics</h1>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <Select value={timeRange} onValueChange={(value: 'quarter' | 'year' | 'all') => handleTimeRangeChange(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExportCSV} disabled={exportLoading}>
            {exportLoading ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2">⏳</span> Exporting...
              </span>
            ) : (
              <span className="flex items-center">
                <Download className="mr-2 h-4 w-4" /> Export Risk Data
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
      
      {/* Member stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Total registered members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.activeMembers / stats.totalMembers) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Monthly membership cancellations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Lifespan</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageLifespan} mo</div>
            <p className="text-xs text-muted-foreground">
              Average membership duration
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.atRiskCount}</div>
            <p className="text-xs text-muted-foreground">
              Members at high churn risk
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main analytics tabs */}
      <Tabs defaultValue="lifecycle" className="space-y-6">
        <TabsList>
          <TabsTrigger value="lifecycle">Member Lifecycle</TabsTrigger>
          <TabsTrigger value="retention">Retention Analysis</TabsTrigger>
          <TabsTrigger value="ranks">Rank Distribution</TabsTrigger>
        </TabsList>
        
        {/* Lifecycle tab */}
        <TabsContent value="lifecycle" className="space-y-6">
          {/* Member Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Member Growth</CardTitle>
              <CardDescription>New signups, cancellations, and net growth over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={memberGrowth}
                    margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tickMargin={25}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="newSignups" name="New Signups" fill="#4ade80" />
                    <Bar dataKey="cancellations" name="Cancellations" fill="#f87171" />
                    <Line
                      type="monotone"
                      dataKey="netGrowth"
                      name="Net Growth"
                      stroke="#6366f1"
                      strokeWidth={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Member Engagement Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle>Member Engagement Matrix</CardTitle>
              <CardDescription>Attendance rate vs. membership duration (bubble size indicates risk)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="x" 
                      name="Months as Member" 
                      unit=" mo"
                    />
                    <YAxis 
                      dataKey="y" 
                      name="Attendance Rate" 
                      unit="%"
                    />
                    <ZAxis 
                      dataKey="z" 
                      range={[50, 400]} 
                      name="Risk Score"
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value, name) => {
                        if (name === 'Risk Score') return [`${value}%`, name];
                        if (name === 'Months as Member') return [`${value} months`, name];
                        return [`${value}%`, name];
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2 border rounded shadow">
                              <p className="font-bold">{data.name}</p>
                              <p>Membership: {data.x} months</p>
                              <p>Attendance: {data.y}%</p>
                              <p>Risk Score: {Math.round(data.z)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Scatter 
                      name="Members" 
                      data={memberEngagement} 
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Retention tab */}
        <TabsContent value="retention" className="space-y-6">
          {/* Retention Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Retention Rate Trend</CardTitle>
              <CardDescription>Monthly member retention rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={retentionRates}
                    margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tickMargin={25}
                    />
                    <YAxis 
                      domain={[50, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Retention Rate']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="Retention Rate"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* High Churn Risk Members */}
          <Card>
            <CardHeader>
              <CardTitle>High Churn Risk Members</CardTitle>
              <CardDescription>Members with high probability of cancellation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Attendance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member Since
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {highChurnRiskMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {member.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(member.lastAttendance).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(member.memberSince).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {member.attendanceRate}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-white ${member.riskScore > 80 ? 'bg-red-500' : member.riskScore > 70 ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                            {member.riskScore}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Ranks tab */}
        <TabsContent value="ranks" className="space-y-6">
          {/* Rank Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Belt Rank Distribution</CardTitle>
              <CardDescription>Distribution of members by belt rank</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="h-80 w-full max-w-md">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rankDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="rank"
                    >
                      {rankDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke={entry.rank === 'WHITE' ? '#black' : undefined}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      formatter={(value) => <span style={{ color: RANK_COLORS[value as keyof typeof RANK_COLORS] }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-8">
                {rankDistribution.map((rank) => (
                  <div key={rank.rank} className="text-center">
                    <div 
                      className="w-6 h-6 mx-auto rounded" 
                      style={{ 
                        backgroundColor: rank.color,
                        border: rank.rank === 'WHITE' ? '1px solid black' : 'none'
                      }}
                    ></div>
                    <p className="mt-1 text-sm font-medium">{rank.rank}</p>
                    <p className="text-2xl font-bold">{rank.count}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((rank.count / stats.totalMembers) * 100)}% of total
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 