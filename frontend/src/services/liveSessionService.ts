/**
 * Live Session API Service
 * 
 * Canlı ders API işlemleri.
 */

import api from './api';
import type {
  LiveSession,
  SessionAttendance,
  AccessCheckResult,
  JoinInfo,
  SessionAnalytics,
  CreateSessionData,
  CreateRecurringData,
} from '@/types/liveSession';

// =============================================================================
// Session CRUD
// =============================================================================

export async function getSessions(params?: {
  course_id?: number;
  status?: string;
  upcoming?: boolean;
  page?: number;
  per_page?: number;
}) {
  const response = await api.get('/live-classes', { params });
  return response.data;
}

export async function getSession(sessionId: number): Promise<LiveSession> {
  const response = await api.get(`/live-classes/${sessionId}`);
  return response.data.data.session;
}

export async function createSession(data: CreateSessionData): Promise<LiveSession> {
  const response = await api.post('/live-classes', data);
  return response.data.data.session;
}

export async function createRecurringSessions(
  data: CreateRecurringData
): Promise<{ sessions: LiveSession[]; count: number }> {
  const response = await api.post('/live-classes/recurring', data);
  return response.data.data;
}

export async function updateSession(
  sessionId: number,
  data: Partial<CreateSessionData>
): Promise<LiveSession> {
  const response = await api.put(`/live-classes/${sessionId}`, data);
  return response.data.data.session;
}

export async function deleteSession(sessionId: number): Promise<void> {
  await api.delete(`/live-classes/${sessionId}`);
}

// =============================================================================
// Session Control
// =============================================================================

export async function startSession(sessionId: number): Promise<LiveSession> {
  const response = await api.post(`/live-classes/${sessionId}/start`);
  return response.data.data.session;
}

export async function endSession(sessionId: number): Promise<LiveSession> {
  const response = await api.post(`/live-classes/${sessionId}/end`);
  return response.data.data.session;
}

// =============================================================================
// Access Control
// =============================================================================

export async function checkAccess(sessionId: number): Promise<AccessCheckResult> {
  const response = await api.get(`/live-classes/${sessionId}/access`);
  return response.data.data.access;
}

export async function getJoinInfo(sessionId: number): Promise<JoinInfo> {
  const response = await api.get(`/live-classes/${sessionId}/join-info`);
  return response.data.data;
}

// =============================================================================
// Attendance
// =============================================================================

export async function registerForSession(
  sessionId: number
): Promise<SessionAttendance> {
  const response = await api.post(`/live-classes/${sessionId}/register`);
  return response.data.data.attendance;
}

export async function joinSession(sessionId: number): Promise<JoinInfo> {
  const response = await api.post(`/live-classes/${sessionId}/join`);
  return response.data.data;
}

export async function leaveSession(
  sessionId: number
): Promise<SessionAttendance> {
  const response = await api.post(`/live-classes/${sessionId}/leave`);
  return response.data.data.attendance;
}

export async function getAttendances(
  sessionId: number,
  params?: { page?: number; per_page?: number }
) {
  const response = await api.get(`/live-classes/${sessionId}/attendances`, {
    params,
  });
  return response.data;
}

// =============================================================================
// My Sessions
// =============================================================================

export async function getMySessions(params?: {
  page?: number;
  per_page?: number;
}) {
  const response = await api.get('/live-classes/my-sessions', { params });
  return response.data;
}

export async function getUpcomingSessions(days: number = 7): Promise<LiveSession[]> {
  const response = await api.get('/live-classes/upcoming', {
    params: { days },
  });
  return response.data.data.sessions;
}

// =============================================================================
// Recurring Sessions
// =============================================================================

export async function getSessionSeries(
  sessionId: number
): Promise<{ parent: LiveSession; sessions: LiveSession[] }> {
  const response = await api.get(`/live-classes/${sessionId}/series`);
  return response.data.data;
}

// =============================================================================
// Recording
// =============================================================================

export async function addRecording(
  sessionId: number,
  recordingUrl: string
): Promise<LiveSession> {
  const response = await api.post(`/live-classes/${sessionId}/recording`, {
    recording_url: recordingUrl,
  });
  return response.data.data.session;
}

export async function getRecording(
  sessionId: number
): Promise<{ recording_url: string | null }> {
  const response = await api.get(`/live-classes/${sessionId}/recording`);
  return response.data.data;
}

// =============================================================================
// Analytics
// =============================================================================

export async function getSessionAnalytics(
  sessionId: number
): Promise<SessionAnalytics> {
  const response = await api.get(`/live-classes/${sessionId}/analytics`);
  return response.data.data;
}
