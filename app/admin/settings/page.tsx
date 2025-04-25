'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Users, 
  Bell, 
  Mail, 
  Clock, 
  Shield, 
  Database, 
  CreditCard,
  Check
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'

export default function SystemSettings() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // General settings state
  const [gymName, setGymName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [logoUrl, setLogoUrl] = useState('')
  
  // Business hours state
  const [businessHours, setBusinessHours] = useState({
    monday: { open: '09:00', close: '21:00', closed: false },
    tuesday: { open: '09:00', close: '21:00', closed: false },
    wednesday: { open: '09:00', close: '21:00', closed: false },
    thursday: { open: '09:00', close: '21:00', closed: false },
    friday: { open: '09:00', close: '21:00', closed: false },
    saturday: { open: '10:00', close: '18:00', closed: false },
    sunday: { open: '10:00', close: '16:00', closed: true }
  })
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    newMemberAlert: true,
    paymentFailureAlert: true,
    lowAttendanceAlert: false,
    classCapacityAlert: true,
    rankPromotionAlert: true,
    systemMaintenanceAlert: true,
    emailNotifications: true,
    smsNotifications: false
  })
  
  // System backup settings
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '03:00',
    retentionDays: 30
  })
  
  // Access roles state
  const [roles, setRoles] = useState([
    { id: 1, name: 'Owner', canManageSystem: true, canManageFinances: true, canManageMembers: true, canManageClasses: true, canViewReports: true },
    { id: 2, name: 'Admin', canManageSystem: false, canManageFinances: true, canManageMembers: true, canManageClasses: true, canViewReports: true },
    { id: 3, name: 'Manager', canManageSystem: false, canManageFinances: false, canManageMembers: true, canManageClasses: true, canViewReports: true },
    { id: 4, name: 'Instructor', canManageSystem: false, canManageFinances: false, canManageMembers: false, canManageClasses: false, canViewReports: false }
  ])
  
  useEffect(() => {
    const checkUserRole = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/auth/signin')
        return
      }

      const { data: userData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single()

      if (error || !userData || userData.role !== 'owner') {
        router.push('/admin/dashboard')
      } else {
        fetchSettings()
      }
    }

    checkUserRole()
  }, [supabase, router])
  
  const fetchSettings = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch gym settings
      const { data: gymSettings, error: gymError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('type', 'gym_info')
        .single()
      
      if (!gymError && gymSettings) {
        setGymName(gymSettings.gym_name || '')
        setContactEmail(gymSettings.contact_email || '')
        setPhone(gymSettings.phone || '')
        setTimezone(gymSettings.timezone || 'America/New_York')
        setLogoUrl(gymSettings.logo_url || '')
      }
      
      // Fetch business hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('type', 'business_hours')
        .single()
      
      if (!hoursError && hoursData && hoursData.hours) {
        setBusinessHours(hoursData.hours)
      }
      
      // Fetch notification settings
      const { data: notificationData, error: notificationError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('type', 'notifications')
        .single()
      
      if (!notificationError && notificationData && notificationData.settings) {
        setNotificationSettings(notificationData.settings)
      }
      
      // Fetch backup settings
      const { data: backupData, error: backupError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('type', 'backup')
        .single()
      
      if (!backupError && backupData && backupData.settings) {
        setBackupSettings(backupData.settings)
      }
      
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('system_roles')
        .select('*')
        .order('id')
      
      if (!rolesError && rolesData && rolesData.length > 0) {
        setRoles(rolesData)
      }
      
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load system settings. Please try again later.')
      setIsLoading(false)
    }
  }
  
  const saveGeneralSettings = async () => {
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          type: 'gym_info',
          gym_name: gymName,
          contact_email: contactEmail,
          phone: phone,
          timezone: timezone,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      showSaveSuccess()
    } catch (err) {
      console.error('Error saving general settings:', err)
      setError('Failed to save general settings')
    }
    
    setIsSaving(false)
  }
  
  const saveBusinessHours = async () => {
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          type: 'business_hours',
          hours: businessHours,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      showSaveSuccess()
    } catch (err) {
      console.error('Error saving business hours:', err)
      setError('Failed to save business hours')
    }
    
    setIsSaving(false)
  }
  
  const saveNotificationSettings = async () => {
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          type: 'notifications',
          settings: notificationSettings,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      showSaveSuccess()
    } catch (err) {
      console.error('Error saving notification settings:', err)
      setError('Failed to save notification settings')
    }
    
    setIsSaving(false)
  }
  
  const saveBackupSettings = async () => {
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          type: 'backup',
          settings: backupSettings,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      showSaveSuccess()
    } catch (err) {
      console.error('Error saving backup settings:', err)
      setError('Failed to save backup settings')
    }
    
    setIsSaving(false)
  }
  
  const updateBusinessHours = (day: string, field: string, value: any) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value
      }
    }))
  }
  
  const showSaveSuccess = () => {
    // In a real app, you'd use a toast notification system
    alert('Settings saved successfully!')
  }
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-12 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-gray-500">Configure and manage system settings and preferences</p>
      </div>
      
      <Tabs defaultValue="general" className="mb-6">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="business-hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Business Hours
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Backup & Restore
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic gym information used throughout the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gym-name">Gym Name</Label>
                  <Input 
                    id="gym-name" 
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="Enter your gym name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input 
                    id="contact-email" 
                    type="email" 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="logo-url">Logo URL</Label>
                  <Input 
                    id="logo-url" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Enter URL to your gym logo"
                  />
                  <p className="text-sm text-gray-500">Logo appears on the dashboard and system emails</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={saveGeneralSettings} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Business Hours */}
        <TabsContent value="business-hours">
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Configure your gym's operating hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.keys(businessHours).map((day) => (
                  <div key={day} className="flex items-center space-x-4">
                    <div className="w-24 font-medium">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={!businessHours[day as keyof typeof businessHours].closed} 
                        onCheckedChange={(checked) => 
                          updateBusinessHours(day, 'closed', !checked)
                        }
                      />
                      <span className="text-sm">
                        {businessHours[day as keyof typeof businessHours].closed ? 'Closed' : 'Open'}
                      </span>
                    </div>
                    
                    {!businessHours[day as keyof typeof businessHours].closed && (
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="time" 
                          className="w-32"
                          value={businessHours[day as keyof typeof businessHours].open}
                          onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                        />
                        <span>to</span>
                        <Input 
                          type="time" 
                          className="w-32"
                          value={businessHours[day as keyof typeof businessHours].close}
                          onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="flex justify-end mt-6">
                  <Button onClick={saveBusinessHours} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Hours'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure system and user notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Admin Alerts</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="new-member-alert" className="flex-1">New Member Alert</Label>
                      <Switch 
                        id="new-member-alert"
                        checked={notificationSettings.newMemberAlert}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, newMemberAlert: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="payment-failure-alert" className="flex-1">Payment Failure Alert</Label>
                      <Switch 
                        id="payment-failure-alert"
                        checked={notificationSettings.paymentFailureAlert}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, paymentFailureAlert: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="low-attendance-alert" className="flex-1">Low Attendance Alert</Label>
                      <Switch 
                        id="low-attendance-alert"
                        checked={notificationSettings.lowAttendanceAlert}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, lowAttendanceAlert: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="class-capacity-alert" className="flex-1">Class Capacity Alert</Label>
                      <Switch 
                        id="class-capacity-alert"
                        checked={notificationSettings.classCapacityAlert}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, classCapacityAlert: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rank-promotion-alert" className="flex-1">Rank Promotion Alert</Label>
                      <Switch 
                        id="rank-promotion-alert"
                        checked={notificationSettings.rankPromotionAlert}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, rankPromotionAlert: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="system-maintenance-alert" className="flex-1">System Maintenance Alert</Label>
                      <Switch 
                        id="system-maintenance-alert"
                        checked={notificationSettings.systemMaintenanceAlert}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, systemMaintenanceAlert: checked }))}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notifications" className="flex-1">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          Email Notifications
                        </div>
                      </Label>
                      <Switch 
                        id="email-notifications"
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-notifications" className="flex-1">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          SMS Notifications
                        </div>
                      </Label>
                      <Switch 
                        id="sms-notifications"
                        checked={notificationSettings.smsNotifications}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={saveNotificationSettings} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Backup & Restore */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>Configure system backup settings and restore data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-backup" className="flex-1">Automatic Backups</Label>
                  <Switch 
                    id="auto-backup"
                    checked={backupSettings.autoBackup}
                    onCheckedChange={(checked) => setBackupSettings(prev => ({ ...prev, autoBackup: checked }))}
                  />
                </div>
                
                {backupSettings.autoBackup && (
                  <div className="pl-6 space-y-4 border-l-2 border-gray-200">
                    <div className="space-y-2">
                      <Label htmlFor="backup-frequency">Backup Frequency</Label>
                      <Select 
                        value={backupSettings.backupFrequency} 
                        onValueChange={(value) => setBackupSettings(prev => ({ ...prev, backupFrequency: value }))}
                      >
                        <SelectTrigger id="backup-frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="backup-time">Backup Time</Label>
                      <Input 
                        id="backup-time" 
                        type="time" 
                        value={backupSettings.backupTime}
                        onChange={(e) => setBackupSettings(prev => ({ ...prev, backupTime: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="retention-days">Retention Period (days)</Label>
                      <Input 
                        id="retention-days" 
                        type="number" 
                        min="1" 
                        value={backupSettings.retentionDays}
                        onChange={(e) => setBackupSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Manual Backup & Restore</h3>
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full sm:w-auto">Create Manual Backup</Button>
                    
                    <div className="p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium mb-2">Recent Backups</h4>
                      <div className="text-sm text-gray-500">
                        <p>Last automatic backup: Today at 03:00 AM</p>
                        <p>Last manual backup: 3 days ago</p>
                      </div>
                      <Button variant="link" className="p-0 h-auto text-sm mt-2">View all backups</Button>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 rounded-md">
                      <h4 className="font-medium text-yellow-800 mb-2">Restore from Backup</h4>
                      <p className="text-sm text-yellow-700 mb-3">
                        Warning: Restoring from a backup will replace all current data. This action cannot be undone.
                      </p>
                      <Button variant="outline" className="bg-white">
                        Restore System
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={saveBackupSettings} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Backup Settings'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Roles & Permissions */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Manage system access roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-center py-3 px-4">System Settings</th>
                        <th className="text-center py-3 px-4">Finances</th>
                        <th className="text-center py-3 px-4">Members</th>
                        <th className="text-center py-3 px-4">Classes</th>
                        <th className="text-center py-3 px-4">Reports</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role) => (
                        <tr key={role.id} className="border-b">
                          <td className="py-4 px-4 font-medium">{role.name}</td>
                          <td className="py-4 px-4 text-center">
                            {role.canManageSystem ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <span className="block h-5 w-5 mx-auto"></span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {role.canManageFinances ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <span className="block h-5 w-5 mx-auto"></span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {role.canManageMembers ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <span className="block h-5 w-5 mx-auto"></span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {role.canManageClasses ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <span className="block h-5 w-5 mx-auto"></span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {role.canViewReports ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <span className="block h-5 w-5 mx-auto"></span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <Button variant="outline">Manage Role Permissions</Button>
                  <Button variant="outline">Add Custom Role</Button>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">User Assignment</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Assign staff members to specific roles to control their system access.
                  </p>
                  <Button variant="outline" className="bg-white">
                    <Users className="h-4 w-4 mr-2" />
                    Manage User Roles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 