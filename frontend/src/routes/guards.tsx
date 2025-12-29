/**
 * Protected Route Components
 * Rol ve permission bazlı route koruması
 */

import { ReactNode } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole, Permission } from '@/types';

interface ProtectedRouteProps {
  children?: ReactNode;
  
  // Access control
  roles?: UserRole[];
  permissions?: Permission[];
  requireAll?: boolean; // permissions için: tümü mü herhangi biri mi
  
  // Redirect
  redirectTo?: string;
  
  // Loading state
  fallback?: ReactNode;
}

/**
 * Loading component for route guards
 */
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      </div>
    </div>
  );
}

/**
 * Auth korumalı route
 * Giriş yapmamış kullanıcıları login'e yönlendirir
 */
export function ProtectedRoute({
  children,
  roles,
  permissions,
  requireAll = false,
  redirectTo = '/login',
  fallback = <RouteLoadingFallback />,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, hasRole, hasPermission, hasAnyPermission } = useAuthStore();

  // Loading state
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Auth check
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role check
  if (roles && roles.length > 0) {
    if (!hasRole(...roles)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Permission check
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? permissions.every((p) => hasPermission(p))
      : hasAnyPermission(...permissions);

    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Guest only route
 * Giriş yapmış kullanıcıları dashboard'a yönlendirir
 */
export function GuestRoute({
  children,
  redirectTo = '/dashboard',
}: {
  children?: ReactNode;
  redirectTo?: string;
} = {}) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoadingFallback />;
  }

  if (isAuthenticated) {
    // Login sonrası intended URL'e yönlendir
    const from = (location.state as { from?: Location })?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Role-based route
 * Belirli rollere özel route
 */
export function RoleRoute({
  children,
  roles,
  fallback = <Navigate to="/unauthorized" replace />,
}: {
  children?: ReactNode;
  roles: UserRole[];
  fallback?: ReactNode;
}) {
  const { hasRole, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(...roles)) {
    return <>{fallback}</>;
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Permission-based route
 * Belirli izinlere özel route
 */
export function PermissionRoute({
  children,
  permissions,
  requireAll = false,
  fallback = <Navigate to="/unauthorized" replace />,
}: {
  children?: ReactNode;
  permissions: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
}) {
  const { hasPermission, hasAnyPermission, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = requireAll
    ? permissions.every((p) => hasPermission(p))
    : hasAnyPermission(...permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Admin only route
 */
export function AdminRoute({ children }: { children?: ReactNode } = {}) {
  return (
    <RoleRoute roles={['admin', 'super_admin']}>
      {children || <Outlet />}
    </RoleRoute>
  );
}

/**
 * Super Admin only route
 */
export function SuperAdminRoute({ children }: { children?: ReactNode } = {}) {
  return (
    <RoleRoute roles={['super_admin']}>
      {children || <Outlet />}
    </RoleRoute>
  );
}

/**
 * Teacher or higher route
 */
export function TeacherRoute({ children }: { children?: ReactNode } = {}) {
  return (
    <RoleRoute roles={['teacher', 'admin', 'super_admin']}>
      {children || <Outlet />}
    </RoleRoute>
  );
}
