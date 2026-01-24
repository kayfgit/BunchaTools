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
}

/**
 * Hook that automatically resizes the Tauri window based on content height.
 * Uses ResizeObserver to detect content changes and sets size directly (no animation)
 * to avoid lag between window size and native shadow/border.
 */
export function useWindowAutoSize<T extends HTMLElement>({
  config,
  enabled = true,
}: UseWindowAutoSizeOptions) {
  const contentRef = useRef<T>(null);
  const targetHeightRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  const setWindowSize = useCallback(
    async (targetHeight: number, targetWidth: number) => {
      const appWindow = getCurrentWindow();
      try {
        await appWindow.setSize(new LogicalSize(targetWidth, targetHeight));
      } catch (e) {
        // Window might be closed or unavailable
        console.error("Failed to resize window:", e);
      }
    },
    []
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

    // Only resize if the target height actually changed
    if (targetHeight !== targetHeightRef.current) {
      targetHeightRef.current = targetHeight;

      // Debounce resize calls to avoid rapid successive updates
      if (resizeTimeoutRef.current !== null) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = window.setTimeout(() => {
        setWindowSize(targetHeight, config.width);
        resizeTimeoutRef.current = null;
      }, 16); // ~1 frame delay for batching
    }
  }, [config, enabled, setWindowSize]);

  useEffect(() => {
    if (!enabled || !contentRef.current) return;

    // Initial measurement with a small delay to ensure DOM is ready
    const initialTimeout = setTimeout(measureAndResize, 10);

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
      clearTimeout(initialTimeout);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (resizeTimeoutRef.current !== null) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [enabled, measureAndResize]);

  // Reset height tracking when config changes (view switch)
  useEffect(() => {
    targetHeightRef.current = null;

    // Force immediate resize to new width/height
    // Use multiple attempts to catch content that renders asynchronously
    const immediateResize = () => {
      if (!contentRef.current || !enabled) return;

      const contentHeight = contentRef.current.scrollHeight;
      const padding = config.padding ?? 0;
      let targetHeight = contentHeight + padding;

      if (config.minHeight !== undefined) {
        targetHeight = Math.max(targetHeight, config.minHeight);
      }
      if (config.maxHeight !== undefined) {
        targetHeight = Math.min(targetHeight, config.maxHeight);
      }

      targetHeightRef.current = targetHeight;
      setWindowSize(targetHeight, config.width);
    };

    // Immediate attempt
    immediateResize();

    // Retry after React has finished rendering
    const raf1 = requestAnimationFrame(immediateResize);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(immediateResize));

    // Final retry after a short delay for any async content
    const timeout = setTimeout(immediateResize, 50);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeout);
    };
  }, [config.width, config.minHeight, config.maxHeight, config.padding, enabled, setWindowSize]);

  return { contentRef, measureAndResize };
}
