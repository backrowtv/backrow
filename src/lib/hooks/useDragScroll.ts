import { useRef, useEffect } from "react";

/**
 * Hook to enable drag-to-scroll functionality for horizontal scrollable elements
 * Works like mobile touch scrolling but with mouse drag on desktop
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasMoved = useRef(false);
  const rafId = useRef<number | null>(null);
  const lastX = useRef(0);
  const clickBlockedRef = useRef(false);
  const previousX = useRef(0);
  // Touch-specific state
  const isTouching = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchMoved = useRef(false);

  useEffect(() => {
    // Check periodically if element is ready (for async-loaded content)
    const checkAndSetup = () => {
      const element = ref.current;
      if (!element) return;

      // If already set up, skip
      if (element.classList.contains("drag-scroll-container") && cleanupRef.current) {
        return;
      }

      // Clean up previous setup
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Set initial cursor style using CSS class immediately
      element.classList.add("drag-scroll-container");

      // Re-check scrollability when content changes (for async-loaded content)
      const checkScrollability = () => {
        const isScrollable = element.scrollWidth > element.clientWidth;
        if (!isScrollable) {
          element.classList.remove("drag-scroll-container");
        } else {
          element.classList.add("drag-scroll-container");
        }
      };

      // Check initially
      checkScrollability();

      // Watch for content changes
      const resizeObserver = new ResizeObserver(() => {
        checkScrollability();
      });
      resizeObserver.observe(element);

      // Also watch for DOM changes (for async-loaded content)
      const contentObserver = new MutationObserver(() => {
        checkScrollability();
      });
      contentObserver.observe(element, { childList: true, subtree: true });

      const resetDragState = () => {
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        const wasDragging = hasMoved.current;
        isDown.current = false;
        hasMoved.current = false;
        element.classList.remove("drag-scrolling");
        element.style.userSelect = "";
        element.style.cursor = "";
        // Keep click blocked briefly after drag so the click event (which fires
        // after mouseup) is still suppressed, then reset on next frame
        if (wasDragging) {
          clickBlockedRef.current = true;
          requestAnimationFrame(() => {
            clickBlockedRef.current = false;
          });
        } else {
          clickBlockedRef.current = false;
        }
      };

      const updateScroll = () => {
        if (!isDown.current) {
          rafId.current = null;
          return;
        }

        // Calculate incremental scroll based on difference from previous position
        // Dragging right (lastX > previousX) should scroll right (increase scrollLeft)
        const deltaX = lastX.current - previousX.current;
        const newScrollLeft = element.scrollLeft - deltaX;

        // Clamp to valid scroll range
        const maxScroll = element.scrollWidth - element.clientWidth;
        element.scrollLeft = Math.max(0, Math.min(maxScroll, newScrollLeft));

        // Update previous position for next frame
        previousX.current = lastX.current;

        rafId.current = requestAnimationFrame(updateScroll);
      };

      const handleMouseDown = (e: MouseEvent) => {
        // Only start drag on left mouse button
        if (e.button !== 0) return;

        // Don't start drag if clicking on a link/button that explicitly wants to ignore drag
        const target = e.target as HTMLElement;
        if (target.closest("[data-drag-scroll-ignore]")) {
          return;
        }

        // Check if element is actually scrollable before starting drag
        const isScrollable = element.scrollWidth > element.clientWidth;
        if (!isScrollable) {
          return;
        }

        // Reset any existing drag state first - important for rapid interactions
        if (isDown.current) {
          resetDragState();
        }
        clickBlockedRef.current = false;

        // Store initial state
        isDown.current = true;
        hasMoved.current = false;
        lastX.current = e.pageX;
        previousX.current = e.pageX; // Initialize previous position

        // Use CSS class for cursor
        element.classList.add("drag-scrolling");
        element.style.userSelect = "none";

        startX.current = e.pageX; // Store absolute page position
        scrollLeft.current = element.scrollLeft;

        // Start animation frame loop
        rafId.current = requestAnimationFrame(updateScroll);
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDown.current) return;

        // Update last position immediately
        lastX.current = e.pageX;

        // Check if we've moved enough to consider it a drag
        const deltaX = Math.abs(e.pageX - startX.current);
        if (deltaX > 3) {
          hasMoved.current = true;
          clickBlockedRef.current = true;
          // Once we've moved, prevent default to stop link navigation
          e.preventDefault();
          e.stopPropagation();
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        // Always reset drag state on mouseup, regardless of where it happens
        if (isDown.current) {
          // If we were dragging, prevent the click
          if (hasMoved.current) {
            e.preventDefault();
            e.stopPropagation();
            clickBlockedRef.current = true;
          }
          resetDragState();
        }
      };

      const handleMouseLeave = () => {
        // Reset drag state when mouse leaves the element
        if (hasMoved.current) {
          clickBlockedRef.current = true;
        }
        resetDragState();
      };

      const handleDragStart = (e: DragEvent) => {
        // Prevent native link drag behavior
        if (isDown.current || hasMoved.current || clickBlockedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };

      const handleClick = (e: MouseEvent) => {
        // Prevent clicks if we were dragging or if click is blocked
        if (hasMoved.current || clickBlockedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      };

      // Handle visibility change (tab switch, etc.)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          resetDragState();
        }
      };

      // Handle context menu (right click) - reset drag state
      const handleContextMenu = () => {
        resetDragState();
      };

      // Touch event handlers to prevent long press from opening links
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        isTouching.current = true;
        touchMoved.current = false;
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!isTouching.current || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX.current);
        const deltaY = Math.abs(touch.clientY - touchStartY.current);

        // If moved more than 10px in any direction, consider it a scroll/drag
        if (deltaX > 10 || deltaY > 10) {
          touchMoved.current = true;
          clickBlockedRef.current = true;
        }
      };

      const handleTouchEnd = () => {
        // Keep click blocked briefly if we were scrolling
        if (touchMoved.current) {
          clickBlockedRef.current = true;
          // Reset after a short delay
          setTimeout(() => {
            if (!isTouching.current) {
              clickBlockedRef.current = false;
            }
          }, 100);
        }
        isTouching.current = false;
        touchMoved.current = false;
      };

      // Prevent drag on all links inside the element
      const handleLinkSetup = () => {
        const links = element.querySelectorAll("a");
        links.forEach((link) => {
          link.draggable = false;
          link.addEventListener("dragstart", handleDragStart, { passive: false });
          // Also prevent click if we were dragging
          link.addEventListener(
            "click",
            (e) => {
              if (hasMoved.current || clickBlockedRef.current) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
              }
            },
            { capture: true, passive: false }
          );
        });
      };

      // Setup links initially
      handleLinkSetup();

      // Watch for new links added dynamically
      const observer = new MutationObserver(() => {
        handleLinkSetup();
      });
      observer.observe(element, { childList: true, subtree: true });

      // Use capture phase to catch events before links handle them
      element.addEventListener("mousedown", handleMouseDown, { capture: true, passive: false });
      element.addEventListener("mouseleave", handleMouseLeave);
      element.addEventListener("contextmenu", handleContextMenu);
      // Attach mousemove and mouseup to document so dragging works even outside the element
      document.addEventListener("mousemove", handleMouseMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp, { capture: true, passive: false });
      document.addEventListener("mouseleave", handleMouseUp); // Also reset on document mouseleave
      element.addEventListener("click", handleClick, { capture: true, passive: false });

      // Touch events for mobile - prevent long press from opening links
      element.addEventListener("touchstart", handleTouchStart, { passive: true });
      element.addEventListener("touchmove", handleTouchMove, { passive: true });
      element.addEventListener("touchend", handleTouchEnd, { passive: true });
      element.addEventListener("touchcancel", handleTouchEnd, { passive: true });

      document.addEventListener("visibilitychange", handleVisibilityChange);

      const cleanup = () => {
        resizeObserver.disconnect();
        contentObserver.disconnect();
        observer.disconnect();

        const links = element.querySelectorAll("a");
        const dragStartOptions: AddEventListenerOptions = { passive: false };
        links.forEach((link) => {
          link.removeEventListener("dragstart", handleDragStart, dragStartOptions);
        });

        const mouseDownOptions: AddEventListenerOptions = { capture: true };
        element.removeEventListener("mousedown", handleMouseDown, mouseDownOptions);
        element.removeEventListener("mouseleave", handleMouseLeave);
        element.removeEventListener("contextmenu", handleContextMenu);
        const mouseMoveOptions: AddEventListenerOptions = { passive: false };
        document.removeEventListener("mousemove", handleMouseMove, mouseMoveOptions);
        const mouseUpOptions: AddEventListenerOptions = { capture: true, passive: false };
        document.removeEventListener("mouseup", handleMouseUp, mouseUpOptions);
        document.removeEventListener("mouseleave", handleMouseUp);
        const clickOptions: AddEventListenerOptions = { capture: true, passive: false };
        element.removeEventListener("click", handleClick, clickOptions);

        // Remove touch event listeners
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchmove", handleTouchMove);
        element.removeEventListener("touchend", handleTouchEnd);
        element.removeEventListener("touchcancel", handleTouchEnd);

        document.removeEventListener("visibilitychange", handleVisibilityChange);
        // Reset styles and clear animation frame
        resetDragState();
        element.classList.remove("drag-scroll-container", "drag-scrolling");
        element.style.userSelect = "";
      };

      cleanupRef.current = cleanup;
    };

    checkAndSetup();

    // Check periodically for async-loaded content
    const intervalId = setInterval(checkAndSetup, 100);

    return () => {
      clearInterval(intervalId);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  return ref;
}
