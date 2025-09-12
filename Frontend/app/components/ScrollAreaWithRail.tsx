import React, { forwardRef, useRef, useImperativeHandle } from "react";
import DetachedScrollbar from "@/app/components/DetachedScrollbar";
import { DETACHED_RAIL } from "@/app/components/ui/scrollbarConfig";

type Props = React.PropsWithChildren<{
  className?: string;
  heightClass?: string;                   // e.g. "h-[440px]"
  railPosition?: "inside" | "outside";    // default: outside
  railTopOffset?: number;                 // pixels to push rail down from top
  /** If true, we treat the content as inside a card; rail sits OUTSIDE card by visualGap */
  containerHasCard?: boolean;             // default: false
  /** Visual gap to keep between content edge (card or table) and the rail */
  visualGap?: number;                     // default: DETACHED_RAIL.visualGap
}>;

const ScrollAreaWithRail = forwardRef<HTMLDivElement, Props>(
  (
    {
      className = "",
      heightClass = "h-[440px]",
      railPosition = "outside",
      railTopOffset = 0,
      containerHasCard = false,
      visualGap = DETACHED_RAIL.visualGap,
      children,
    },
    ref
  ) => {
    const localRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

    // We only reserve gutter when the rail is INSIDE the scroll area.
    const reserveGutter = railPosition === "inside";

    // Where should the rail render horizontally?
    // - outside + has card: rail sits visualGap outside the card edge
    // - outside + no card : rail at container edge, content gets margin-right = visualGap
    // - inside            : rail is inside the container; we use insideRight value
    const rightValue =
      railPosition === "inside"
        ? DETACHED_RAIL.insideRight
        : containerHasCard
        ? -(visualGap + DETACHED_RAIL.outsideNudge)
        : -DETACHED_RAIL.outsideNudge;

    // Add margin-right to content ONLY when we are "outside" and there is NO card.
    const contentRightMargin =
      railPosition === "outside" && !containerHasCard ? visualGap : undefined;

    return (
      <div className="relative">
        <div
          ref={localRef}
          className={`${heightClass} overflow-y-auto overflow-x-auto hide-scrollbar ${className}`}
          style={{ marginRight: contentRightMargin }}
        >
          {children}
        </div>

        <DetachedScrollbar
          containerRef={localRef}
          right={rightValue}
          width={DETACHED_RAIL.width}
          gap={visualGap}             // not used in 'outside' placement; safe to keep unified
          reserveGutter={reserveGutter}
          topOffset={railTopOffset}
          bottomOffset={0}
        />
      </div>
    );
  }
);

export default ScrollAreaWithRail;