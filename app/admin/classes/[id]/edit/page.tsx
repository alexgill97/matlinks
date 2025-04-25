'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { getClass, updateClass } from './actions'

export default function EditClassPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxCapacity, setMaxCapacity] = useState('')
  const [requiresBooking, setRequiresBooking] = useState(false)
  const [locationId, setLocationId] = useState('')
  const [classType, setClassType] = useState('')
  const [locations, setLocations] = useState<{ id: string, name: string }[]>([])
  const [classTypes, setClassTypes] = useState<{ id: string, name: string }[]>([])

  useEffect(() => {
    async function loadClassData() {
      try {
        const response = await getClass(params.id)
        if (response.error) {
          setError(response.error)
          setIsLoading(false)
          return
        }
        
        const { classData, locationOptions, classTypeOptions } = response.data
        setName(classData.name || '')
        setDescription(classData.description || '')
        setMaxCapacity(classData.maxCapacity?.toString() || '')
        setRequiresBooking(classData.requiresBooking || false)
        setLocationId(classData.locationId || '')
        setClassType(classData.classType || '')
        setLocations(locationOptions || [])
        setClassTypes(classTypeOptions || [])
        
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load class:', err)
        setError('Failed to load class. Please try again.')
        setIsLoading(false)
      }
    }
    
    loadClassData()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('id', params.id)
      formData.append('name', name)
      formData.append('description', description)
      formData.append('maxCapacity', maxCapacity)
      formData.append('requiresBooking', String(requiresBooking))
      formData.append('locationId', locationId)
      formData.append('classType', classType)
      
      const response = await updateClass(formData)
      
      if (response.error) {
        setError(response.error)
        setIsSaving(false)
        return
      }
      
      router.push('/admin/classes')
      router.refresh()
    } catch (err) {
      console.error('Failed to update class:', err)
      setError('Failed to update class. Please try again.')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-10">
        <p>Loading class information...</p>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Edit Class</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Class Details</CardTitle>
          <CardDescription>Update the class information below</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <select
                  id="location"
                  className="w-full p-2 border rounded-md"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                >
                  <option value="">Select Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="classType">Class Type</Label>
                <select
                  id="classType"
                  className="w-full p-2 border rounded-md"
                  value={classType}
                  onChange={(e) => setClassType(e.target.value)}
                  required
                >
                  <option value="">Select Class Type</option>
                  {classTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Booking Settings</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requiresBooking" className="text-base">
                    Enable Reservations
                  </Label>
                  <p className="text-sm text-gray-500">
                    When enabled, students must book this class in advance
                  </p>
                </div>
                <Switch
                  id="requiresBooking"
                  checked={requiresBooking}
                  onCheckedChange={setRequiresBooking}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Maximum Capacity</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  min="1"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  disabled={!requiresBooking}
                />
                <p className="text-xs text-gray-500">
                  Maximum number of students allowed in this class. Students will be added to a waitlist when capacity is reached.
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/classes')}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 