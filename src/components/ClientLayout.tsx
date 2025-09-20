"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReaderRoute = pathname?.startsWith("/reader");

  return (
    <div className="flex h-screen bg-white/30 backdrop-blur-xl backdrop-saturate-150 justify-between">
      {/* {!isReaderRoute && <Sidebar />} */}
      <div className="flex flex-col w-full justify-center items-center">
        {!isReaderRoute && <Navbar />}
        <main className={`flex-1 ${isReaderRoute ? "w-full" : "w-6xl"}`}>{children}</main>
      </div>
    </div>
  );
}
