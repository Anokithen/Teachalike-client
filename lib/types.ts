// Shared domain types for the TeachAlike frontend.

export type Role = 'parent' | 'teacher' | 'admin';
export type PublicAccountType = 'parent' | 'teacher';
export type TeacherType = 'school' | 'private_tuition';
export type TeacherApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface TeacherProfile {
  phone_number: string | null;
  address: string | null;
  teacher_type: TeacherType | null;
  school_name: string | null;
  tuition_name: string | null;
  approval_status: TeacherApprovalStatus;
  reviewed_by_id: number | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type ReadingLevel = 'beginner' | 'intermediate' | 'advanced';
export type ChildGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface Account {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at: string;
  is_banned?: boolean;
  profile_image_url?: string | null;
  children_count?: number;
  teacher_profile?: TeacherProfile;
}

export interface TeacherApplication extends Account, TeacherProfile {}

export interface ParentRegistrationPayload {
  account_type: 'parent';
  name: string;
  email: string;
  password: string;
}

export interface RegistrationResponse {
  message: string;
  parent?: Account;
  teacher?: Account;
}

export interface ChildStats {
  total_sessions?: number;
  total_game_results?: number;
}

export interface Child {
  id: number;
  name: string;
  age: number;
  gender: ChildGender;
  profile_image_url?: string | null;
  reading_level: ReadingLevel;
  content_url?: string;
  parent_id?: number;
  has_pin?: boolean;
  stats?: ChildStats;
}

export interface Book {
  id: number;
  title: string;
  description?: string | null;
  age_group: string;
  reading_level: ReadingLevel;
  text_content?: string;
  content_url?: string;
  cover_image_url?: string;
  image_urls?: string[];
  video_url?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: { account_id: number | null; name: string; role: 'teacher' } | null;
  created_by_label?: string;
}

export interface MiniGame {
  id: number;
  game_type: string;
  difficulty: string;
  rules?: Record<string, unknown>;
  content?: Record<string, unknown>;
}

export interface GameResult {
  id: number;
  game_id: number;
  score: number;
}

export interface ProgressEntry {
  page?: number;
  accuracy?: number;
  [key: string]: unknown;
}

export interface ReadingSession {
  id: number;
  child_id: number;
  book_id: number;
  voice_profile_id?: number | null;
  started_at: string;
  completed_at?: string | null;
  is_complete: boolean;
  progress_log?: ProgressEntry[];
}

export interface PronunciationCheck {
  correct: boolean;
  accuracy: number;
  provider_accuracy: number | null;
  text_match_accuracy: number;
  points_awarded: number;
  already_awarded: boolean;
  message: string;
  feedback?: string | null;
  scoring_provider: string;
  scoring_model?: string | null;
  comparison: PronunciationComparison;
  attempt_id: number;
  improvement?: number | null;
}

export type ComparisonTokenStatus = 'correct' | 'substitution' | 'deletion' | 'insertion';

export interface PronunciationComparisonToken {
  status: ComparisonTokenStatus;
  expected: string | null;
  heard: string | null;
  paragraph_index: number;
  sentence_index?: number | null;
  word_index?: number | null;
  global_word_index?: number | null;
  character_start?: number | null;
  character_end?: number | null;
  after_word_index?: number | null;
  before_word_index?: number | null;
}

export interface PronunciationComparisonSummary {
  expected_words: number;
  spoken_words: number;
  correct_words: number;
  substitutions: number;
  skipped_words: number;
  extra_words: number;
  words_needing_practice: number;
}

export interface PronunciationPracticeWord {
  expected: string;
  heard: string | null;
  status: 'substitution' | 'deletion';
  sentence_number: number;
  word_number: number;
  global_word_index: number;
}

export interface PronunciationComparison {
  original_text: string;
  spoken_text: string;
  summary: PronunciationComparisonSummary;
  tokens: PronunciationComparisonToken[];
  practice_words: PronunciationPracticeWord[];
}

export interface PronunciationAttempt {
  id: number;
  reading_session_id: number;
  paragraph_index: number;
  original_text: string;
  spoken_transcript: string;
  provider_accuracy: number | null;
  text_match_accuracy: number;
  correct_word_count: number;
  substitution_count: number;
  deletion_count: number;
  insertion_count: number;
  comparison: PronunciationComparison;
  scoring_provider: string;
  scoring_model?: string | null;
  points_awarded: number;
  created_at: string;
}

export type FeedbackType = 'praise' | 'correction' | 'tip';

export interface SessionFeedback {
  id: number;
  feedback_type: FeedbackType;
  feedback_text: string;
  created_at: string;
  audio_url?: string;
}

export type VoiceProfileStatus = 'processing' | 'ready' | 'failed';

export interface VoiceProfile {
  id: number;
  label?: string;
  status: VoiceProfileStatus;
  created_at: string;
  voice_sample_url?: string;
  has_cloned_voice?: boolean;
  owner_name?: string;
}

export type BookNarrationStatus = 'processing' | 'ready' | 'failed';

export interface BookNarration {
  id: number;
  book_id: number;
  voice_profile_id: number;
  status: BookNarrationStatus;
  created_at: string;
  error_message?: string | null;
}

export interface LeaderboardEntry {
  id: number;
  rank: number;
  child_id: number;
  child_name: string;
  points: number;
  streak_count?: number;
}

export interface LeaderboardResponse {
  week_start?: string;
  leaderboard: LeaderboardEntry[];
}

export interface ApiErrorShape {
  message: string;
  fields: string[];
  status?: number;
  errorCode?: string;
  rejectionReason?: string;
}

export interface BookEngagement {
  book_id: number;
  total_views: number;
  unique_viewers: number;
  total_reads: number;
  completed_reads: number;
  unique_readers: number;
  likes: number;
  liked_by_child?: boolean;
}

export interface BookAnalytics extends BookEngagement {
  title: string;
  age_group: string;
  reading_level: ReadingLevel;
  cover_image_url?: string;
  created_by?: Book['created_by'];
  created_by_label?: string;
}

export interface TeacherBook extends Book {
  total_views: number;
  total_reads: number;
  likes: number;
}

export interface AiModel {
  id: string;
  owned_by?: string;
  context_window?: number | null;
}
