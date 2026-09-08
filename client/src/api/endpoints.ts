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
    summary: '/journal/entries/summary',
  },
  dreams: '/dreams',
  dream: (id: number) => `/dreams/${id}`,
  dreamAnchors: (id: number) => `/dreams/${id}/anchors`,
  anchor: (id: number) => `/anchors/${id}`,
  anchorEmotionalBeats: (id: number) => `/anchors/${id}/emotional-beats`,
  emotionalBeat: (id: number) => `/emotional-beats/${id}`,
} as const;
