"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReaderRoute = pathname?.startsWith("/reader");

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-col w-full items-center overflow-hidden">
        {!isReaderRoute && <Navbar />}
        <main className={`flex-1 overflow-auto ${isReaderRoute ? "w-full" : "w-6xl"}`}>{children}</main>
      </div>
    </div>
  );
}
