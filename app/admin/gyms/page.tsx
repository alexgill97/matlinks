import { createClient } from '@/app/lib/supabase/server'
import Link from 'next/link' // Import Link

async function getGyms() {
  const supabase = createClient()
  // TODO: Add proper error handling and role checks
  const { data: gyms, error } = await supabase
    .from('gyms')
    .select('id, name, description')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching gyms:', error)
    return []
  }
  return gyms
}

export default async function GymsAdminPage() {
  const gyms = await getGyms()

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gym Management</h1>
        <Link href="/admin/gyms/new" className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
          Add New Gym
        </Link>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-secondary-500">Name</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-secondary-500">Description</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {gyms?.map((gym) => (
              <tr key={gym.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-secondary-900">{gym.name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-secondary-500 whitespace-pre-wrap">{gym.description}</td>
                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                  {/* TODO: Link to edit page */}
                  <a href={`/admin/gyms/${gym.id}/edit`} className="text-primary-600 hover:text-primary-900">Edit</a>
                </td>
              </tr>
            ))}
            {gyms?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-sm text-center text-secondary-500">No gyms found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 