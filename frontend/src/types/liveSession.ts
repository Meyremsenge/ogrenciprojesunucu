/**
 * Live Session Types
 * 
 * Canlı ders tip tanımları.
 */

export type SessionStatus = 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';
export type SessionPlatform = 'zoom' | 'google_meet' | 'microsoft_teams' | 'jitsi' | 'webex' | 'custom';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type AttendanceStatus = 'registered' | 'joined' | 'left' | 'absent';

export interface LiveSession {
  id: number;
  title: string;
  description?: string;
  course_id: number;
  course_name?: string;
  topic_id?: number;
  topic_name?: string;
  host_id: number;
  host_name?: string;
  status: SessionStatus;
  platform: SessionPlatform;
  meeting_url?: string;
  meeting_id?: string;
  meeting_password?: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  duration_minutes: number;
  duration_actual?: number;
  recurrence_type: RecurrenceType;
  recurrence_end_date?: string;
  parent_session_id?: number;
  max_participants: number;
  participant_count: number;
  peak_participants: number;
  is_recording_enabled: boolean;
  recording_url?: string;
  require_enrollment: boolean;
  require_registration: boolean;
  early_join_minutes: number;
  late_join_allowed: boolean;
  late_join_minutes: number;
  materials?: string[];
  notes?: string;
  is_upcoming: boolean;
  can_join: boolean;
  is_joinable_now: boolean;
  minutes_until_start?: number;
  created_at: string;
  updated_at?: string;
}

export interface SessionAttendance {
  id: number;
  session_id: number;
  user_id: number;
  user_name?: string;
  status: AttendanceStatus;
  registered_at: string;
  joined_at?: string;
  left_at?: string;
  duration_minutes: number;
  join_count: number;
  attendance_percentage: number;
}

export interface AccessCheckResult {
  can_access: boolean;
  reason: string;
  is_host: boolean;
  is_registered: boolean;
  is_enrolled: boolean;
}

export interface JoinInfo {
  meeting_url: string;
  meeting_password?: string;
  meeting_id?: string;
  platform: SessionPlatform;
  join_link: string;
  session: LiveSession;
  attendance: SessionAttendance;
}

export interface SessionAnalytics {
  session: LiveSession;
  analytics: {
    total_registered: number;
    total_joined: number;
    total_completed: number;
    attendance_rate: number;
    completion_rate: number;
    peak_participants: number;
    average_duration_minutes: number;
    session_duration_minutes: number;
  };
}

export interface CreateSessionData {
  title: string;
  description?: string;
  course_id: number;
  topic_id?: number;
  platform: SessionPlatform;
  meeting_url: string;
  meeting_id?: string;
  meeting_password?: string;
  scheduled_start: string;
  duration_minutes: number;
  max_participants?: number;
  require_enrollment?: boolean;
  require_registration?: boolean;
  early_join_minutes?: number;
  late_join_allowed?: boolean;
  late_join_minutes?: number;
  materials?: string[];
  notes?: string;
}

export interface CreateRecurringData extends CreateSessionData {
  recurrence_type: RecurrenceType;
  recurrence_end_date: string;
}
