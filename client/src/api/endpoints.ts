export const endpoints = {
  health: '/health',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  journal: {
    entries: '/journal/entries',
    entry: (id: number) => `/journal/entries/${id}`,
    entryByDate: (date: string) => `/journal/entries/by-date/${date}`,
    entriesByRange: '/journal/entries/by-range',
  },
} as const;
