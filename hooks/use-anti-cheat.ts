import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import screenfull from "screenfull";

interface AntiCheatConfig {
  onViolation?: (type: string, count: number) => void;
  maxViolations?: number;
  enableFullscreen?: boolean;
  sessionId: string;
  isActive?: boolean;
}

export function useAntiCheat(config: AntiCheatConfig) {
  const {
    onViolation,
    maxViolations = 15, // More lenient - 15 warnings before auto-submit
    enableFullscreen = true,
    sessionId,
    isActive = true,
  } = config;

  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenRequested, setIsFullscreenRequested] = useState(false);
  const violationCountRef = useRef(0);
  const lastWarningTimeRef = useRef(0);
  const violationTypesRef = useRef<Set<string>>(new Set());
  const gracePeriodRef = useRef(true);
  const gracePeriodTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenExitCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastFullscreenStateRef = useRef<boolean | null>(null);
  const fullscreenExitGracePeriodRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenExitTimeRef = useRef<number | null>(null);

  // Start grace period (45 seconds) - no violations during initial setup
  useEffect(() => {
    if (isActive && enableFullscreen) {
      gracePeriodRef.current = true;
      gracePeriodTimeoutRef.current = setTimeout(() => {
        gracePeriodRef.current = false;
      }, 45000); // 45 second grace period for better UX

      return () => {
        if (gracePeriodTimeoutRef.current) {
          clearTimeout(gracePeriodTimeoutRef.current);
        }
      };
    }
  }, [isActive, enableFullscreen]);

  // Get user-friendly violation message (defined first to avoid hoisting issues)
  const getViolationMessage = (type: string): string => {
    const messages: Record<string, string> = {
      tab_switch: "Tab switching detected",
      window_blur: "Window focus lost",
      fullscreen_exit: "Fullscreen mode exited",
      right_click: "Right-click disabled",
      copy_attempt: "Copy action blocked",
      paste_attempt: "Paste action blocked",
      devtools_shortcut: "Developer tools shortcut blocked",
      view_source: "View source blocked",
      print_attempt: "Print attempt blocked",
    };
    return messages[type] || "Suspicious activity detected";
  };

  // Track violations with deduplication
  const recordViolation = useCallback(
    (type: string, severity: "low" | "medium" | "high" = "medium") => {
      // Skip violations during grace period (except high severity and fullscreen_exit)
      if (gracePeriodRef.current && severity !== "high" && type !== "fullscreen_exit") {
        return;
      }

      // Deduplicate rapid violations of same type
      const violationKey = `${type}_${Date.now()}`;
      if (violationTypesRef.current.has(violationKey)) {
        return;
      }
      violationTypesRef.current.add(violationKey);

      // Clear old violation keys (keep only last 10 seconds)
      setTimeout(() => {
        violationTypesRef.current.delete(violationKey);
      }, 10000);

      violationCountRef.current += 1;
      const newCount = violationCountRef.current;
      setViolationCount(newCount);

      // Show warning (throttled) - only for high severity or after grace period
      const now = Date.now();
      // For fullscreen exit, show warning immediately (no throttling)
      const shouldThrottle = type !== "fullscreen_exit";
      const throttleTime = shouldThrottle ? 8000 : 0; // No throttling for fullscreen exit
      
      if (now - lastWarningTimeRef.current > throttleTime || type === "fullscreen_exit") {
        lastWarningTimeRef.current = now;

        // Always show warnings for fullscreen_exit, or for high severity, or if we're past grace period
        if (type === "fullscreen_exit" || severity === "high" || !gracePeriodRef.current) {
          if (type === "fullscreen_exit") {
            // Special handling for fullscreen exit - always show warning with 15 second duration
            console.log("Showing fullscreen exit toast");
            toast.error(
              `⚠️ Fullscreen Exited! You have ${maxViolations - newCount} warnings remaining. Return to fullscreen immediately (F11).`,
              { duration: 15000 } // 15 second toast duration
            );
          } else if (newCount < maxViolations - 5) {
            // Early warnings - less aggressive
            toast.warning(
              `Notice: ${getViolationMessage(type)}. ${maxViolations - newCount} warnings remaining.`,
              { duration: 3000 }
            );
          } else if (newCount < maxViolations - 2) {
            toast.warning(
              `Warning: ${getViolationMessage(type)}. You have ${maxViolations - newCount} warnings remaining.`,
              { duration: 4000 }
            );
          } else if (newCount < maxViolations) {
            toast.error(
              `Final Warning: ${getViolationMessage(type)}. Your quiz will be auto-submitted after ${maxViolations - newCount} more violation(s).`,
              { duration: 6000 }
            );
          }
        }
      }

      // Call callback
      if (onViolation) {
        onViolation(type, newCount);
      }

      // Auto-submit if max violations reached (but not if it's from fullscreen exit - that has a 15-second grace period)
      // Only auto-submit immediately for non-fullscreen violations
      if (newCount >= maxViolations && type !== "fullscreen_exit" && fullscreenExitTimeRef.current === null) {
        toast.error(
          "Maximum violations reached. Your quiz is being submitted automatically.",
          { duration: 10000 }
        );
        if (onViolation) {
          onViolation("max_violations", newCount);
        }
      }
    },
    [onViolation, maxViolations, getViolationMessage]
  );

  // Check if fullscreen using screenfull library (reliable cross-browser)
  const checkFullscreen = useCallback(() => {
    if (screenfull.isEnabled) {
      const isFull = screenfull.isFullscreen;
      setIsFullscreen(isFull);
      // Update last known state
      if (isFull) {
        lastFullscreenStateRef.current = true;
      }
      return isFull;
    }
    return false;
  }, []);

  // Request fullscreen using screenfull library
  const requestFullscreen = useCallback(async (): Promise<boolean> => {
    if (!enableFullscreen) return true;

    if (!screenfull.isEnabled) {
      return false;
    }

    try {
      await screenfull.request();
      setIsFullscreen(true);
      setIsFullscreenRequested(true);
      return true;
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      console.error("Failed to enter fullscreen:", err);
      
      // Check if already in fullscreen
      const isFull = checkFullscreen();
      if (isFull) {
        setIsFullscreen(true);
        setIsFullscreenRequested(true);
        return true;
      }

      return false;
    }
  }, [enableFullscreen, checkFullscreen]);

  // Initialize fullscreen requested state when fullscreen is enabled
  useEffect(() => {
    if (enableFullscreen && isActive && screenfull.isEnabled) {
      // Mark as requested if we're already in fullscreen
      if (screenfull.isFullscreen) {
        setIsFullscreenRequested(true);
        setIsFullscreen(true);
      }
    }
  }, [enableFullscreen, isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    // Prevent right-click (only after grace period)
    const handleContextMenu = (e: MouseEvent) => {
      if (!gracePeriodRef.current) {
        e.preventDefault();
        recordViolation("right_click", "low");
      }
      return false;
    };

    // Prevent copy (only after grace period)
    const handleCopy = (e: ClipboardEvent) => {
      if (!gracePeriodRef.current) {
        e.preventDefault();
        recordViolation("copy_attempt", "medium");
      }
      return false;
    };

    // Prevent cut
    const handleCut = (e: ClipboardEvent) => {
      if (!gracePeriodRef.current) {
        e.preventDefault();
        recordViolation("cut_attempt", "medium");
      }
      return false;
    };

    // Prevent paste
    const handlePaste = (e: ClipboardEvent) => {
      if (!gracePeriodRef.current) {
        e.preventDefault();
        recordViolation("paste_attempt", "medium");
      }
      return false;
    };

    // Prevent keyboard shortcuts (only critical ones)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gracePeriodRef.current) return;

      // F12 - Developer Tools
      if (e.key === "F12") {
        e.preventDefault();
        recordViolation("devtools_shortcut", "high");
        return false;
      }

      // Ctrl+Shift+I/J/C - Developer Tools
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) {
        e.preventDefault();
        recordViolation("devtools_shortcut", "high");
        return false;
      }

      // Ctrl+U - View Source
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        recordViolation("view_source", "high");
        return false;
      }

      // Ctrl+P - Print
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        recordViolation("print_attempt", "medium");
        return false;
      }

      // Ctrl+C/V/X - Copy/Paste/Cut (already handled by clipboard events)
      if (e.ctrlKey && ["c", "v", "x"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
    };

    // Tab visibility detection (with debouncing) - more lenient
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (gracePeriodRef.current) return;

      if (document.hidden) {
        // Debounce - only record if hidden for more than 2 seconds (more lenient)
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        visibilityTimeout = setTimeout(() => {
          if (document.hidden) {
            recordViolation("tab_switch", "high");
          }
        }, 2000); // Increased from 1s to 2s
      } else {
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
      }
    };

    // Window blur (less aggressive) - only for extended focus loss
    let blurTimeout: NodeJS.Timeout | null = null;
    const handleBlur = () => {
      if (gracePeriodRef.current) return;

      // Only record if blur persists for more than 3 seconds (more lenient)
      blurTimeout = setTimeout(() => {
        if (!document.hasFocus()) {
          recordViolation("window_blur", "medium");
        }
      }, 3000); // Increased from 2s to 3s
    };

    const handleFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
      }
    };

    // Fullscreen change detection using screenfull
    const handleFullscreenChange = () => {
      if (screenfull.isEnabled) {
        const isFull = screenfull.isFullscreen;
        setIsFullscreen(isFull);
        
        // Clear any pending exit checks and grace period
        if (fullscreenExitCheckRef.current) {
          clearTimeout(fullscreenExitCheckRef.current);
          fullscreenExitCheckRef.current = null;
        }
        if (fullscreenExitGracePeriodRef.current) {
          clearTimeout(fullscreenExitGracePeriodRef.current);
          fullscreenExitGracePeriodRef.current = null;
        }
        
        // If entering fullscreen, mark as requested and clear exit state
        if (isFull && enableFullscreen) {
          setIsFullscreenRequested(true);
          lastFullscreenStateRef.current = true;
          fullscreenExitTimeRef.current = null; // Clear exit time
        }
        
        // Record violation if fullscreen is exited (with debounce to prevent false positives)
        if (!isFull && enableFullscreen && isFullscreenRequested) {
          // Debounce: only record if fullscreen remains exited for 500ms
          fullscreenExitCheckRef.current = setTimeout(() => {
            // Double-check that we're still not in fullscreen
            if (screenfull.isEnabled && !screenfull.isFullscreen && lastFullscreenStateRef.current === true) {
              console.log("Fullscreen exited detected, starting 15-second grace period");
              fullscreenExitTimeRef.current = Date.now();
              
              // Show warning immediately
              recordViolation("fullscreen_exit", "high");
              
              // Start 15-second grace period before auto-submitting
              fullscreenExitGracePeriodRef.current = setTimeout(() => {
                // Check if still not in fullscreen after 15 seconds
                if (screenfull.isEnabled && !screenfull.isFullscreen && fullscreenExitTimeRef.current !== null) {
                  console.log("15-second grace period expired, auto-submitting quiz");
                  // Force max violations to trigger auto-submit
                  violationCountRef.current = maxViolations;
                  setViolationCount(maxViolations);
                  if (onViolation) {
                    onViolation("max_violations", maxViolations);
                  }
                }
              }, 15000); // 15 second grace period
              
              lastFullscreenStateRef.current = false;
            }
          }, 500); // 500ms debounce to prevent false positives
        }
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      if (!gracePeriodRef.current) {
        e.preventDefault();
        recordViolation("drag_attempt", "low");
      }
      return false;
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    // Use screenfull's change event listener
    if (screenfull.isEnabled) {
      screenfull.on("change", handleFullscreenChange);
    }
    document.addEventListener("dragstart", handleDragStart);

    // Periodic fullscreen check (every 2 seconds) - more responsive
    const fullscreenCheckInterval = setInterval(() => {
      if (enableFullscreen) {
        const isFull = checkFullscreen();
        
        // If fullscreen is detected, mark as requested and update state
        if (isFull) {
          if (!isFullscreenRequested) {
            setIsFullscreenRequested(true);
          }
          lastFullscreenStateRef.current = true;
          // Clear any pending exit checks and grace period since we're in fullscreen
          if (fullscreenExitCheckRef.current) {
            clearTimeout(fullscreenExitCheckRef.current);
            fullscreenExitCheckRef.current = null;
          }
          if (fullscreenExitGracePeriodRef.current) {
            clearTimeout(fullscreenExitGracePeriodRef.current);
            fullscreenExitGracePeriodRef.current = null;
          }
          fullscreenExitTimeRef.current = null; // Clear exit time
        } else if (isFullscreenRequested && lastFullscreenStateRef.current === true && fullscreenExitTimeRef.current === null) {
          // Only check if we were previously in fullscreen and haven't already started grace period
          // Debounce: only record if fullscreen remains exited for 1 second
          if (!fullscreenExitCheckRef.current) {
            fullscreenExitCheckRef.current = setTimeout(() => {
              // Double-check that we're still not in fullscreen
              if (screenfull.isEnabled && !screenfull.isFullscreen && lastFullscreenStateRef.current === true) {
                console.log("Periodic check: Fullscreen exited, starting 15-second grace period");
                fullscreenExitTimeRef.current = Date.now();
                
                // Show warning immediately
                recordViolation("fullscreen_exit", "high");
                
                // Start 15-second grace period before auto-submitting
                fullscreenExitGracePeriodRef.current = setTimeout(() => {
                  // Check if still not in fullscreen after 15 seconds
                  if (screenfull.isEnabled && !screenfull.isFullscreen && fullscreenExitTimeRef.current !== null) {
                    console.log("15-second grace period expired, auto-submitting quiz");
                    // Force max violations to trigger auto-submit
                    violationCountRef.current = maxViolations;
                    setViolationCount(maxViolations);
                    if (onViolation) {
                      onViolation("max_violations", maxViolations);
                    }
                  }
                }, 15000); // 15 second grace period
                
                lastFullscreenStateRef.current = false;
              }
            }, 1000); // 1 second debounce for periodic check
          }
        }
      }
    }, 2000); // Check every 2 seconds for better responsiveness

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("dragstart", handleDragStart);
      if (screenfull.isEnabled) {
        screenfull.off("change", handleFullscreenChange);
      }
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      if (blurTimeout) clearTimeout(blurTimeout);
      if (fullscreenExitCheckRef.current) clearTimeout(fullscreenExitCheckRef.current);
      if (fullscreenExitGracePeriodRef.current) clearTimeout(fullscreenExitGracePeriodRef.current);
      clearInterval(fullscreenCheckInterval);
    };
  }, [
    recordViolation,
    enableFullscreen,
    checkFullscreen,
    isActive,
    isFullscreenRequested,
    requestFullscreen,
  ]);

  // Send violation reports to server (debounced)
  useEffect(() => {
    if (violationCount > 0) {
      const timeout = setTimeout(() => {
        fetch(`/api/sessions/${sessionId}/violations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            violationCount,
            timestamp: new Date().toISOString(),
          }),
        }).catch((error) => {
          console.error("Failed to report violation:", error);
        });
      }, 5000); // Debounce - send every 5 seconds max

      return () => clearTimeout(timeout);
    }
  }, [violationCount, sessionId]);

  return {
    violationCount,
    isFullscreen,
    requestFullscreen,
    checkFullscreen,
    isFullscreenRequested,
  };
}
