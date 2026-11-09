// Every cache key the Notes module reads or invalidates, in one place rather than one per hook
// file. They live together because they are invalidated together: a Topic renamed on its own
// page changes what the catalog's cards and the reading pages' headers say, so the hooks that
// write cross each other's keys and would otherwise import each other in a circle (#88).
export const sourceKeys = {
  all: ['sources'] as const,
  list: () => ['sources', 'list'] as const,
  detail: (id: number) => ['sources', 'detail', id] as const,
};

export const noteKeys = {
  all: ['notes'] as const,
  connections: (id: number) => ['notes', 'connections', id] as const,
};

export const topicKeys = {
  all: ['topics'] as const,
  list: () => ['topics', 'list'] as const,
  detail: (topicId: number) => ['topics', 'detail', topicId] as const,
  relatedNotes: (noteId: number) => ['topics', 'related-notes', noteId] as const,
};

export const reviewKeys = {
  all: ['review'] as const,
  queue: ['review', 'queue'] as const,
  dueCount: ['review', 'dueCount'] as const,
};
