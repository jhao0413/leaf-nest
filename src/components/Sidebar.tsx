"use client";

import Image from "next/image";
import { Home, NotebookPen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon, label, isActive, onClick }: SidebarItemProps) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 group
        ${
          isActive
            ? "text-slate-900 dark:text-slate-100"
            : "text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
        }
      `}
    >
      <div className="relative flex items-center justify-center w-9 h-9">
         {/* The "Ink Blot" Background (Blurred & Irregular) - Only visible when active */}
         {isActive && (
           <div 
             className="absolute inset-0 bg-blue-400/30 dark:bg-blue-400/40 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-md scale-125"
           />
         )}
         
         {/* The Icon (Sharp) */}
         <div
           className={`relative z-10 transition-colors duration-300 ${
             isActive ? "text-blue-700 dark:text-blue-200" : "text-gray-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
           }`}
         >
           {icon}
         </div>
      </div>

      <span
        className={`relative z-10 font-lxgw text-sm transition-colors duration-300 ${
          isActive ? "font-bold" : "font-medium"
        }`}
      >
        {label}
      </span>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      label: "首页",
      icon: <Home size={20} />,
      path: "/",
      isActive: pathname === "/",
    },
    {
      label: "笔记",
      icon: <NotebookPen size={20} />,
      path: "/notes",
      isActive: pathname?.startsWith("/notes"),
    },
  ];

  return (
    <div className="h-full w-64 flex flex-col border-r border-white/20 bg-white/30 dark:bg-black/20 backdrop-blur-md shadow-xl z-50 transition-all">
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
      
      {/* Footer/Decorative (Optional) */}
      <div className="p-4 text-xs text-center text-gray-400/60 font-lxgw">
        Built with LeafNest
      </div>
    </div>
  );
};