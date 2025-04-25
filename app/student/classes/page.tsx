import { Suspense } from 'react'
import { getBookableClasses } from './actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Calendar, Clock, MapPin, Users } from 'lucide-react'
import BookClassButton from './book-class-button'
import CancelBookingButton from './cancel-booking-button'

export default function ClassesPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-2">Available Classes</h1>
      <p className="text-gray-500 mb-6">Browse and book available classes at your gym</p>
      
      <Suspense fallback={<ClassesLoading />}>
        <ClassesList />
      </Suspense>
    </div>
  )
}

function ClassesLoading() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="h-9 bg-gray-200 rounded w-full"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

async function ClassesList() {
  const { data, error } = await getBookableClasses()
  
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
            <p className="text-gray-500 mb-4">No classes available for booking</p>
            <p className="text-sm text-gray-400">
              Check back later or contact the gym for class schedule information
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {data.map((classData) => {
        const isBooked = classData.userBookingStatus === 'CONFIRMED' || 
                         classData.userBookingStatus === 'WAITLISTED'
        const isWaitlisted = classData.userBookingStatus === 'WAITLISTED'
        const isFull = classData.spotsRemaining === 0 && !isBooked
        
        return (
          <Card key={classData.scheduleId} className="flex flex-col">
            <CardHeader>
              <CardTitle>{classData.className}</CardTitle>
              <CardDescription>{classData.classTypeName}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{new Date(classData.startTime).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <span>
                    {new Date(classData.startTime).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })} - {new Date(classData.endTime).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{classData.locationName}</span>
                </div>
                {classData.instructorName && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="inline-block h-4 w-4 rounded-full overflow-hidden bg-gray-200 mr-2">
                        {classData.instructorImage ? (
                          <img src={classData.instructorImage} alt={classData.instructorName} />
                        ) : (
                          <span className="h-full w-full flex items-center justify-center text-[10px] font-medium text-gray-500">
                            {classData.instructorName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                    </div>
                    <span>{classData.instructorName}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-gray-400" />
                  {classData.maxCapacity ? (
                    <span>
                      {isBooked ? 'You are booked' : `${classData.spotsRemaining} of ${classData.maxCapacity} spots left`}
                      {isWaitlisted && ' (Waitlisted)'}
                    </span>
                  ) : (
                    <span>Open attendance</span>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {isBooked ? (
                <div className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-green-600 font-medium">
                        {isWaitlisted ? 'On Waitlist' : 'Booked'}
                      </span>
                    </div>
                    {classData.bookingId ? (
                      <CancelBookingButton 
                        bookingId={classData.bookingId}
                        isWaitlisted={isWaitlisted}
                      />
                    ) : (
                      <div className="px-2 py-1 text-xs text-gray-400">
                        Cannot cancel
                      </div>
                    )}
                  </div>
                  {isWaitlisted && (
                    <p className="text-xs text-gray-500 mt-2">
                      Waitlist position: {classData.waitlistPosition}
                    </p>
                  )}
                </div>
              ) : (
                <BookClassButton 
                  scheduleId={classData.scheduleId}
                  isFull={isFull}
                  className="w-full"
                />
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
} 