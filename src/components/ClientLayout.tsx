"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReaderRoute = pathname?.startsWith("/reader");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50 dark:bg-neutral-900/50">
      {/* Sidebar: Only show on non-reader routes */}
      {!isReaderRoute && <Sidebar />}

      {/* Main Content Wrapper */}
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
          <div className={`${isReaderRoute ? "w-full h-full" : "max-w-7xl mx-auto w-full p-6"}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
