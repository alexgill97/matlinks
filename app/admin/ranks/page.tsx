'use server'

import { createClient } from '@/app/lib/supabase/server'
import Link from 'next/link'

// --- Types ---
type Rank = {
  id: number;
  name: string;
  description: string | null;
  order: number | null; // For sorting ranks logically
  // color: string | null; // Optional: for display
};

// --- Data Fetching ---
async function fetchRanks(): Promise<Rank[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('ranks') // Assuming a 'ranks' table exists
    .select('id, name, description, order') 
    .order('order', { ascending: true, nullsFirst: false }) // Order by rank order
    .order('name', { ascending: true }); // Secondary sort by name

  if (error) {
    console.error('Error fetching ranks:', error);
    return [];
  }

  return data || [];
}

// --- Page Component ---
export default async function RanksPage() {
  
  const ranks = await fetchRanks();

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Ranks</h1>
        <div className="flex space-x-3">
          <Link href="/admin/ranks/history" passHref>
            <button className="px-4 py-2 font-semibold transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
              View Rank History
            </button>
          </Link>
          <Link href="/admin/ranks/new" passHref>
            <button className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
              Add New Rank
            </button>
          </Link>
        </div>
      </div>

      {ranks.length === 0 ? (
        <p className="text-secondary-600">No ranks defined yet.</p>
      ) : (
        <div className="bg-white shadow rounded p-6">
          <ul className="divide-y divide-secondary-200">
            {ranks.map((rank) => (
              <li key={rank.id} className="py-4 flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <p className="text-lg font-semibold text-primary-800">
                    {rank.name}
                    {rank.order !== null && (
                        <span className="ml-2 text-sm font-normal text-secondary-500">(Order: {rank.order})</span>
                    )}
                  </p>
                  <p className="text-sm text-secondary-600 mt-1">
                    {rank.description || 'No description'}
                  </p>
                </div>
                <div className="flex-shrink-0 flex space-x-2">
                   {/* Edit button */} 
                   <Link href={`/admin/ranks/${rank.id}/edit`} passHref>
                     <button className="px-3 py-1 text-sm transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
                       Edit
                     </button>
                  </Link>
                  {/* TODO: Add Delete Button/Action here (consider implications if ranks are assigned) */}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 