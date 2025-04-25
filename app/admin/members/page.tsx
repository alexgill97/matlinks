'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowUpDown, 
  Plus, 
  Search, 
  Download, 
  MoreHorizontal,
  Edit,
  Trash,
  UserPlus,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Member = {
  id: string
  full_name: string
  email: string
  phone?: string
  status: string
  belt_rank?: string
  joined_date: string
  profile_image_url?: string
}

export default function MembersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string>('full_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
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

      if (error || !userData || !['admin', 'owner'].includes(userData.role)) {
        router.push('/dashboard')
      } else {
        fetchMembers()
      }
    }

    checkUserRole()
  }, [supabase, router])
  
  const fetchMembers = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          belt_rank,
          profile_image_url
        `)
      
      if (profilesError) throw profilesError
      
      // Fetch memberships to get status
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select(`
          id,
          profile_id,
          status,
          active_until
        `)
      
      if (membershipsError) throw membershipsError
      
      // Combine data
      const membersData = profiles?.map(profile => {
        // Find the most recent membership for this profile
        const profileMemberships = memberships?.filter(m => m.profile_id === profile.id) || []
        const activeMembership = profileMemberships.find(m => m.status === 'active')
        const anyMembership = profileMemberships[0]
        
        const membershipStatus = activeMembership ? 'active' : 
                              anyMembership ? anyMembership.status : 'none'
        
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          status: membershipStatus,
          belt_rank: profile.belt_rank,
          joined_date: profile.created_at,
          profile_image_url: profile.profile_image_url
        }
      }) || []
      
      setMembers(membersData)
      setFilteredMembers(membersData)
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching members:', err)
      setError('Failed to load members. Please try again later.')
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    // Apply filters and search
    let filtered = [...members]
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter)
    }
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        member => 
          member.full_name.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term) ||
          (member.phone && member.phone.includes(term))
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortColumn as keyof Member]
      const bValue = b[sortColumn as keyof Member]
      
      if (!aValue && !bValue) return 0
      if (!aValue) return 1
      if (!bValue) return -1
      
      const comparison = String(aValue).localeCompare(String(bValue))
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    setFilteredMembers(filtered)
  }, [members, statusFilter, searchTerm, sortColumn, sortDirection])
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }
  
  const exportMembers = () => {
    // Create CSV content
    const headers = ['Full Name', 'Email', 'Phone', 'Status', 'Rank', 'Joined Date']
    const csvRows = [headers]
    
    filteredMembers.forEach(member => {
      csvRows.push([
        member.full_name,
        member.email,
        member.phone || '',
        member.status,
        member.belt_rank || '',
        formatDate(member.joined_date)
      ])
    })
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `members-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Member Management</h1>
        <Link href="/admin/members/new">
          <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add New Member
          </Button>
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search members..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="none">No Membership</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" onClick={exportMembers} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort('full_name')} className="cursor-pointer">
                  <div className="flex items-center">
                    Name 
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('email')} className="cursor-pointer">
                  <div className="flex items-center">
                    Email
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('belt_rank')} className="cursor-pointer hidden md:table-cell">
                  <div className="flex items-center">
                    Rank
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                  <div className="flex items-center">
                    Status
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('joined_date')} className="cursor-pointer hidden lg:table-cell">
                  <div className="flex items-center">
                    Joined
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {member.profile_image_url ? (
                            <img 
                              src={member.profile_image_url} 
                              alt={member.full_name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-500 font-medium">
                              {member.full_name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="font-medium">{member.full_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {member.belt_rank || '-'}
                    </TableCell>
                    <TableCell>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium inline-block
                        ${member.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        ${member.status === 'expired' ? 'bg-red-100 text-red-800' : ''}
                        ${member.status === 'trial' ? 'bg-blue-100 text-blue-800' : ''}
                        ${member.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : ''}
                        ${member.status === 'none' ? 'bg-yellow-100 text-yellow-800' : ''}
                      `}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatDate(member.joined_date)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/admin/members/${member.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/members/${member.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => router.push(`/admin/members/${member.id}/membership`)}
                            className="text-blue-600"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Manage Membership
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            // In a real app, this would show a confirmation dialog
                            onClick={() => alert(`Delete ${member.full_name}? (Not implemented)`)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
} 