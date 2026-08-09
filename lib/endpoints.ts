import api from '@/lib/api';
import { ParentRegistrationPayload, QuizAnswerSubmission, ReadingLevel, TeacherApprovalStatus } from '@/lib/types';

// ---- Auth ----
export const authApi = {
  register: (payload: ParentRegistrationPayload | FormData) =>
    api.post('/api/auth/register', payload, payload instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined),
  login: (payload: { email: string; password: string }) => api.post('/api/auth/login', payload),
  logout: (refreshToken?: string | null) =>
    api.post('/api/auth/logout', {
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
    }),
  revokeRefresh: (refreshToken: string) =>
    api.post('/api/auth/logout', {}, {
      headers: { Authorization: `Bearer ${refreshToken}` },
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
  update: (id: number | string, payload: Partial<{ name: string; age: number; child_pin: string; remove_pin: boolean; current_password: string }>) =>
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
export const activeChildApi = {
  get: () => api.get('/api/parent/active-child'),
  activate: (childId: number, pin: string) => api.post('/api/parent/active-child', { child_id: childId, pin }),
  lock: () => api.delete('/api/parent/active-child'),
};

// ---- Books ----
export const booksApi = {
  list: (params: Record<string, string> = {}) => api.get('/api/books', { params }),
  get: (id: number | string) => api.get(`/api/books/${id}`),
  download: (id: number | string) => api.get(`/api/books/${id}/download`),
  miniGames: (id: number | string) => api.get(`/api/books/${id}/mini-games`),
  miniGameGenerationStatus: (id: number | string) =>
    api.get(`/api/books/${id}/mini-games/generation-status`),
  regenerateMiniGames: (id: number | string) =>
    api.post(`/api/books/${id}/mini-games/regenerate`, {}),
  recordView: (id: number | string) => api.post(`/api/books/${id}/views`, {}),
  engagement: (id: number | string, childId?: number | string) =>
    api.get(`/api/books/${id}/engagement`, { params: childId ? { child_id: childId } : {} }),
  like: (id: number | string, childId: number | string) =>
    api.put(`/api/books/${id}/likes/${childId}`, {}),
  unlike: (id: number | string, childId: number | string) =>
    api.delete(`/api/books/${id}/likes/${childId}`),
};

export const teacherBooksApi = {
  list: () => api.get('/api/teacher/books'),
  get: (id: number | string) => api.get(`/api/teacher/books/${id}`),
  create: (payload: FormData, idempotencyKey: string) => api.post('/api/books', payload, {
    headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': idempotencyKey },
    timeout: 0,
  }),
  update: (id: number | string, payload: FormData) => api.patch(`/api/teacher/books/${id}`, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
  }),
  remove: (id: number | string) => api.delete(`/api/teacher/books/${id}`),
};

// ---- Mini-games ----
export const miniGamesApi = {
  get: (id: number | string) => api.get(`/api/mini-games/${id}`),
  submitResult: (id: number | string, payload: {
    answers: Array<QuizAnswerSubmission | { word_id: string; response: string }>;
    difficulty?: 'easy' | 'medium' | 'hard';
  }) =>
    api.post(`/api/mini-games/${id}/results`, payload),
};

// ---- Reading sessions ----
export const sessionsApi = {
  create: (payload: { book_id: number; voice_profile_id?: number }) =>
    api.post('/api/reading-sessions', payload),
  get: (id: number | string) => api.get(`/api/reading-sessions/${id}`),
  createLiveReadingTicket: (id: number | string) =>
    api.post(`/api/reading-sessions/${id}/live-reading-ticket`),
  update: (id: number | string, payload: Record<string, unknown>) =>
    api.patch(`/api/reading-sessions/${id}`, payload),
  checkPronunciation: (id: number | string, payload: { paragraph_index: number; transcript: string }) =>
    api.post(`/api/reading-sessions/${id}/pronunciation-check`, payload),
  transcribePronunciation: (id: number | string, audio: FormData) =>
    api.post(`/api/reading-sessions/${id}/pronunciation-transcript`, audio, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listPronunciationAttempts: (id: number | string, paragraphIndex?: number) =>
    api.get(`/api/reading-sessions/${id}/pronunciation-attempts`, {
      params: paragraphIndex === undefined ? undefined : { paragraph_index: paragraphIndex },
    }),
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

  listTeachers: (status?: TeacherApprovalStatus) =>
    api.get('/api/admin/teachers', { params: status ? { status } : {} }),
  getTeacher: (id: number | string) => api.get(`/api/admin/teachers/${id}`),
  createTeacher: (payload: FormData) =>
    api.post('/api/admin/teachers', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
  banTeacher: (id: number | string) => api.patch(`/api/admin/teachers/${id}/ban`),
  unbanTeacher: (id: number | string) => api.patch(`/api/admin/teachers/${id}/unban`),
  deleteTeacher: (id: number | string) => api.delete(`/api/admin/teachers/${id}`),
  approveTeacher: (id: number | string) => api.patch(`/api/admin/teachers/${id}/approve`, {}),
  rejectTeacher: (id: number | string, reason?: string) =>
    api.patch(`/api/admin/teachers/${id}/reject`, { ...(reason ? { reason } : {}) }),
  bookAnalytics: (params: { search?: string; sort?: 'views' | 'reads' | 'likes'; page?: number } = {}) =>
    api.get('/api/admin/book-analytics', { params }),

  createBook: (payload: {
    title: string;
    description?: string;
    age_group: string;
    reading_level: 'beginner' | 'intermediate' | 'advanced';
    text_content?: string;
    content_url?: string;
    cover_image_url?: string;
    image_urls?: string[];
    video_url?: string;
  }, idempotencyKey: string) => api.post('/api/admin/books', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
    timeout: 0,
  }),
  updateBook: (id: number | string, payload: {
    title: string;
    description?: string;
    age_group: string;
    reading_level: 'beginner' | 'intermediate' | 'advanced';
    text_content?: string;
    content_url?: string;
    cover_image_url?: string;
    image_urls?: string[];
    video_url?: string;
  }) => api.patch(`/api/admin/books/${id}`, payload, { timeout: 0 }),
  deleteBook: (id: number | string) => api.delete(`/api/admin/books/${id}`),
  generateBookDraft: (payload: { age_group: string; reading_level: ReadingLevel; idea: string; model?: string }) =>
    api.post('/api/admin/book-draft', payload),
  uploadBookImage: (bookId: number | string, media: FormData) =>
    api.post(`/api/admin/books/${bookId}/images`, media, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 }),
  uploadBookVideo: (bookId: number | string, media: FormData) =>
    api.post(`/api/admin/books/${bookId}/videos`, media, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 }),
};

export const pricingApi = {
  plans: () => api.get('/api/pricing/plans'),
  me: () => api.get('/api/billing/me'),
  checkout: (plan: string) => api.post('/api/billing/checkout', { plan }),
  subscriptionAction: (action: 'cancel' | 'resume') => api.post(`/api/billing/subscription/${action}`, {}),
  portal: () => api.post('/api/billing/portal', {}),
};

export const adminPricingApi = {
  overview: () => api.get('/api/admin/pricing'),
  setMode: (pricing_mode: string, reason?: string) => api.patch('/api/admin/pricing/mode', { pricing_mode, reason }),
  updatePlan: (id: number, payload: object) => api.patch(`/api/admin/pricing/plans/${id}`, payload),
  users: (params: { search?: string; page?: number; per_page?: number } = {}) => api.get('/api/admin/pricing/users', { params }),
  updateOverride: (id: number, payload: Record<string, unknown>) => api.patch(`/api/admin/pricing/users/${id}/override`, payload),
  records: () => api.get('/api/admin/pricing/records'),
};
