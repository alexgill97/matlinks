'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getClassType, updateClassType, deleteClassType } from './actions'

export default function EditClassTypePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [classType, setClassType] = useState<any>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [defaultCapacity, setDefaultCapacity] = useState('')
  const [color, setColor] = useState('')
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    async function loadClassType() {
      try {
        const response = await getClassType(params.id)
        if (response.error) {
          setError(response.error)
          setIsLoading(false)
          return
        }
        
        const data = response.data
        setClassType(data)
        
        // Populate form fields
        setName(data.name || '')
        setDescription(data.description || '')
        setDifficultyLevel(data.difficulty_level || '')
        setDurationMinutes(data.duration_minutes?.toString() || '')
        setDefaultCapacity(data.default_capacity?.toString() || '')
        setColor(data.color || '')
        setIsActive(data.is_active)
        
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load class type:', err)
        setError('Failed to load class type. Please try again.')
        setIsLoading(false)
      }
    }
    
    loadClassType()
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
      formData.append('difficulty_level', difficultyLevel)
      formData.append('duration_minutes', durationMinutes)
      formData.append('default_capacity', defaultCapacity)
      formData.append('color', color)
      formData.append('is_active', isActive.toString())
      
      const response = await updateClassType(formData)
      
      if (response.error) {
        setError(response.error)
        setIsSaving(false)
        return
      }
      
      router.push('/admin/class-types')
      router.refresh()
    } catch (err) {
      console.error('Failed to update class type:', err)
      setError('Failed to update class type. Please try again.')
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this class type? This action cannot be undone.')) {
      return
    }
    
    setIsDeleting(true)
    setError(null)
    
    try {
      const response = await deleteClassType(params.id)
      
      if (response.error) {
        setError(response.error)
        setIsDeleting(false)
        return
      }
      
      router.push('/admin/class-types')
      router.refresh()
    } catch (err) {
      console.error('Failed to delete class type:', err)
      setError('Failed to delete class type. Please try again.')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading class type information...</div>
  }

  if (error && !classType) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/admin/class-types">
            <Button variant="secondary">Back to Class Types</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Class Type</h1>
        <Link href="/admin/class-types">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-base">
              Class Type Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description" className="text-base">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="difficulty_level" className="text-base">Difficulty Level</Label>
            <select
              id="difficulty_level"
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="All Levels">All Levels</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration_minutes" className="text-base">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="mt-1"
                min="0"
              />
            </div>
            
            <div>
              <Label htmlFor="default_capacity" className="text-base">Default Capacity</Label>
              <Input
                id="default_capacity"
                type="number"
                value={defaultCapacity}
                onChange={(e) => setDefaultCapacity(e.target.value)}
                className="mt-1"
                min="0"
                placeholder="Leave empty for unlimited"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="color" className="text-base">Calendar Color (optional)</Label>
            <Input
              id="color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1"
              placeholder="#3B82F6"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use a hex color code (e.g., #3B82F6 for blue)
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={isActive}
              onCheckedChange={() => setIsActive(!isActive)}
            />
            <Label htmlFor="is_active" className="text-base">
              Active
            </Label>
          </div>
        </div>
        
        <div className="flex space-x-4 justify-between items-center pt-4">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Class Type'}
          </Button>
          
          <div className="flex space-x-4">
            <Link href="/admin/class-types">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
} 