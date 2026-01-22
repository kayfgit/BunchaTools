import { useEffect, useRef, useCallback } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

interface WindowSizeConfig {
  width: number;
  minHeight?: number;
  maxHeight?: number;
  padding?: number;
}

interface UseWindowAutoSizeOptions {
  config: WindowSizeConfig;
  enabled?: boolean;
  animationDuration?: number;
}

/**
 * Hook that automatically resizes the Tauri window based on content height.
 * Uses ResizeObserver to detect content changes and animates the resize smoothly.
 */
export function useWindowAutoSize<T extends HTMLElement>({
  config,
  enabled = true,
  animationDuration = 150,
}: UseWindowAutoSizeOptions) {
  const contentRef = useRef<T>(null);
  const currentHeightRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const targetHeightRef = useRef<number | null>(null);

  const animateResize = useCallback(
    (targetHeight: number, targetWidth: number) => {
      const appWindow = getCurrentWindow();
      const startHeight = currentHeightRef.current ?? targetHeight;
      const startTime = performance.now();

      const animate = async (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Ease-out cubic for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentHeight = Math.round(
          startHeight + (targetHeight - startHeight) * easeOut
        );

        try {
          await appWindow.setSize(new LogicalSize(targetWidth, currentHeight));
          currentHeightRef.current = currentHeight;
        } catch (e) {
          // Window might be closed or unavailable
          console.error("Failed to resize window:", e);
          return;
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = null;
        }
      };

      // Cancel any ongoing animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [animationDuration]
  );

  const measureAndResize = useCallback(() => {
    if (!contentRef.current || !enabled) return;

    const contentHeight = contentRef.current.scrollHeight;
    const padding = config.padding ?? 0;
    let targetHeight = contentHeight + padding;

    // Apply constraints
    if (config.minHeight !== undefined) {
      targetHeight = Math.max(targetHeight, config.minHeight);
    }
    if (config.maxHeight !== undefined) {
      targetHeight = Math.min(targetHeight, config.maxHeight);
    }

    // Only animate if the target height actually changed
    if (targetHeight !== targetHeightRef.current) {
      targetHeightRef.current = targetHeight;
      animateResize(targetHeight, config.width);
    }
  }, [config, enabled, animateResize]);

  useEffect(() => {
    if (!enabled || !contentRef.current) return;

    // Initial measurement
    measureAndResize();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      measureAndResize();
    });

    resizeObserver.observe(contentRef.current);

    // Also observe for DOM mutations that might affect size
    const mutationObserver = new MutationObserver(() => {
      // Small delay to let the DOM settle
      requestAnimationFrame(measureAndResize);
    });

    mutationObserver.observe(contentRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, measureAndResize]);

  // Reset height tracking when config changes (view switch)
  useEffect(() => {
    currentHeightRef.current = null;
    targetHeightRef.current = null;
  }, [config.width]);

  return { contentRef, measureAndResize };
}
