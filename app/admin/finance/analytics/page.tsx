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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, FileDown, Filter, Activity, DollarSign, TrendingUp, Users, Calendar } from 'lucide-react'

// Types for financial analytics data
type RevenueByCategory = {
  category: string;
  amount: number;
}

type RevenueByTime = {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
}

type ProfitMargin = {
  period: string;
  margin: number;
}

type CustomerLifetimeValue = {
  segment: string;
  value: number;
}

type FinancialSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  memberLifetimeValue: number;
  averageRevenuePerMember: number;
}

export default function FinancialAnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory[]>([]);
  const [revenueByTime, setRevenueByTime] = useState<RevenueByTime[]>([]);
  const [profitMargins, setProfitMargins] = useState<ProfitMargin[]>([]);
  const [customerValues, setCustomerValues] = useState<CustomerLifetimeValue[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    memberLifetimeValue: 0,
    averageRevenuePerMember: 0
  });
  const [exportLoading, setExportLoading] = useState(false);
  
  // Colors for pie chart
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
  
  // Fetch analytics data
  const fetchData = async (range: 'week' | 'month' | 'quarter' | 'year') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, fetch all this data from Supabase
      // For now, we'll use mock data
      
      // Mock Revenue By Category
      const revenueByCategoryData: RevenueByCategory[] = [
        { category: 'Memberships', amount: 42500 },
        { category: 'Private Classes', amount: 15800 },
        { category: 'Merchandise', amount: 8200 },
        { category: 'Seminars', amount: 7500 },
        { category: 'Other', amount: 3000 }
      ];
      
      // Mock Revenue By Time
      const revenueByTimeData: RevenueByTime[] = range === 'week' 
        ? generateWeeklyData() 
        : range === 'month' 
          ? generateMonthlyData() 
          : range === 'quarter'
            ? generateQuarterlyData()
            : generateYearlyData();
      
      // Mock Profit Margins
      const profitMarginData = revenueByTimeData.map(item => ({
        period: item.period,
        margin: Math.round((item.profit / item.revenue) * 100)
      }));
      
      // Mock Customer Lifetime Value
      const customerValueData: CustomerLifetimeValue[] = [
        { segment: '0-3 months', value: 250 },
        { segment: '3-6 months', value: 720 },
        { segment: '6-12 months', value: 1480 },
        { segment: '1-2 years', value: 3100 },
        { segment: '2+ years', value: 5800 }
      ];
      
      // Mock Financial Summary
      const totalRevenue = revenueByCategoryData.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = totalRevenue * 0.6; // Assume expenses are 60% of revenue
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = (netProfit / totalRevenue) * 100;
      
      const summaryData: FinancialSummary = {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        memberLifetimeValue: 3200,
        averageRevenuePerMember: 125
      };
      
      // Set state with mock data
      setRevenueByCategory(revenueByCategoryData);
      setRevenueByTime(revenueByTimeData);
      setProfitMargins(profitMarginData);
      setCustomerValues(customerValueData);
      setFinancialSummary(summaryData);
      
    } catch (err) {
      console.error('Failed to fetch financial analytics data:', err);
      setError('An unexpected error occurred while fetching financial analytics data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper functions to generate mock time-series data
  function generateWeeklyData(): RevenueByTime[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => {
      const revenue = Math.round(1000 + Math.random() * 2000);
      const expenses = Math.round(revenue * (0.5 + Math.random() * 0.2));
      return {
        period: day,
        revenue,
        expenses,
        profit: revenue - expenses
      };
    });
  }
  
  function generateMonthlyData(): RevenueByTime[] {
    return Array.from({ length: 30 }, (_, i) => {
      const revenue = Math.round(500 + Math.random() * 1500);
      const expenses = Math.round(revenue * (0.5 + Math.random() * 0.2));
      return {
        period: `Day ${i + 1}`,
        revenue,
        expenses,
        profit: revenue - expenses
      };
    });
  }
  
  function generateQuarterlyData(): RevenueByTime[] {
    const months = ['Jan', 'Feb', 'Mar'];
    return months.map(month => {
      const revenue = Math.round(15000 + Math.random() * 10000);
      const expenses = Math.round(revenue * (0.5 + Math.random() * 0.2));
      return {
        period: month,
        revenue,
        expenses,
        profit: revenue - expenses
      };
    });
  }
  
  function generateYearlyData(): RevenueByTime[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => {
      const revenue = Math.round(12000 + Math.random() * 8000);
      const expenses = Math.round(revenue * (0.5 + Math.random() * 0.2));
      return {
        period: month,
        revenue,
        expenses,
        profit: revenue - expenses
      };
    });
  }
  
  // Handle time range change
  const handleTimeRangeChange = (value: 'week' | 'month' | 'quarter' | 'year') => {
    setTimeRange(value);
    fetchData(value);
  };
  
  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Export data to CSV
  const handleExportCSV = async () => {
    setExportLoading(true);
    
    try {
      // Format financial data for CSV
      const csvRows = [
        // Header row
        ['Period', 'Revenue', 'Expenses', 'Profit', 'Profit Margin (%)'].join(',')
      ];
      
      // Data rows
      revenueByTime.forEach(item => {
        const margin = Math.round((item.profit / item.revenue) * 100);
        csvRows.push([
          item.period,
          item.revenue,
          item.expenses,
          item.profit,
          margin
        ].join(','));
      });
      
      // Create and download the CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `financial_analytics_${timeRange}.csv`);
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
        <h1 className="text-2xl font-bold mb-6">Financial Analytics</h1>
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
        <h1 className="text-2xl font-bold mb-6">Financial Analytics</h1>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Financial Analytics</h1>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <Select value={timeRange} onValueChange={(value: any) => handleTimeRangeChange(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
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
                <Download className="mr-2 h-4 w-4" /> Export CSV
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
      
      {/* Financial summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">+{Math.round(Math.random() * 10)}% from previous {timeRange}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialSummary.netProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.profitMargin.toFixed(1)}% profit margin
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue Per Member</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialSummary.averageRevenuePerMember)}</div>
            <p className="text-xs text-muted-foreground">
              Monthly average per active member
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main analytics tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Breakdown</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="members">Member Value</TabsTrigger>
        </TabsList>
        
        {/* Revenue tab */}
        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
              <CardDescription>Breakdown of revenue sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                      nameKey="category"
                    >
                      {revenueByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Amount']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Revenue Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>Revenue trend for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueByTime}
                    margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tickMargin={25}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip formatter={(value: any) => [formatCurrency(value), 'Amount']} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stroke="#82ca9d" fill="#82ca9d" name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Profitability tab */}
        <TabsContent value="profitability" className="space-y-6">
          {/* Profit Margin Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin Trend</CardTitle>
              <CardDescription>Profit margin percentage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={profitMargins}
                    margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tickMargin={25}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Profit Margin']} />
                    <Legend />
                    <Line type="monotone" dataKey="margin" stroke="#ff7300" name="Profit Margin" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Revenue & Profit Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Profit Comparison</CardTitle>
              <CardDescription>Comparing revenue, expenses and profits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueByTime}
                    margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tickMargin={25}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip formatter={(value: any) => [formatCurrency(value), 'Amount']} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="expenses" fill="#82ca9d" name="Expenses" />
                    <Bar dataKey="profit" fill="#ffc658" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Members tab */}
        <TabsContent value="members" className="space-y-6">
          {/* Customer Lifetime Value */}
          <Card>
            <CardHeader>
              <CardTitle>Member Lifetime Value</CardTitle>
              <CardDescription>Average value by membership length</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={customerValues}
                    margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="segment" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tickMargin={25}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip formatter={(value: any) => [formatCurrency(value), 'Lifetime Value']} />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Customer Lifetime Value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 