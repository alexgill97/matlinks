'use client' // Need state and event handlers for delete

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client' // Use client Supabase
import Link from 'next/link'
import { deleteLocation } from '@/app/admin/gyms/[id]/locations/[locationId]/edit/actions' // Import delete action

type Location = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  // Add other relevant fields as needed
};

// Define Gym type locally if still needed for state
type Gym = {
  id: number;
  name: string;
};

// Convert to Client Component
export default function GymLocationsPage({ params }: { params: { id: string } }) {
  const supabase = createClient(); // Get client Supabase instance
  const gymId = parseInt(params.id, 10);

  // State variables
  const [gym, setGym] = useState<Gym | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null); // Track which location is being deleted

  // Fetch data function
  const fetchGymAndLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (isNaN(gymId)) {
        setError('Invalid Gym ID.');
        setIsLoading(false);
        return;
    }

    // Fetch gym details
    const { data: gymData, error: gymError } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('id', gymId)
      .single();

    if (gymError || !gymData) {
      console.error('Error fetching gym for locations page:', gymError);
      setError('Failed to load gym data.');
      setGym(null);
      setLocations([]);
      setIsLoading(false);
      // Optionally use notFound() if gym is critical and not found
      // notFound(); 
      return;
    }
    setGym(gymData);

    // Fetch locations for the gym
    const { data: locationsData, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, address, city')
      .eq('gym_id', gymId)
      .order('name', { ascending: true });

    if (locationsError) {
      console.error('Error fetching locations:', locationsError);
      setError('Failed to load locations.');
      setLocations([]);
    } else {
      setLocations(locationsData || []);
    }
    setIsLoading(false);
  }, [gymId, supabase]);

  // Fetch data on component mount
  useEffect(() => {
    fetchGymAndLocations();
  }, [fetchGymAndLocations]);

  // Handle location deletion
  const handleDelete = async (locationId: number, locationName: string) => {
     if (!window.confirm(`Are you sure you want to delete location "${locationName}"? This cannot be undone.`)) {
      return
    }
    setError(null); // Clear previous errors
    setIsDeleting(locationId); // Set deleting state for this specific location
    
    const result = await deleteLocation(locationId, gymId) // Call server action
    
    setIsDeleting(null); // Reset deleting state
    
    if (result?.error) {
      setError(result.error); // Show error message
    } else {
      // Remove location from state on success
      setLocations(currentLocations => currentLocations.filter(loc => loc.id !== locationId));
      // Optionally show a success message
    }
  }

  // --- Render Logic ---
  if (isLoading) {
    return <div className="text-center p-6">Loading locations...</div>
  }

   if (isNaN(gymId)) {
     return <div className="text-center p-6 text-red-600">Invalid Gym ID.</div>
   }

  // Show general error if loading failed substantially
  if (error && !locations.length && !gym) {
     return <div className="text-center p-6 text-red-600">Error: {error}</div>
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Locations for {gym?.name || 'Gym'}</h1>
        <Link href={`/admin/gyms/${gymId}/locations/new`} passHref>
          <button className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
            Add New Location
          </button>
        </Link>
      </div>

      {locations.length === 0 ? (
        <p className="text-secondary-600">No locations found for this gym yet.</p>
      ) : (
        <div className="bg-white shadow rounded p-6">
          <ul className="divide-y divide-secondary-200">
            {locations.map((location) => (
              <li key={location.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-primary-800">{location.name}</p>
                  <p className="text-sm text-secondary-600">
                    {location.address}{location.city ? `, ${location.city}` : ''}
                  </p>
                </div>
                <div>
                   {/* Edit button */}
                   <Link href={`/admin/gyms/${gymId}/locations/${location.id}/edit`} passHref>
                     <button className="px-3 py-1 text-sm transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
                       Edit
                     </button>
                  </Link>
                   {/* Delete button */}
                   <button 
                     onClick={() => handleDelete(location.id, location.name)}
                     disabled={isDeleting === location.id} // Disable only the button being processed
                     className={`ml-2 px-3 py-1 text-sm font-medium text-white transition duration-150 ease-in-out rounded ${isDeleting === location.id ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-70`}
                   >
                     {isDeleting === location.id ? 'Deleting...' : 'Delete'}
                   </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 