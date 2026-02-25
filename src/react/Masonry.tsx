import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { computeLayout, resolveColumnCount } from '../layout';
import type { ItemPosition } from '../types';
import type { MasonryProps } from './types';
import { resolveStrategy, resolveAnimationConfig } from './utils';

/**
 * React masonry layout component.
 * Measures children, computes shortest-column layout, positions via transforms.
 *
 * ```tsx
 * <Masonry columns={4} gap={16}>
 *   {items.map(item => <Card key={item.id} />)}
 * </Masonry>
 * ```
 */
export function Masonry({
  children,
  columns,
  gap = 16,
  className,
  style,
  onLayout,
  animate,
  onReachEnd,
  reachEndThreshold = 200,
}: MasonryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<ItemPosition[]>([]);
  const [totalHeight, setTotalHeight] = useState(0);

  // Animation state
  const animConfig = resolveAnimationConfig(animate);
  const animatedRef = useRef<Set<number>>(new Set());
  const pendingAnimRef = useRef<Set<number>>(new Set());
  const [, forceUpdate] = useState(0);

  // onReachEnd state
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reachEndFiredRef = useRef(false);

  const childArray = Children.toArray(children);
  const childCount = childArray.length;
  const strategy = resolveStrategy(columns);

  // Memoize strategy to avoid new object reference every render
  const stableStrategy = useMemo(() => strategy, [
    strategy.type,
    strategy.type === 'fixed' ? strategy.count : undefined,
    strategy.type === 'auto' ? strategy.minColumnWidth : undefined,
    strategy.type === 'responsive' ? JSON.stringify(strategy.breakpoints) : undefined,
  ]);

  const computePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container || childCount === 0) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth <= 0) return;

    const colCount = resolveColumnCount(containerWidth, stableStrategy, gap);

    const items = [];
    for (let i = 0; i < childCount; i++) {
      const el = itemRefs.current.get(i);
      const height = el ? el.offsetHeight : 0;
      items.push({ id: i, index: i, height });
    }

    const result = computeLayout({
      items,
      containerWidth,
      columnCount: colCount,
      gap,
    });

    setPositions(result.positions);
    setTotalHeight(result.totalHeight);
    onLayout?.(result);
  }, [childCount, gap, stableStrategy, onLayout]);

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => computePositions());
    ro.observe(container);
    return () => ro.disconnect();
  }, [computePositions]);

  // Observe individual item resizes (images loading, dynamic content)
  useEffect(() => {
    const items = itemRefs.current;
    if (items.size === 0) return;

    const ro = new ResizeObserver(() => computePositions());
    for (const [, el] of items) {
      ro.observe(el);
    }
    return () => ro.disconnect();
  }, [childCount, computePositions]);

  // Initial layout
  useEffect(() => {
    computePositions();
  }, [computePositions]);

  // Animation: detect newly positioned items
  useEffect(() => {
    if (!animConfig || positions.length === 0) return;

    const newItems: number[] = [];
    for (let i = 0; i < positions.length; i++) {
      if (!animatedRef.current.has(i)) {
        animatedRef.current.add(i);
        pendingAnimRef.current.add(i);
        newItems.push(i);
      }
    }

    if (newItems.length === 0) return;

    // Force render with initial animation state (offset + opacity:0)
    forceUpdate((c) => c + 1);

    // Next frame: clear pending to trigger transition to final state
    requestAnimationFrame(() => {
      pendingAnimRef.current.clear();
      forceUpdate((c) => c + 1);
    });
  }, [positions, animConfig]);

  // onReachEnd: IntersectionObserver on sentinel
  useEffect(() => {
    reachEndFiredRef.current = false;
  }, [childCount]);

  useEffect(() => {
    if (!onReachEnd) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reachEndFiredRef.current) {
          reachEndFiredRef.current = true;
          onReachEnd();
        }
      },
      { rootMargin: `0px 0px ${reachEndThreshold}px 0px` },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onReachEnd, reachEndThreshold, totalHeight]);

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    height: totalHeight > 0 ? totalHeight : undefined,
    ...style,
  };

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      {childArray.map((child, index) => {
        const pos = positions[index];
        const isPending = animConfig && pendingAnimRef.current.has(index);
        const hasAnimated = animConfig && animatedRef.current.has(index);

        const itemStyle: CSSProperties = pos
          ? {
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translate3d(${pos.left}px, ${pos.top + (isPending ? (animConfig!.offset ?? 20) : 0)}px, 0)`,
              width: pos.width,
              willChange: 'transform',
              opacity: isPending ? 0 : 1,
              transition: hasAnimated
                ? `opacity ${animConfig!.duration}ms ${animConfig!.easing}, transform ${animConfig!.duration}ms ${animConfig!.easing}`
                : undefined,
            }
          : { visibility: 'hidden' as const };

        return (
          <div
            key={index}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(index, el);
              } else {
                itemRefs.current.delete(index);
              }
            }}
            style={itemStyle}
          >
            {child}
          </div>
        );
      })}
      {onReachEnd && (
        <div
          ref={sentinelRef}
          style={{
            position: 'absolute',
            bottom: 0,
            height: 1,
            width: '100%',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
