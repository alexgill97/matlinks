import '@jest/globals';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    forEach: jest.fn(),
    entries: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '',
}));

// Mock the Supabase client
jest.mock('@/utils/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  })),
}));

// Mock the Supabase server client
jest.mock('@/app/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  })),
})); 