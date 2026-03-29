'use client';

import { usePathname } from '@/navigation';
import { Sidebar } from '@/components/Sidebar';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReaderRoute = pathname?.startsWith('/reader');

  if (isReaderRoute) {
    return (
      <div className="flex h-screen overflow-hidden bg-white dark:bg-neutral-900">
        <main className="flex-1 overflow-x-hidden relative overflow-y-hidden w-full h-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-neutral-950 relative">
      {/* Background Pattern to show off glassmorphism */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        {/* Ambient background blobs to refract through the blur */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[100px] animate-[pulse_10s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-sky-500/10 dark:bg-sky-600/10 blur-[100px] animate-[pulse_12s_ease-in-out_infinite]"></div>
      </div>

      <div className="z-10 flex w-full h-full p-3 gap-3">
        {/* Sidebar Dock */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 h-full overflow-hidden relative rounded-2xl bg-white/60 dark:bg-neutral-900/60 shadow-lg shadow-black/5 border border-white/50 dark:border-white/5 backdrop-blur-xl">
          <main className="flex-1 overflow-x-hidden relative overflow-y-auto scroll-smooth">
            <div className="max-w-7xl mx-auto w-full p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
