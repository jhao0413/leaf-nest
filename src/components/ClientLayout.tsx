"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReaderRoute = pathname?.startsWith("/reader");

  return (
    <div className="flex h-screen">
      <div className="flex flex-col w-full items-center">
        {!isReaderRoute && <Navbar />}
        <main className={`flex-1 ${isReaderRoute ? "w-full" : "w-6xl"}`}>{children}</main>
      </div>
    </div>
  );
}
