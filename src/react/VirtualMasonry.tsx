import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { computeLayout, resolveColumnCount } from '../layout';
import type { ItemPosition } from '../types';
import type { VirtualMasonryProps } from './types';
import { resolveStrategy, resolveAnimationConfig } from './utils';

/**
 * Find visible items using binary search over positions sorted by top.
 */
function findVisibleItems(
  positions: ItemPosition[],
  sortedIndices: number[],
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
  maxItemHeight: number,
): number[] {
  if (sortedIndices.length === 0) return [];

  const rangeTop = scrollTop - overscan;
  const rangeBottom = scrollTop + viewportHeight + overscan;
  const searchTop = rangeTop - maxItemHeight;

  // Binary search for first item where top >= searchTop
  let lo = 0;
  let hi = sortedIndices.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (positions[sortedIndices[mid]].top < searchTop) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const result: number[] = [];
  for (let i = lo; i < sortedIndices.length; i++) {
    const idx = sortedIndices[i];
    const pos = positions[idx];
    if (pos.top >= rangeBottom) break;
    if (pos.top + pos.height > rangeTop) {
      result.push(idx);
    }
  }

  return result;
}

/**
 * Virtualized masonry component for 1k+ items.
 * Only renders items visible in the viewport.
 *
 * ```tsx
 * <VirtualMasonry
 *   totalItems={10000}
 *   renderItem={(index) => <Card index={index} />}
 *   height={600}
 *   gap={16}
 * />
 * ```
 */
