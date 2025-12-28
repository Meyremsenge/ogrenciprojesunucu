/**
 * Hooks Index
 */

export { useAuth } from './useAuth.js';

// Responsive hooks
export {
  useMediaQuery,
  useBreakpoint,
  useIsBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useWindowSize,
  useScrollPosition,
  useScrollPast,
  useElementSize,
  useIntersectionObserver,
  useResponsiveValue,
  useContainerQuery,
  breakpoints,
  type Breakpoint,
} from './useResponsive.js';

// Performance hooks
export {
  useDebouncedValue,
  useDebouncedCallback,
  useThrottledCallback,
  usePrevious,
  useLatest,
  useMemoCompare,
  useDeepCompareMemo,
  useLocalStorage,
  useSessionStorage,
  useRenderCount,
  useUpdateEffect,
  useIsFirstRender,
  useUnmount,
  useIsMounted,
  useAsyncEffect,
  useTimeout,
  useInterval,
} from './usePerformance.js';

// API hooks
export {
  useApiQuery,
  usePaginatedQuery,
  useApiMutation,
  useLogin,
  useLogout,
  useCurrentUser,
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useCourses,
  useCourse,
  useContents,
  useContent,
  useExams,
  useExam,
  useSubmitExam,
  useLiveClasses,
  useLiveClass,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './useApi.js';

// Security hooks
export {
  useSecureLogout,
  useTokenRefresh,
  useIdleDetection,
  useLoginAttempts,
  useSecurityEvents,
  type UseSecureLogoutOptions,
  type UseTokenRefreshOptions,
  type UseIdleDetectionOptions,
  type UseLoginAttemptsOptions,
  type UseSecurityEventsOptions,
  type SecurityEventType,
  type SecurityEvent,
} from './useSecurity.js';

