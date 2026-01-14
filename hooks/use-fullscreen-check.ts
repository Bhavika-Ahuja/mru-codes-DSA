import { useEffect, useState } from "react";
import screenfull from "screenfull";

export function useFullscreenCheck() {
  const getIsSupported = () =>
    typeof window !== "undefined" && screenfull.isEnabled;

  const getIsFullscreen = () =>
    typeof window !== "undefined" && screenfull.isEnabled
      ? screenfull.isFullscreen
      : false;

  const [isFullscreen, setIsFullscreen] = useState(getIsFullscreen);
  const [isSupported] = useState(getIsSupported);

  useEffect(() => {
    if (!screenfull.isEnabled) return;

    // Listen for fullscreen changes
    const handleChange = () => {
      if (screenfull.isEnabled) {
        setIsFullscreen(screenfull.isFullscreen);
      }
    };

    screenfull.on("change", handleChange);

    return () => {
      screenfull.off("change", handleChange);
    };
  }, []);

  const requestFullscreen = async (): Promise<boolean> => {
    if (!screenfull.isEnabled) {
      return false;
    }

    try {
      await screenfull.request();
      return true;
    } catch (error) {
      console.error("Failed to request fullscreen:", error);
      return false;
    }
  };

  const exitFullscreen = async (): Promise<void> => {
    if (screenfull.isEnabled && screenfull.isFullscreen) {
      await screenfull.exit();
    }
  };

  return {
    isFullscreen,
    isSupported,
    requestFullscreen,
    exitFullscreen,
  };
}
