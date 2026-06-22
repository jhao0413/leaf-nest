'use client';

import Image from '@/components/AppImage';
import { useState } from 'react';
import { Home, NotebookPen, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthApiBaseUrl, useAuthClient } from '@/lib/auth/AuthClientProvider';
import { usePathname, useRouter } from '@/navigation';
import { useTranslations } from '@/i18n';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { clearAuthSessionToken } from '@/lib/auth/sessionToken';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon, label, isActive, isCollapsed, onClick }: SidebarItemProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={isCollapsed ? label : undefined}
      className={`
        relative flex w-full items-center rounded-xl transition-all duration-300 group
        ${isCollapsed ? 'h-12 justify-center px-0' : 'gap-3 px-4 py-3 text-left'}
        ${
          isActive
            ? 'text-slate-900 dark:text-slate-100'
            : 'text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5'
        }
      `}
    >
      <div className="relative flex items-center justify-center w-9 h-9">
        {/* The "Ink Blot" Background (Blurred & Irregular) - Only visible when active */}
        {isActive && (
          <div className="absolute inset-0 bg-blue-400/30 dark:bg-blue-400/40 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-md scale-125" />
        )}

        {/* The Icon (Sharp) */}
        <div
          className={`relative z-10 transition-colors duration-300 ${
            isActive
              ? 'text-blue-700 dark:text-blue-200'
              : 'text-gray-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
          }`}
        >
          {icon}
        </div>
      </div>

      {!isCollapsed && (
        <span
          className={`relative z-10 font-lxgw text-sm transition-colors duration-300 ${
            isActive ? 'font-bold' : 'font-medium'
          }`}
        >
          {label}
        </span>
      )}
    </button>
  );
};

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const authClient = useAuthClient();
  const apiBaseUrl = useAuthApiBaseUrl();
  const session = useSessionStore((state) => state.session);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseLabel = isCollapsed ? t('expand') : t('collapse');

  const menuItems = [
    {
      label: t('home'),
      icon: <Home size={20} />,
      path: '/',
      isActive: pathname === '/'
    },
    {
      label: t('notes'),
      icon: <NotebookPen size={20} />,
      path: '/notes',
      isActive: pathname?.startsWith('/notes')
    },
    {
      label: t('settings'),
      icon: <Settings size={20} />,
      path: '/settings',
      isActive: pathname?.startsWith('/settings')
    }
  ];

  return (
    <div
      className={`hidden h-full shrink-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/40 shadow-lg shadow-blue-900/5 backdrop-blur-2xl transition-[width] duration-300 dark:border-white/10 dark:bg-black/20 md:flex ${
        isCollapsed ? 'w-20' : 'w-64'
      } z-50`}
    >
      {/* Logo Section */}
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-3 px-3 py-4">
          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={collapseLabel}
            title={collapseLabel}
            aria-expanded={!isCollapsed}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-black/5 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
          >
            <PanelLeftOpen size={18} />
          </button>
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl shadow-sm">
            <Image src="/logo.png" alt="LeafNest" fill className="object-cover" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-sm">
              <Image src="/logo.png" alt="LeafNest" fill className="object-cover" />
            </div>
            <h1 className="truncate bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-xl font-bold text-transparent dark:from-white dark:to-gray-300">
              LeafNest
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={collapseLabel}
            title={collapseLabel}
            aria-expanded={!isCollapsed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-black/5 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      )}

      {/* Navigation Items */}
      <div className={`flex flex-1 flex-col gap-2 py-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {menuItems.map((item) => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={item.isActive}
            isCollapsed={isCollapsed}
            onClick={() => router.push(item.path)}
          />
        ))}
      </div>

      {/* User Profile / Logout */}
      {isCollapsed ? (
        <div className="mt-auto flex flex-col items-center gap-2 px-2 pb-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200/50 bg-gradient-to-br from-blue-100 to-blue-200 text-lg font-bold text-blue-700 shadow-sm transition-colors dark:border-blue-700/30 dark:from-blue-900/60 dark:to-sky-900/40 dark:text-blue-300"
            title={session?.user?.name || 'User'}
          >
            {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await authClient.signOut();
              } finally {
                clearAuthSessionToken(apiBaseUrl);
                window.location.reload();
              }
            }}
            title={t('logout')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : (
        <div className="mt-auto p-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/40 p-3 shadow-sm backdrop-blur-md transition-all hover:bg-white/60 dark:border-white/10 dark:bg-black/20 dark:hover:bg-white/5">
            {/* Avatar */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200/50 bg-gradient-to-br from-blue-100 to-blue-200 text-lg font-bold text-blue-700 shadow-sm transition-colors dark:border-blue-700/30 dark:from-blue-900/60 dark:to-sky-900/40 dark:text-blue-300"
              title={session?.user?.name || 'User'}
            >
              {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>

            {/* User Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-lxgw text-sm font-bold leading-tight text-gray-800 dark:text-gray-200">
                {session?.user?.name || 'User'}
              </p>
              <p className="mt-0.5 truncate font-lxgw text-xs text-gray-500 dark:text-gray-400">
                {session?.user?.email || ''}
              </p>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await authClient.signOut();
                } finally {
                  clearAuthSessionToken(apiBaseUrl);
                  window.location.reload();
                }
              }}
              title={t('logout')}
              className="-mr-1 shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const MobileNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const authClient = useAuthClient();
  const apiBaseUrl = useAuthApiBaseUrl();

  const menuItems = [
    {
      label: t('home'),
      icon: <Home size={20} />,
      path: '/',
      isActive: pathname === '/'
    },
    {
      label: t('notes'),
      icon: <NotebookPen size={20} />,
      path: '/notes',
      isActive: pathname?.startsWith('/notes')
    },
    {
      label: t('settings'),
      icon: <Settings size={20} />,
      path: '/settings',
      isActive: pathname?.startsWith('/settings')
    }
  ];

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-white/60 bg-white/80 px-2 py-2 shadow-2xl shadow-slate-900/15 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/80 md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {menuItems.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => router.push(item.path)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs transition-colors ${
              item.isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200'
                : 'text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span className="max-w-full truncate font-lxgw">{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={async () => {
            try {
              await authClient.signOut();
            } finally {
              clearAuthSessionToken(apiBaseUrl);
              window.location.reload();
            }
          }}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          title={t('logout')}
        >
          <LogOut size={20} />
          <span className="max-w-full truncate font-lxgw">{t('logout')}</span>
        </button>
      </div>
    </nav>
  );
};