export function VirtualMasonry({
  totalItems,
  renderItem,
  columns,
  gap = 16,
  height,
  overscan = 600,
  estimatedItemHeight = 300,
  className,
  style,
  onLayout,
  animate,
  onReachEnd,
  reachEndThreshold = 200,
  placeholder,
}: VirtualMasonryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [heightMap, setHeightMap] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Animation state
  const animConfig = resolveAnimationConfig(animate);
  const animatedRef = useRef<Set<number>>(new Set());
  const pendingAnimRef = useRef<Set<number>>(new Set());
  const [, forceUpdate] = useState(0);

  // onReachEnd state
  const reachEndFiredRef = useRef(false);

  // Reset all accumulated state when totalItems changes
  const prevTotalItemsRef = useRef(totalItems);
  if (prevTotalItemsRef.current !== totalItems) {
    prevTotalItemsRef.current = totalItems;
    setHeightMap(new Map());
    animatedRef.current.clear();
    pendingAnimRef.current.clear();
  }

  const strategy = resolveStrategy(columns);

  // Memoize strategy to avoid new object reference every render
  const stableStrategy = useMemo(() => strategy, [
    strategy.type,
    strategy.type === 'fixed' ? strategy.count : undefined,
    strategy.type === 'auto' ? strategy.minColumnWidth : undefined,
    strategy.type === 'responsive' ? JSON.stringify(strategy.breakpoints) : undefined,
  ]);

  // Compute column count from container width
  const columnCount = useMemo(
    () => (containerWidth > 0 ? resolveColumnCount(containerWidth, stableStrategy, gap) : 1),
    [containerWidth, stableStrategy, gap],
  );

  // Build layout items with measured or estimated heights
  const layoutItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < totalItems; i++) {
      items.push({
        id: i,
        index: i,
        height: heightMap.get(i) ?? estimatedItemHeight,
      });
    }
    return items;
  }, [totalItems, heightMap, estimatedItemHeight]);

  // Compute full layout
  const layout = useMemo(() => {
    if (containerWidth <= 0) return null;
    const result = computeLayout({
      items: layoutItems,
      containerWidth,
      columnCount,
      gap,
    });
    return result;
  }, [layoutItems, containerWidth, columnCount, gap]);

  // Fire onLayout callback
  useEffect(() => {
    if (layout) onLayout?.(layout);
  }, [layout, onLayout]);

  // Sorted indices for binary search
  const sortedIndices = useMemo(() => {
    if (!layout) return [];
    const indices = layout.positions.map((_, i) => i);
    indices.sort((a, b) => layout.positions[a].top - layout.positions[b].top);
    return indices;
  }, [layout]);

  // Max measured height for search adjustment
  const maxItemHeight = useMemo(() => {
    let max = estimatedItemHeight;
    for (const h of heightMap.values()) {
      if (h > max) max = h;
    }
    return max;
  }, [heightMap, estimatedItemHeight]);

  // Visible items
  const visibleIndices = useMemo(() => {
    if (!layout) return [];
    return findVisibleItems(
      layout.positions,
      sortedIndices,
      scrollTop,
      height,
      overscan,
      maxItemHeight,
    );
  }, [layout, sortedIndices, scrollTop, height, overscan, maxItemHeight]);

  // Observe container width
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w =
          entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setContainerWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Observe rendered items for size changes (e.g. images loading, dynamic content)
  const itemRORef = useRef<ResizeObserver | null>(null);
  const observedRef = useRef<Set<HTMLDivElement>>(new Set());

  // Stable measurement callback that reads current refs
  const measureItems = useCallback(() => {
    const refs = itemRefs.current;
    if (refs.size === 0) return;

    setHeightMap((prev) => {
      let changed = false;
      const updates = new Map(prev);

      for (const [index, el] of refs) {
        const measured = el.offsetHeight;
        if (measured > 0 && measured !== updates.get(index)) {
          updates.set(index, measured);
          changed = true;
        }
      }

      return changed ? updates : prev;
    });
  }, []);

  // Create a single ResizeObserver for item elements
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      measureItems();
    });
    itemRORef.current = ro;
    return () => {
      ro.disconnect();
      itemRORef.current = null;
      observedRef.current.clear();
    };
  }, [measureItems]);

  // Sync observed elements with currently rendered items
  useEffect(() => {
    const ro = itemRORef.current;
    if (!ro) return;

    const refs = itemRefs.current;
    const observed = observedRef.current;

    // Build a Set of current elements for O(1) lookup
    const currentEls = new Set<HTMLDivElement>();
    for (const [, el] of refs) {
      currentEls.add(el);
      if (!observed.has(el)) {
        ro.observe(el);
        observed.add(el);
      }
    }

    // Unobserve removed elements — O(n) instead of O(n*m)
    for (const el of observed) {
      if (!currentEls.has(el)) {
        ro.unobserve(el);
        observed.delete(el);
      }
    }
  });

  // Also measure on every render as a fallback
  useEffect(() => {
    measureItems();
  });

  // Reset onReachEnd when totalItems changes
  useEffect(() => {
    reachEndFiredRef.current = false;
  }, [totalItems]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const currentScrollTop = el.scrollTop;
    setScrollTop(currentScrollTop);

    // onReachEnd check
    if (onReachEnd && !reachEndFiredRef.current && layout) {
      if (currentScrollTop + height + reachEndThreshold >= layout.totalHeight) {
        reachEndFiredRef.current = true;
        onReachEnd();
      }
    }
  }, [onReachEnd, reachEndThreshold, height, layout]);

  // Animation: detect newly visible items
  useEffect(() => {
    if (!animConfig || visibleIndices.length === 0) return;

    const newItems: number[] = [];
    for (const idx of visibleIndices) {
      if (!animatedRef.current.has(idx)) {
        animatedRef.current.add(idx);
        pendingAnimRef.current.add(idx);
        newItems.push(idx);
      }
    }

    if (newItems.length === 0) return;

    forceUpdate((c) => c + 1);

    requestAnimationFrame(() => {
      pendingAnimRef.current.clear();
      forceUpdate((c) => c + 1);
    });
  }, [visibleIndices, animConfig]);

  const containerStyle: CSSProperties = {
    height,
    overflowY: 'auto',
    position: 'relative',
    ...style,
  };

  const innerStyle: CSSProperties = {
    position: 'relative',
    height: layout?.totalHeight ?? 0,
    width: '100%',
  };

  return (
    <div
      ref={scrollRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div style={innerStyle}>
        {visibleIndices.map((index) => {
          const pos = layout?.positions[index];
          if (!pos) return null;

          const isMeasured = heightMap.has(index);
          const isPending = animConfig && pendingAnimRef.current.has(index);
          const hasAnimated = animConfig && animatedRef.current.has(index);

          const itemStyle: CSSProperties = {
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
          };

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
              {placeholder && !isMeasured ? placeholder : renderItem(index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
