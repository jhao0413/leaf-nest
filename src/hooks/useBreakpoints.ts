import { MOBILE_BREAKPOINT } from "@/utils/const";
import { useEffect, useState } from "react";

export const useBreakpoints = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window?.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return { isMobile };
};

