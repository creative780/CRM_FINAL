import React, { useEffect, useRef, useState } from "react";

type AnyRef<T extends HTMLElement> =
  | React.RefObject<T>
  | React.MutableRefObject<T | null>;

type ScrollbarProps<T extends HTMLElement = HTMLElement> = {
  /** The scrollable container whose scrollTop we control */
  containerRef: AnyRef<T>;
  /** px from the right edge of the nearest positioned ancestor (can be negative to sit outside) */
  right?: number;
  /** width in px of the detached scrollbar */
  width?: number;
  /** extra breathing room between content and rail (px) */
  gap?: number;
  /** auto-reserve padding-right on the scroll container so content never collides */
  reserveGutter?: boolean;
  /** optional offsets if you have sticky headers/footers inside the container */
  topOffset?: number;
  bottomOffset?: number;
  /** optional className for styling */
  className?: string;
};

export default function DetachedScrollbar<T extends HTMLElement = HTMLElement>({
  containerRef,
  right = 8,
  width = 6,
  gap = 8,
  reserveGutter = true,
  topOffset = 0,
  bottomOffset = 0,
  className = "",
}: ScrollbarProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(20);
  const draggingRef = useRef<{ startY: number; startScrollTop: number } | null>(
    null
  );

  const getEl = () => containerRef.current as T | null;

  // Reserve gutter inside the scroll container (disabled for outside rails)
  useEffect(() => {
    const el = getEl();
    if (!el || !reserveGutter) return;

    const originalPaddingRight = el.style.paddingRight;
    const gutter = right + width + gap;
    el.style.paddingRight = `${gutter}px`;

    return () => {
      el.style.paddingRight = originalPaddingRight;
    };
  }, [reserveGutter, right, width, gap]);

  const updateThumb = () => {
    const el = getEl();
    const track = trackRef.current;
    if (!el || !track) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const trackH = track.clientHeight;
    const ratio = clientHeight / scrollHeight;
    const minThumb = 20; // keep it usable
    const h = Math.max(minThumb, Math.round(trackH * ratio));
    const maxThumbTop = Math.max(0, trackH - h);
    const top =
      Math.round(
        (scrollTop / Math.max(1, scrollHeight - clientHeight)) * maxThumbTop
      ) || 0;

    setThumbHeight(h);
    setThumbTop(Number.isFinite(top) ? top : 0);
  };

  useEffect(() => {
    const el = getEl();
    if (!el) return;

    updateThumb();
    const onScroll = () => updateThumb();
    const onResize = () => updateThumb();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);

  // Drag to scroll
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      const el = getEl();
      const track = trackRef.current;
      if (!d || !el || !track) return;

      const deltaY = e.clientY - d.startY;
      const trackH = track.clientHeight;
      const maxThumbTop = Math.max(0, trackH - thumbHeight);
      const nextThumbTop = Math.min(
        Math.max(0, d.startScrollTop + deltaY),
        maxThumbTop
      );

      const { scrollHeight, clientHeight } = el;
      const scrollRange = Math.max(1, scrollHeight - clientHeight);
      el.scrollTop = (nextThumbTop / maxThumbTop) * scrollRange;
    };

    const onUp = () => {
      draggingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
    };

    if (draggingRef.current) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [thumbHeight]);

  const onThumbDown = (e: React.MouseEvent) => {
    draggingRef.current = { startY: e.clientY, startScrollTop: thumbTop };
  };

  const onTrackClick = (e: React.MouseEvent) => {
    const el = getEl();
    const track = trackRef.current;
    if (!el || !track) return;

    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const targetTop = Math.max(0, clickY - thumbHeight / 2);
    const maxThumbTop = Math.max(0, track.clientHeight - thumbHeight);

    const { scrollHeight, clientHeight } = el;
    const scrollRange = Math.max(1, scrollHeight - clientHeight);
    el.scrollTop = (targetTop / maxThumbTop) * scrollRange;
  };

  return (
    <div
      className={`absolute ${className}`}
      style={{ right, width, top: topOffset, bottom: bottomOffset }}
      aria-hidden
    >
      <div
        ref={trackRef}
        className="h-full rounded-full bg-transparent hover:bg-black/5 transition-colors cursor-pointer relative"
        onMouseDown={onTrackClick}
      >
        <div
          className="absolute left-0 right-0 rounded-full bg-black/40 hover:bg-black/60 dark:bg-white/40 dark:hover:bg-white/60 transition-colors"
          style={{ top: thumbTop, height: thumbHeight, width }}
          onMouseDown={onThumbDown}
        />
      </div>
    </div>
  );
}
