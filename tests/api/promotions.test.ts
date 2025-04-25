import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { POST as validatePromotion } from '@/app/api/promotions/validate/route';
import { POST as applyPromotion } from '@/app/api/promotions/apply/route';
import { POST as removePromotion } from '@/app/api/promotions/remove/route';

// Mock the createClient function
vi.mock('@/app/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

// Mock NextRequest
const createMockRequest = (body: Record<string, unknown>) => {
  return {
    json: vi.fn().mockResolvedValue(body)
  } as unknown as NextRequest;
};

// Mock Supabase Auth and DB responses
const mockSupabaseAuth = (authenticated: boolean) => {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(
        authenticated 
          ? { data: { user: { id: 'user-123' } }, error: null } 
          : { data: { user: null }, error: { message: 'Unauthorized' } }
      )
    }
  };
};

const mockSupabaseRPC = (validPromotion: boolean) => {
  return {
    rpc: vi.fn().mockImplementation((functionName: string) => {
      if (functionName === 'validate_promotion') {
        return {
          data: validPromotion ? [{ 
            is_valid: true, 
            message: 'Promotion is valid', 
            promotion_id: 1, 
            discount_type: 'percentage', 
            discount_value: 15 
          }] : [{ 
            is_valid: false, 
            message: 'Invalid promotion code',
            promotion_id: null,
            discount_type: null,
            discount_value: null
          }],
          error: null
        };
      }
      if (functionName === 'increment_promotion_uses') {
        return { data: null, error: null };
      }
      if (functionName === 'decrement_promotion_uses') {
        return { data: null, error: null };
      }
      return { data: null, error: { message: 'Unknown function' } };
    })
  };
};

const mockSupabaseDB = (success: boolean) => {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          success 
            ? { 
                data: table === 'member_profiles' 
                  ? { id: 'member-123' } 
                  : table === 'orders' 
                    ? { id: 123, promotion_id: 1 }
                    : { id: 1 }, 
                error: null 
              } 
            : { data: null, error: { message: 'Not found' } }
        )
      };
    })
  };
};

describe('Promotion API Endpoints', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Validate Promotion', () => {
    it('should return 401 if user is not authenticated', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(false)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({ code: 'TEST123' });
      const response = await validatePromotion(req);

      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if code is missing', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(true)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({});
      const response = await validatePromotion(req);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Promotion code is required' });
    });

    it('should return valid result for valid promotion', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(true),
        ...mockSupabaseRPC(true)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({ code: 'VALID123' });
      const response = await validatePromotion(req);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual({
        valid: true,
        message: 'Promotion is valid',
        promotion: {
          id: 1,
          discountType: 'percentage',
          discountValue: 15
        }
      });
    });

    it('should return invalid result for invalid promotion', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(true),
        ...mockSupabaseRPC(false)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({ code: 'INVALID123' });
      const response = await validatePromotion(req);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual({
        valid: false,
        message: 'Invalid promotion code'
      });
    });
  });

  describe('Apply Promotion', () => {
    it('should return 401 if user is not authenticated', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(false)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({ code: 'TEST123', orderId: 123 });
      const response = await applyPromotion(req);

      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if code or orderId is missing', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(true)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({ code: 'TEST123' });
      const response = await applyPromotion(req);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Promotion code and order ID are required' });
    });

    it('should successfully apply a valid promotion', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(true),
        ...mockSupabaseRPC(true),
        ...mockSupabaseDB(true)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({ code: 'VALID123', orderId: 123 });
      const response = await applyPromotion(req);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual({
        success: true,
        message: 'Promotion applied successfully',
        discount: {
          type: 'percentage',
          value: 15
        }
      });
    });
  });

  describe('Remove Promotion', () => {
    it('should return 401 if user is not authenticated', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(false)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({ orderId: 123 });
      const response = await removePromotion(req);

      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if orderId is missing', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(true)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({});
      const response = await removePromotion(req);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Order ID is required' });
    });

    it('should successfully remove a promotion', async () => {
      const mockSupabase = {
        ...mockSupabaseAuth(true),
        ...mockSupabaseRPC(true),
        ...mockSupabaseDB(true)
      };
      (createClient as unknown).mockReturnValue(mockSupabase);

      const req = createMockRequest({ orderId: 123 });
      const response = await removePromotion(req);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual({
        success: true,
        message: 'Promotion removed successfully'
      });
    });
  });
}); 