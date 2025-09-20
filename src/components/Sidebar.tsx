import Image from "next/image";
import { BookText } from "lucide-react";

export const Sidebar: React.FC = () => {
  return (
    <div className="bg-white w-64 h-full p-4 bg-white/30 backdrop-blur-sm backdrop-saturate-150 justify-between border border-white/20">
      <div className="flex items-center">
        <Image src="/logo.png" alt="Logo" width={48} height={48} />
        <h1 className="text-2xl font-bold ml-2">LeafNest</h1>
      </div>
      <div className="mt-4">
        <div className="flex items-center p-2 cursor-pointer font-bold transform transition-transform duration-200 hover:translate-x-1 bg-black text-white rounded-lg">
          <BookText />
          <span className="ml-2">Books</span>
        </div>
      </div>
    </div>
  );
};
