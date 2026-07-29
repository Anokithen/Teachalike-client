import api from '@/lib/api';
import { ReadingLevel } from '@/lib/types';

// ---- Auth ----
export const authApi = {
  register: (payload: { name: string; email: string; password: string }) =>
    api.post('/api/auth/register', payload),
  login: (payload: { email: string; password: string }) => api.post('/api/auth/login', payload),
  logout: (refreshToken?: string | null) =>
    api.post('/api/auth/logout', {
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
    }),
};

// ---- AI model discovery ----
export const aiApi = {
  models: () => api.get('/api/ai/models'),
};

// ---- Account ("parent" object holds parent/teacher/admin) ----
export const accountApi = {
  me: () => api.get('/api/parents/me'),
  update: (payload: {
    name?: string;
    email?: string;
    password?: string;
    current_password?: string;
  }) =>
    api.patch('/api/parents/me', payload),
  uploadProfileImage: (payload: FormData) =>
    api.post('/api/parents/me/profile-image', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removeProfileImage: () => api.delete('/api/parents/me/profile-image'),
  remove: (currentPassword: string) =>
    api.delete('/api/parents/me', {
      data: { current_password: currentPassword },
    }),
};

// ---- Children ----
export const childrenApi = {
  list: () => api.get('/api/children'),
  get: (id: number | string) => api.get(`/api/children/${id}`),
  create: (payload: { name: string; age: number; gender: string; parent_id?: number; child_pin?: string }) =>
    api.post('/api/children', payload),
  update: (id: number | string, payload: Partial<{ name: string; age: number; child_pin: string }>) =>
    api.patch(`/api/children/${id}`, payload),
  uploadProfileImage: (id: number | string, payload: FormData) =>
    api.post(`/api/children/${id}/profile-image`, payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removeProfileImage: (id: number | string) => api.delete(`/api/children/${id}/profile-image`),
  verifyPin: (id: number | string, pin: string) => api.post(`/api/children/${id}/verify-pin`, { pin }),
  remove: (id: number | string) => api.delete(`/api/children/${id}`),
  sessions: (id: number | string) => api.get(`/api/children/${id}/reading-sessions`),
  gameResults: (id: number | string) => api.get(`/api/children/${id}/game-results`),
  leaderboardEntry: (id: number | string, week: string = 'current') =>
    api.get(`/api/children/${id}/leaderboard-entry`, { params: { week } }),
};

// ---- Books ----
export const booksApi = {
  list: (params: Record<string, string> = {}) => api.get('/api/books', { params }),
  get: (id: number | string) => api.get(`/api/books/${id}`),
  download: (id: number | string) => api.get(`/api/books/${id}/download`),
  miniGames: (id: number | string) => api.get(`/api/books/${id}/mini-games`),
};

// ---- Mini-games ----
export const miniGamesApi = {
  get: (id: number | string) => api.get(`/api/mini-games/${id}`),
  submitResult: (id: number | string, payload: { child_id: number; score: number }) =>
    api.post(`/api/mini-games/${id}/results`, payload),
};

// ---- Reading sessions ----
export const sessionsApi = {
  create: (payload: { child_id: number; book_id: number; voice_profile_id?: number }) =>
    api.post('/api/reading-sessions', payload),
  get: (id: number | string) => api.get(`/api/reading-sessions/${id}`),
  update: (id: number | string, payload: Record<string, unknown>) =>
    api.patch(`/api/reading-sessions/${id}`, payload),
  checkPronunciation: (id: number | string, payload: { paragraph_index: number; transcript: string }) =>
    api.post(`/api/reading-sessions/${id}/pronunciation-check`, payload),
  transcribePronunciation: (id: number | string, audio: FormData) =>
    api.post(`/api/reading-sessions/${id}/pronunciation-transcript`, audio, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listFeedback: (id: number | string) => api.get(`/api/reading-sessions/${id}/feedback`),
};

// ---- Voice profiles ----
export const voiceProfilesApi = {
  list: () => api.get('/api/voice-profiles'),
  create: (payload: FormData) =>
    api.post('/api/voice-profiles', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // This includes protected storage and voice cloning. Large valid audio
      // must not inherit the general API client's 60-second timeout.
      timeout: 0,
    }),
  status: (id: number | string) => api.get(`/api/voice-profiles/${id}/status`),
  // Audio is proxied as a protected stream and may legitimately take longer
  // than the default API timeout on slower connections.
  audio: (id: number | string) =>
    api.get(`/api/voice-profiles/${id}/audio`, { responseType: 'blob', timeout: 0 }),
  update: (id: number | string, payload: { label: string }) => api.patch(`/api/voice-profiles/${id}`, payload),
  remove: (id: number | string) => api.delete(`/api/voice-profiles/${id}`),
};

// ---- Cached book narrations ----
export const bookNarrationsApi = {
  create: (bookId: number | string, payload: { voice_profile_id: number }) =>
    api.post(`/api/books/${bookId}/narrations`, payload),
  list: (bookId: number | string) => api.get(`/api/books/${bookId}/narrations`),
  status: (id: number | string) => api.get(`/api/book-narrations/${id}/status`),
  audio: (id: number | string) =>
    api.get(`/api/book-narrations/${id}/audio`, { responseType: 'blob', timeout: 0 }),
};

// ---- Leaderboard ----
export const leaderboardApi = {
  list: (week: string = 'current') => api.get('/api/leaderboard', { params: { week } }),
};

// ---- Sync ----
export const syncApi = {
  push: (payload: Record<string, unknown>) => api.post('/api/sync', payload),
};

// ---- Admin ----
export const adminApi = {
  listParents: () => api.get('/api/admin/parents'),
  createParent: (payload: { name: string; email: string; password: string }) =>
    api.post('/api/admin/parents', payload),
  getParent: (id: number | string) => api.get(`/api/admin/parents/${id}`),
  banParent: (id: number | string) => api.patch(`/api/admin/parents/${id}/ban`),
  unbanParent: (id: number | string) => api.patch(`/api/admin/parents/${id}/unban`),
  deleteParent: (id: number | string) => api.delete(`/api/admin/parents/${id}`),

  listTeachers: () => api.get('/api/admin/teachers'),
  createTeacher: (payload: { name: string; email: string; password: string }) =>
    api.post('/api/admin/teachers', payload),
  banTeacher: (id: number | string) => api.patch(`/api/admin/teachers/${id}/ban`),
  unbanTeacher: (id: number | string) => api.patch(`/api/admin/teachers/${id}/unban`),
  deleteTeacher: (id: number | string) => api.delete(`/api/admin/teachers/${id}`),

  createAdmin: (payload: { name: string; email: string; password: string }) =>
    api.post('/api/admin/admins', payload),
  createBook: (payload: {
    title: string;
    age_group: string;
    reading_level: 'beginner' | 'intermediate' | 'advanced';
    text_content?: string;
    content_url?: string;
    cover_image_url?: string;
    image_urls?: string[];
    video_url?: string;
  }) => api.post('/api/admin/books', payload),
  updateBook: (id: number | string, payload: {
    title: string;
    age_group: string;
    reading_level: 'beginner' | 'intermediate' | 'advanced';
    text_content?: string;
    content_url?: string;
    cover_image_url?: string;
    image_urls?: string[];
    video_url?: string;
  }) => api.patch(`/api/admin/books/${id}`, payload),
  deleteBook: (id: number | string) => api.delete(`/api/admin/books/${id}`),
  generateBookDraft: (payload: { age_group: string; reading_level: ReadingLevel; idea: string; model?: string }) =>
    api.post('/api/admin/book-draft', payload),
  uploadBookMedia: (media: FormData) =>
    api.post('/api/admin/book-media', media, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadBookVideo: (bookId: number | string, media: FormData) =>
    api.post(`/api/admin/books/${bookId}/videos`, media, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
