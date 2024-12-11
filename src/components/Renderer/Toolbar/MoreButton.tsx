import { Button } from "@nextui-org/button";
import { MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { Toolbar } from "./Index";

export const MoreButton = () => {
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);

  // click outside to close
  useEffect(() => {
    const handleClickOutside = () => {
      if (isToolbarExpanded) {
        setIsToolbarExpanded(false);
        return false;
      }

      return true;
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isToolbarExpanded]);

  return (
    <div className="sm:hidden">
      <Button
        className="more-button ml-2 bg-white dark:bg-neutral-900"
        isIconOnly
        variant="bordered"
        radius="sm"
        onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
      >
        <MoreVertical size={16} className="dark:bg-neutral-900" />
      </Button>
      <div
        className={
          "absolute top-full bg-white dark:bg-neutral-900 " +
          (isToolbarExpanded ? "block" : "hidden")
        }
      >
        <Toolbar />
      </div>
    </div>
  );
};
