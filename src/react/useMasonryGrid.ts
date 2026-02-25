import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { computeLayout, resolveColumnCount } from '../layout';
import type { LayoutOutput } from '../types';
import type { UseMasonryGridOptions, UseMasonryGridReturn } from './types';
import { resolveStrategy } from './utils';

/**
 * Low-level hook for full control over masonry layout.
 *
 * ```tsx
 * const { containerRef, layout, getItemStyle } = useMasonryGrid({ gap: 16, columns: 3 });
 * return (
 *   <div ref={containerRef} style={{ position: 'relative', height: layout?.totalHeight }}>
 *     {items.map((item, i) => (
 *       <div key={item.id} style={getItemStyle(i)}>{item.content}</div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useMasonryGrid(
  options: UseMasonryGridOptions = {},
): UseMasonryGridReturn {
  const { columns, gap = 16, onLayout } = options;
  const strategy = resolveStrategy(columns);

  const containerElRef = useRef<HTMLElement | null>(null);
  const itemHeights = useRef<Map<number, number>>(new Map());
  const [layout, setLayout] = useState<LayoutOutput | null>(null);
  const [columnCount, setColumnCount] = useState(0);

  const compute = useCallback(() => {
    const container = containerElRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth <= 0) return;

    const colCount = resolveColumnCount(containerWidth, strategy, gap);
    setColumnCount(colCount);

    // Measure all direct children
    const children = Array.from(container.children) as HTMLElement[];
    const items = children.map((el, i) => ({
      id: i,
      index: i,
      height: itemHeights.current.get(i) ?? el.offsetHeight,
    }));

    if (items.length === 0) return;

    const result = computeLayout({
      items,
      containerWidth,
      columnCount: colCount,
      gap,
    });

    // Cache measured heights
    children.forEach((el, i) => {
      const h = el.offsetHeight;
      if (h > 0) itemHeights.current.set(i, h);
    });

    setLayout(result);
    onLayout?.(result);
  }, [gap, strategy, onLayout]);

  // Container ref callback — set up ResizeObserver when container is attached
  const containerRef = useCallback(
    (el: HTMLElement | null) => {
      containerElRef.current = el;
      if (!el) return;

      // Initial compute
      compute();

      // Observe container resize
      const ro = new ResizeObserver(() => compute());
      ro.observe(el);

      // Cleanup on unmount (will be called when ref changes)
      return () => ro.disconnect();
    },
    [compute],
  );

  // Re-observe children for size changes
  useEffect(() => {
    const container = containerElRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => compute());
    const children = Array.from(container.children) as HTMLElement[];
    for (const child of children) {
      ro.observe(child);
    }
    return () => ro.disconnect();
  }, [layout?.positions.length, compute]);

  const getItemStyle = useCallback(
    (index: number): CSSProperties => {
      const pos = layout?.positions[index];
      if (!pos) return { visibility: 'hidden' as const };
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate3d(${pos.left}px, ${pos.top}px, 0)`,
        width: pos.width,
        willChange: 'transform',
      };
    },
    [layout],
  );

  const refresh = useCallback(() => {
    itemHeights.current.clear();
    compute();
  }, [compute]);

  return {
    containerRef,
    layout,
    columnCount,
    refresh,
    getItemStyle,
  };
}
