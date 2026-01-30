export const createMockSupabaseClient = () => {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    })),
  };
};

export const mockRequestContext = (overrides = {}) => ({
  userId: 'test-user-id',
  guestSession: null,
  isGuest: false,
  ...overrides,
});

export const mockGuestRequestContext = () => ({
  userId: null,
  guestSession: 'test-guest-session-id',
  isGuest: true,
});
