import type { ItemPosition, VisibleRange, VirtualizerConfig, ItemId } from './types';

const DEFAULT_CONFIG: VirtualizerConfig = {
  overscan: 600,
  estimatedItemHeight: 300,
};

/**
 * Manages which items are in the DOM based on scroll position.
 * Uses binary search over sorted positions for O(log n) visible range lookup.
 */
export class Virtualizer {
  private config: VirtualizerConfig;
  private positions: ItemPosition[] = [];
  private sortedByTop: number[] = [];
  private renderedIndices: Set<number> = new Set();
  private heightEstimates: Map<ItemId, number> = new Map();
  private scrollTop = 0;
  private viewportHeight = 0;
  private totalHeight = 0;
  private maxMeasuredHeight = 0;
  private scrollRafId: number | null = null;

  private onRenderItem: (index: number, position: ItemPosition) => void;
  private onRecycleItem: (index: number) => void;

  constructor(
    config: Partial<VirtualizerConfig>,
    onRenderItem: (index: number, position: ItemPosition) => void,
    onRecycleItem: (index: number) => void,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onRenderItem = onRenderItem;
    this.onRecycleItem = onRecycleItem;
  }

  /** Update positions after layout recomputation */
  updatePositions(positions: ItemPosition[], totalHeight: number): void {
    this.positions = positions;
    this.totalHeight = totalHeight;
    this.rebuildSortedIndex();
    this.update();
  }

  private rebuildSortedIndex(): void {
    this.sortedByTop = this.positions.map((_, i) => i);
    this.sortedByTop.sort((a, b) => this.positions[a].top - this.positions[b].top);
  }

  /** Handle scroll event (throttled via rAF) */
  onScroll(scrollTop: number, viewportHeight: number): void {
    this.scrollTop = scrollTop;
    this.viewportHeight = viewportHeight;

    if (this.scrollRafId !== null) return;
    this.scrollRafId = requestAnimationFrame(() => {
      this.scrollRafId = null;
      this.update();
    });
  }

  /** Core: diff visible set and mount/unmount items */
  private update(): void {
    const { overscan } = this.config;
    const rangeTop = this.scrollTop - overscan;
    const rangeBottom = this.scrollTop + this.viewportHeight + overscan;

    const visibleIndices = this.findVisibleIndices(rangeTop, rangeBottom);
    const visibleSet = new Set(visibleIndices);

    // Remove items no longer visible
    for (const idx of this.renderedIndices) {
      if (!visibleSet.has(idx)) {
        this.onRecycleItem(idx);
      }
    }

    // Add newly visible items
    for (const idx of visibleIndices) {
      if (!this.renderedIndices.has(idx)) {
        const position = this.positions[idx];
        if (position) {
          this.onRenderItem(idx, position);
        }
      }
    }

    this.renderedIndices = visibleSet;
  }

  /**
   * Binary search to find items in [rangeTop, rangeBottom].
   * An item is visible if: item.top + item.height > rangeTop AND item.top < rangeBottom
   */
  private findVisibleIndices(rangeTop: number, rangeBottom: number): number[] {
    const sorted = this.sortedByTop;
    const positions = this.positions;
    if (sorted.length === 0) return [];

    const searchTop =
      rangeTop - Math.max(this.maxMeasuredHeight, this.config.estimatedItemHeight);

    // Binary search: first index where positions[sorted[i]].top >= searchTop
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (positions[sorted[mid]].top < searchTop) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    const result: number[] = [];
    for (let i = lo; i < sorted.length; i++) {
      const idx = sorted[i];
      const pos = positions[idx];
      if (pos.top >= rangeBottom) break;
      if (pos.top + pos.height > rangeTop) {
        result.push(idx);
      }
    }

    return result;
  }

  /** Record a measured height */
  recordMeasurement(id: ItemId, height: number): void {
    this.heightEstimates.set(id, height);
    if (height > this.maxMeasuredHeight) {
      this.maxMeasuredHeight = height;
    }
  }

  /** Get current visible range */
  getVisibleRange(): VisibleRange {
    if (this.renderedIndices.size === 0) {
      return { startIndex: 0, endIndex: 0 };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const idx of this.renderedIndices) {
      if (idx < min) min = idx;
      if (idx > max) max = idx;
    }
    return { startIndex: min, endIndex: max };
  }

  getTotalHeight(): number {
    return this.totalHeight;
  }

  destroy(): void {
    if (this.scrollRafId !== null) {
      cancelAnimationFrame(this.scrollRafId);
    }
    this.renderedIndices.clear();
    this.heightEstimates.clear();
    this.positions = [];
    this.sortedByTop = [];
  }
}
