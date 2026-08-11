export const endpoints = {
  health: '/health',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
} as const;
