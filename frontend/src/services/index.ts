/**
 * Services Index
 * 
 * Tüm API servislerinin merkezi export noktası.
 */

// Base API
export { default as api } from './api';

// Course Service
export {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  getTopics,
  createTopic,
  enrollCourse,
  unenrollCourse,
  getMyCourses,
  type Course,
  type Topic,
  type Enrollment,
  type CourseCreateData,
  type CourseUpdateData,
  type CourseFilters,
  type TopicCreateData,
} from './courseService';

// Content Service
export {
  getVideos,
  getMyVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  restoreVideo,
  submitVideoForReview,
  approveVideo,
  rejectVideo,
  publishVideo,
  archiveVideo,
  getDocuments,
  getMyDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  restoreDocument,
  downloadDocument,
  submitDocumentForReview,
  approveDocument,
  rejectDocument,
  publishDocument,
  archiveDocument,
  getVideoEmbedUrl,
  startVideoWatch,
  updateVideoWatch,
  endVideoWatch,
  getWatchHistory,
  getVideoAnalytics,
  getPendingReviews,
  compareVersions,
  type Video,
  type Document,
  type ContentStatus,
  type ContentApproval,
  type ContentVersion,
  type VideoCreateData,
  type VideoUpdateData,
  type DocumentCreateData,
  type DocumentUpdateData,
  type ContentFilters,
  type WatchSession,
  type VideoAnalytics,
} from './contentService';

// Evaluation Service
export {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  publishAssignment,
  getMySubmissions,
  submitAssignment,
  gradeSubmission,
  getCoachingNotes,
  createCoachingNote,
  getPerformanceReviews,
  createPerformanceReview,
  type Assignment,
  type Submission,
  type CoachingNote,
  type PerformanceReview,
  type AssignmentCreateData,
  type GradeData,
} from './evaluationService';

// User Service
export {
  getMyProfile,
  updateMyProfile,
  changePassword,
  forceChangePassword,
  getUser,
  getRoles,
  getPermissions,
  uploadAvatar,
  deleteAvatar,
  type User,
  type UserProfile,
  type Role,
  type Permission,
  type ProfileUpdateData,
  type PasswordChangeData,
  type UserRole,
} from './userService';

// Exam Service
export * from './examService';

// Live Session Service
export * from './liveSessionService';

// Video Service (legacy)
export * from './videoService';

// Admin Services
export * from './adminService';
export * from './aiService';
export * from './aiAdminService';

// Dashboard Service
export {
  getStudentDashboard,
  getTeacherDashboard,
  getAdminDashboard,
  type StudentDashboardData,
  type TeacherDashboardData,
  type AdminDashboardData,
} from './dashboardService';
