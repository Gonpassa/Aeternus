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
  dreamsSummary: '/dreams/summary',
  dream: (id: number) => `/dreams/${id}`,
  dreamAnchors: (id: number) => `/dreams/${id}/anchors`,
  dreamAnalysisPasses: (id: number) => `/dreams/${id}/analysis-passes`,
  anchor: (id: number) => `/anchors/${id}`,
  anchorEmotionalBeats: (id: number) => `/anchors/${id}/emotional-beats`,
  anchorSymbols: (id: number) => `/anchors/${id}/symbols`,
  anchorAssociations: (id: number) => `/anchors/${id}/associations`,
  emotionalBeat: (id: number) => `/emotional-beats/${id}`,
  symbols: '/symbols',
  symbolAttachment: (id: number) => `/symbol-attachments/${id}`,
  association: (id: number) => `/associations/${id}`,
  sources: '/sources',
  source: (id: number) => `/sources/${id}`,
  sourceNotes: (id: number) => `/sources/${id}/notes`,
  // Correcting or deleting a filed note is addressed by the note's own id: capture needs a
  // Source open, a correction needs only the note (#83).
  note: (id: number) => `/notes/${id}`,
  permanentNotes: '/notes/permanent',
  noteConnections: (id: number) => `/notes/${id}/connections`,
  // The Topic vocabulary, read for the autocomplete that creates Topics by typing a name.
  // Renaming, merging and deleting a Topic are #88, so there is nothing else here yet.
  topics: '/topics',
  // The notes sharing a Topic with one note: the link panel's middle tier (#87).
  topicRelatedNotes: (id: number) => `/notes/${id}/topic-notes`,
} as const;
