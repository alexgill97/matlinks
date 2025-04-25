'use server';

import { createClient } from '@/app/lib/supabase/server';
import Link from 'next/link';

// Type for rank progression history record
type RankProgressionRecord = {
  id: number;
  member_id: string;
  member_name: string;
  rank_id: number;
  rank_name: string;
  previous_rank_name: string | null;
  awarded_at: string;
  awarded_by: string | null;
  notes: string | null;
};

// Type for raw data returned from Supabase
type SupabaseRankProgressionRecord = {
  id: number;
  member_id: string;
  rank_id: number;
  awarded_at: string;
  awarded_by: string | null;
  notes: string | null;
  profiles: { full_name: string | null }[];
  ranks: { name: string | null }[];
  previous_rank: { name: string | null }[];
};

// Fetch rank progression history
async function fetchRankHistory(): Promise<RankProgressionRecord[]> {
  const supabase = createClient();
  
  // Join profiles, ranks, and rank_progressions tables
  const { data, error } = await supabase
    .from('rank_progressions')
    .select(`
      id,
      member_id,
      rank_id,
      awarded_at,
      awarded_by,
      notes,
      profiles (full_name),
      ranks (name),
      previous_rank:previous_rank_id (name)
    `)
    .order('awarded_at', { ascending: false });

  if (error) {
    console.error('Error fetching rank progression history:', error);
    return [];
  }

  // Map the joined data to our type
  return (data || []).map((record: SupabaseRankProgressionRecord) => ({
    id: record.id,
    member_id: record.member_id,
    member_name: record.profiles?.[0]?.full_name || 'Unknown Member',
    rank_id: record.rank_id,
    rank_name: record.ranks?.[0]?.name || 'Unknown Rank',
    previous_rank_name: record.previous_rank?.[0]?.name || null,
    awarded_at: record.awarded_at,
    awarded_by: record.awarded_by,
    notes: record.notes
  }));
}

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default async function RankHistoryPage() {
  const historyRecords = await fetchRankHistory();

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rank Progression History</h1>
        <Link href="/admin/ranks" className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
          Manage Ranks
        </Link>
      </div>

      {historyRecords.length === 0 ? (
        <div className="bg-white shadow rounded p-6 text-center">
          <p className="text-secondary-600">No rank progressions recorded yet.</p>
          <p className="text-sm text-secondary-500 mt-2">
            When members are promoted to new ranks, the history will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Promotion
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Awarded By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {historyRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                      {formatDate(record.awarded_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-primary-700">
                        <Link href={`/admin/members/${record.member_id}`} className="hover:underline">
                          {record.member_name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {record.previous_rank_name ? (
                          <>
                            <span className="text-sm text-secondary-500">{record.previous_rank_name}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-2 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        ) : (
                          <span className="text-sm text-secondary-500">Initial Rank:</span>
                        )}
                        <span className="ml-1 text-sm font-medium text-primary-600">{record.rank_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                      {record.awarded_by || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-500">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 