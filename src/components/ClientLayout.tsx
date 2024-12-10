"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReaderRoute = pathname?.startsWith("/reader");

  return (
    <div className="flex h-screen">
      {!isReaderRoute && <Sidebar />}
      <div className="flex flex-col w-full">
        {!isReaderRoute && <Navbar />}
        <main className={`flex-1 ${isReaderRoute ? "w-full" : ""}`}>{children}</main>
      </div>
    </div>
  );
}
