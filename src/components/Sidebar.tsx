'use client';

import Image from '@/components/AppImage';
import { Home, NotebookPen, Settings, LogOut } from 'lucide-react';
import { useAuthApiBaseUrl, useAuthClient } from '@/lib/auth/AuthClientProvider';
import { usePathname, useRouter } from '@/navigation';
import { useTranslations } from '@/i18n';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { clearAuthSessionToken } from '@/lib/auth/sessionToken';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon, label, isActive, onClick }: SidebarItemProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group text-left
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

      <span
        className={`relative z-10 font-lxgw text-sm transition-colors duration-300 ${
          isActive ? 'font-bold' : 'font-medium'
        }`}
      >
        {label}
      </span>
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
    <div className="hidden h-full w-64 shrink-0 flex-col rounded-2xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-2xl shadow-lg shadow-blue-900/5 z-50 transition-all overflow-hidden md:flex">
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3">
        <div className="relative w-10 h-10 overflow-hidden rounded-xl shadow-sm">
          {/* Fallback or actual logo */}
          <Image src="/logo.png" alt="LeafNest" fill className="object-cover" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300">
          LeafNest
        </h1>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-2">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={item.isActive}
            onClick={() => router.push(item.path)}
          />
        ))}
      </div>

      {/* User Profile / Logout */}
      <div className="p-4 mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/20 bg-white/40 dark:border-white/10 dark:bg-black/20 backdrop-blur-md shadow-sm transition-all hover:bg-white/60 dark:hover:bg-white/5">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-sky-900/40 border border-blue-200/50 dark:border-blue-700/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-lg shadow-sm shrink-0 transition-colors">
            {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="font-lxgw font-bold text-sm text-gray-800 dark:text-gray-200 truncate leading-tight">
              {session?.user?.name || 'User'}
            </p>
            <p className="font-lxgw text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
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
            className="p-2 -mr-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors shrink-0 outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
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
