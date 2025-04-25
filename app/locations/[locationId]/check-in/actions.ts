'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// The Supabase result type for the specific join query
type SupabaseProfileResult = {
    current_plan_id: number | null;
    membership_plans: {
        is_active: boolean;
        name: string;
    } | null;
}

// Membership verification result
export type MembershipVerificationResult = {
    isValid: boolean;
    error?: string;
    membershipDetails: {
        hasPlan: boolean;
        isActive: boolean;
        planName: string;
    }
}

// --- Verify Membership --- 
export async function verifyMembership(profileId: string): Promise<MembershipVerificationResult> {
    const supabase = createClient();
    
    if (!profileId) {
        return { 
            isValid: false,
            error: 'Member ID is missing.',
            membershipDetails: { hasPlan: false, isActive: false, planName: 'No Plan' }
        };
    }
    
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('current_plan_id, membership_plans:current_plan_id (is_active, name)')
            .eq('id', profileId)
            .single();
        
        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return { 
                isValid: false, 
                error: `Failed to verify membership: ${profileError.message}`,
                membershipDetails: { hasPlan: false, isActive: false, planName: 'Unknown' }
            };
        }
        
        const typedProfile = profile as unknown as SupabaseProfileResult;
        
        const hasPlan = !!typedProfile?.current_plan_id;
        const isActive = !!typedProfile?.membership_plans?.is_active;
        const planName = typedProfile?.membership_plans?.name || 'No Plan';
        
        return {
            isValid: hasPlan && isActive,
            membershipDetails: {
                hasPlan,
                isActive,
                planName
            }
        };
    } catch (err) {
        console.error('Error verifying membership:', err);
        return { 
            isValid: false, 
            error: `Failed to verify membership: ${err}`,
            membershipDetails: { hasPlan: false, isActive: false, planName: 'Unknown' }
        };
    }
}

// --- Record Check-in Action --- 
export async function recordCheckIn(
    profileId: string, 
    locationId: number, 
    classId?: number | null,
    checkInMethod: 'KIOSK' | 'MOBILE' | 'INSTRUCTOR' | 'ADMIN' = 'KIOSK'
) {
    
    const supabase = createClient();

    // --- Validate Inputs --- 
    if (!profileId) {
        return { error: 'Member ID is missing.' };
    }
    if (!locationId || isNaN(locationId)) {
        return { error: 'Location ID is missing or invalid.' };
    }
    // ---------------------

    // --- Authorization/Validation ---
    // Check if the member has an active membership plan
    const membershipResult = await verifyMembership(profileId);
    
    if (!membershipResult.isValid) {
        return { 
            error: membershipResult.error || 'Member does not have an active membership plan.',
            membershipDetails: membershipResult.membershipDetails
        };
    }
    // -----------------------------------------------------

    // --- Prepare Insert Data --- 
    const checkInData = {
        profile_id: profileId,
        location_id: locationId,
        class_id: classId || null,
        checked_in_at: new Date().toISOString(),
        check_in_method: checkInMethod
    };
    // --------------------------

    // --- Execute Insert --- 
    const { error: insertError } = await supabase
        .from('check_ins')
        .insert([checkInData]);
    // --------------------

    if (insertError) {
        console.error('Error recording check-in:', insertError);
        // Consider more specific error messages (e.g., FK violation?)
        return { error: `Failed to record check-in: ${insertError.message}` };
    }

    // --- Revalidate Paths ---
    // Revalidate paths if check-in history is displayed elsewhere
    revalidatePath(`/admin/attendance`);
    if (classId) {
        revalidatePath(`/admin/schedule`);
    }
    revalidatePath(`/admin/gyms/0/locations/${locationId}/members/${profileId}/edit`);
    // ---------------------------------

    console.log(`Successfully recorded check-in for profile ${profileId} at location ${locationId}${classId ? ` for class ${classId}` : ''}`);
    return { 
        error: null,
        success: true,
        membershipDetails: {
            planName: membershipResult.membershipDetails.planName,
            isActive: true
        }
    }; // Indicate success
} 