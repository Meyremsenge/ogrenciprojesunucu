/**
 * Sidebar Component
 * Rol bazlı dinamik navigasyon
 */

import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, GraduationCap, X } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { useAuthStore, useUser, useUserRole } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { getNavigationByRole, type NavItem } from '@/routes/config';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';

export function Sidebar() {
  const location = useLocation();
  const user = useUser();
  const role = useUserRole();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapse } = useUIStore();
  const { hasPermission } = useAuthStore();

  // Get navigation items for current role
  const navItems = role ? getNavigationByRole(role) : [];

  // Filter items by permission
  const filteredNavItems = navItems.filter((item) => {
    if (!item.permissions) return true;
    return item.permissions.some((p) => hasPermission(p));
  });

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border',
          'transition-all duration-300 ease-in-out',
          'hidden lg:block',
          sidebarCollapsed ? 'w-20' : 'w-64',
          !sidebarOpen && 'lg:-translate-x-full'
        )}
      >
        <SidebarContent
          navItems={filteredNavItems}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 bg-card border-r border-border',
          'transition-transform duration-300 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <Logo collapsed={false} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent navItems={filteredNavItems} collapsed={false} />
      </aside>
    </>
  );
}

interface SidebarContentProps {
  navItems: NavItem[];
  collapsed: boolean;
  onToggleCollapse?: () => void;
}

function SidebarContent({ navItems, collapsed, onToggleCollapse }: SidebarContentProps) {
  const location = useLocation();
  const user = useUser();
  const role = useUserRole();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Logo collapsed={collapsed} />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-lg hover:bg-muted"
          >
            <ChevronLeft
              className={cn(
                'h-5 w-5 transition-transform',
                collapsed && 'rotate-180'
              )}
            />
          </button>
        )}
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name}</p>
              {role && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full', ROLE_COLORS[role])}>
                  {ROLE_LABELS[role]}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.path}
            item={item}
            collapsed={collapsed}
            isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
          />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Öğrenci Koçluk Sistemi v2.0
          </p>
        </div>
      )}
    </div>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}

function NavItemComponent({ item, collapsed, isActive }: NavItemComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  if (hasChildren && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
            'transition-colors duration-150',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-foreground'
          )}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1 text-left">{item.title}</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
          />
        </button>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-4 mt-1 space-y-1"
          >
            {item.children!.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                  'transition-colors duration-150',
                  location.pathname === child.path
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <child.icon className="h-4 w-4" />
                <span>{child.title}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.path}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
        'transition-colors duration-150',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-foreground',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.title : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <GraduationCap className="h-5 w-5 text-primary-foreground" />
      </div>
      {!collapsed && (
        <span className="font-bold text-lg">ÖKS</span>
      )}
    </Link>
  );
}

export default Sidebar;
