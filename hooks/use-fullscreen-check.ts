import { useEffect, useState } from "react";
import screenfull from "screenfull";

export function useFullscreenCheck() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if fullscreen is supported
    setIsSupported(screenfull.isEnabled);

    // Check initial state
    if (screenfull.isEnabled) {
      setIsFullscreen(screenfull.isFullscreen);
    }

    // Listen for fullscreen changes
    const handleChange = () => {
      if (screenfull.isEnabled) {
        setIsFullscreen(screenfull.isFullscreen);
      }
    };

    if (screenfull.isEnabled) {
      screenfull.on("change", handleChange);
    }

    return () => {
      if (screenfull.isEnabled) {
        screenfull.off("change", handleChange);
      }
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
