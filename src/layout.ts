import type { LayoutInput, LayoutOutput, ItemPosition, ColumnStrategy } from './types';

/**
 * Computes absolute positions for all items using the shortest-column algorithm.
 *
 * 1. Initialize N column heights to 0.
 * 2. columnWidth = (containerWidth - (columnCount - 1) * gap) / columnCount
 * 3. For each item: place in shortest column, update column height.
 * 4. totalHeight = max(columnHeights) - trailing gap.
 *
 * O(n * k) where n = items, k = columns. Effectively O(n) for typical k <= 10.
 */
export function computeLayout(input: LayoutInput): LayoutOutput {
  const { items, containerWidth, columnCount, gap } = input;

  if (columnCount <= 0 || containerWidth <= 0 || items.length === 0) {
    return { positions: [], columnHeights: [], totalHeight: 0 };
  }

  const columnWidth = (containerWidth - (columnCount - 1) * gap) / columnCount;
  const columnHeights = new Float64Array(columnCount);
  const positions: ItemPosition[] = new Array(items.length);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Find shortest column (ties broken by leftmost)
    let shortestCol = 0;
    let shortestHeight = columnHeights[0];
    for (let c = 1; c < columnCount; c++) {
      if (columnHeights[c] < shortestHeight) {
        shortestHeight = columnHeights[c];
        shortestCol = c;
      }
    }

    const left = shortestCol * (columnWidth + gap);
    const top = columnHeights[shortestCol];

    positions[i] = {
      id: item.id,
      index: item.index,
      top,
      left,
      width: columnWidth,
      height: item.height,
      column: shortestCol,
    };

    columnHeights[shortestCol] = top + item.height + gap;
  }

  let maxHeight = 0;
  for (let c = 0; c < columnCount; c++) {
    if (columnHeights[c] > maxHeight) {
      maxHeight = columnHeights[c];
    }
  }
  const totalHeight = maxHeight > 0 ? maxHeight - gap : 0;

  return {
    positions,
    columnHeights: Array.from(columnHeights),
    totalHeight,
  };
}

/**
 * Determine column count given container width and strategy.
 */
export function resolveColumnCount(
  containerWidth: number,
  strategy: ColumnStrategy,
  gap: number,
): number {
  if (strategy.type === 'fixed') {
    return Math.max(1, strategy.count);
  }
  if (strategy.type === 'responsive') {
    return resolveResponsiveColumns(containerWidth, strategy.breakpoints);
  }
  // auto: containerWidth >= n * minColumnWidth + (n-1) * gap
  // n <= (containerWidth + gap) / (minColumnWidth + gap)
  const count = Math.floor((containerWidth + gap) / (strategy.minColumnWidth + gap));
  return Math.max(1, count);
}

/**
 * Resolve column count from responsive breakpoints.
 * Breakpoints map container width thresholds to column counts.
 * Picks the largest breakpoint that containerWidth meets, or falls back to the smallest.
 */
function resolveResponsiveColumns(
  containerWidth: number,
  breakpoints: Record<number, number>,
): number {
  const entries = Object.keys(breakpoints)
    .map((w) => [Number(w), breakpoints[Number(w)]] as [number, number])
    .sort((a, b) => b[0] - a[0]); // descending by width

  for (const [minWidth, cols] of entries) {
    if (containerWidth >= minWidth) {
      return Math.max(1, cols);
    }
  }
  // Below all breakpoints: use the smallest breakpoint's column count
  return entries.length > 0 ? Math.max(1, entries[entries.length - 1][1]) : 1;
}
