import { createClient } from '@/app/lib/supabase/server'
import Link from 'next/link'

async function getLocations() {
  const supabase = createClient()
  // TODO: Add proper error handling and role checks
  // Join with gyms table to get gym name
  const { data: locations, error } = await supabase
    .from('locations')
    .select(`
      id,
      name,
      address,
      gyms ( id, name )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching locations:', error)
    return []
  }
  return locations
}

export default async function LocationsAdminPage() {
  const locations = await getLocations()

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Location Management</h1>
        <Link href="/admin/locations/new" className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
          Add New Location
        </Link>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-secondary-500">Name</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-secondary-500">Address</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-secondary-500">Gym</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {locations?.map((location) => (
              <tr key={location.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-secondary-900">{location.name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-secondary-500 whitespace-pre-wrap">{location.address}</td>
                 <td className="px-6 py-4 whitespace-nowrap">
                  {/* Cast to unknown first to bypass stricter linter check */}
                  <div className="text-sm text-secondary-700">{(location.gyms as unknown as { name: string } | null)?.name ?? 'N/A'}</div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                  {/* TODO: Link to edit page */}
                  <a href={`/admin/locations/${location.id}/edit`} className="text-primary-600 hover:text-primary-900">Edit</a>
                </td>
              </tr>
            ))}
            {locations?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm text-center text-secondary-500">No locations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 