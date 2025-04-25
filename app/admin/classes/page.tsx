import { Suspense } from 'react'
import Link from 'next/link'
import { getClasses } from './actions'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Type for class data
type ClassData = {
  id: string
  name: string
  description: string | null
  maxCapacity: number | null
  requiresBooking: boolean
  locationName: string
  classTypeName: string
}

export default function ClassesPage() {
  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Link href="/admin/classes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Class
          </Button>
        </Link>
      </div>
      
      <Suspense fallback={<div>Loading classes...</div>}>
        <ClassesList />
      </Suspense>
    </div>
  )
}

async function ClassesList() {
  const { data, error } = await getClasses()
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
        Error loading classes: {error}
      </div>
    )
  }
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">No classes found</p>
            <Link href="/admin/classes/new">
              <Button>Create your first class</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="grid gap-6">
      {data.map((classData: ClassData) => (
        <Card key={classData.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{classData.name}</CardTitle>
                <CardDescription>{classData.locationName}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/classes/${classData.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </Link>
                <Link href={`/admin/classes/${classData.id}/schedule`}>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-medium mb-1">Type</h3>
                <p>{classData.classTypeName}</p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Booking Status</h3>
                <div className="flex items-center gap-2">
                  {classData.requiresBooking ? (
                    <>
                      <Badge variant="success">Enabled</Badge>
                      {classData.maxCapacity && (
                        <span className="text-sm text-gray-500">
                          Max: {classData.maxCapacity} students
                        </span>
                      )}
                    </>
                  ) : (
                    <Badge variant="secondary">Not Required</Badge>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-1">Description</h3>
                <p className="text-gray-500">
                  {classData.description || 'No description provided'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 