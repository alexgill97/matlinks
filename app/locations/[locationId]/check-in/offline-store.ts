// Client-side storage for offline check-ins
import { createClient } from '@/app/lib/supabase/client'

export type OfflineCheckIn = {
  id: string; // Unique client-generated ID
  profileId: string;
  locationId: number;
  classId: number | null;
  checkInMethod: 'KIOSK' | 'MOBILE' | 'INSTRUCTOR' | 'ADMIN';
  timestamp: string; // ISO string
  memberName?: string | null; // For better UX when showing pending check-ins
  className?: string | null; // For better UX when showing pending check-ins
  synced: boolean;
  retryCount: number;
}

const STORAGE_KEY = 'matlinks_offline_checkins';

// Get all pending check-ins
export function getPendingCheckIns(): OfflineCheckIn[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];
    
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error retrieving offline check-ins:', error);
    return [];
  }
}

// Save a check-in to offline storage
export function saveOfflineCheckIn(checkIn: Omit<OfflineCheckIn, 'id' | 'synced' | 'retryCount'>): string {
  const offlineCheckIns = getPendingCheckIns();
  
  // Generate unique ID
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Create new check-in with metadata
  const newCheckIn: OfflineCheckIn = {
    ...checkIn,
    id,
    synced: false,
    retryCount: 0
  };
  
  // Add to storage
  offlineCheckIns.push(newCheckIn);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offlineCheckIns));
  
  return id;
}

// Mark a check-in as synced
export function markCheckInSynced(id: string): void {
  const offlineCheckIns = getPendingCheckIns();
  const updatedCheckIns = offlineCheckIns.filter(checkIn => checkIn.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCheckIns));
}

// Update retry count
export function incrementRetryCount(id: string): void {
  const offlineCheckIns = getPendingCheckIns();
  const updatedCheckIns = offlineCheckIns.map(checkIn => {
    if (checkIn.id === id) {
      return {
        ...checkIn,
        retryCount: checkIn.retryCount + 1
      };
    }
    return checkIn;
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCheckIns));
}

// Sync all pending check-ins with the server
export async function syncOfflineCheckIns() {
  const pendingCheckIns = getPendingCheckIns();
  if (pendingCheckIns.length === 0) return { success: true, synced: 0 };
  
  const supabase = createClient();
  let syncedCount = 0;
  const errors = [];
  
  // Check if we're online
  if (!navigator.onLine) {
    return { success: false, message: 'Still offline', synced: 0 };
  }
  
  // Try to sync each check-in
  for (const checkIn of pendingCheckIns) {
    try {
      const { error } = await supabase
        .from('check_ins')
        .insert([{
          profile_id: checkIn.profileId,
          location_id: checkIn.locationId,
          class_id: checkIn.classId,
          checked_in_at: checkIn.timestamp,
          check_in_method: checkIn.checkInMethod
        }]);
      
      if (error) {
        console.error(`Error syncing check-in ${checkIn.id}:`, error);
        incrementRetryCount(checkIn.id);
        errors.push({ id: checkIn.id, error: error.message });
      } else {
        markCheckInSynced(checkIn.id);
        syncedCount++;
      }
    } catch (err) {
      console.error(`Error syncing check-in ${checkIn.id}:`, err);
      incrementRetryCount(checkIn.id);
      errors.push({ id: checkIn.id, error: String(err) });
    }
  }
  
  return { 
    success: syncedCount > 0, 
    synced: syncedCount,
    total: pendingCheckIns.length,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Check if there are any pending check-ins
export function hasPendingCheckIns(): boolean {
  return getPendingCheckIns().length > 0;
}

// Clear all pending check-ins (use with caution)
export function clearAllPendingCheckIns(): void {
  localStorage.removeItem(STORAGE_KEY);
} 