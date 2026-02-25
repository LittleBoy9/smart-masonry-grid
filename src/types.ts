/** Unique identifier for a masonry item */
export type ItemId = string | number;

/** Computed position of a single item after layout */
export interface ItemPosition {
  id: ItemId;
  index: number;
  top: number;
  left: number;
  width: number;
  height: number;
  column: number;
}

/** Internal representation of a measured item */
export interface MeasuredItem {
  id: ItemId;
  index: number;
  element: HTMLElement | null;
  height: number;
  measured: boolean;
}

/** Layout engine input — pure data, no DOM refs */
export interface LayoutInput {
  items: ReadonlyArray<{ id: ItemId; index: number; height: number }>;
  containerWidth: number;
  columnCount: number;
  gap: number;
}

/** Layout engine output */
export interface LayoutOutput {
  positions: ItemPosition[];
  columnHeights: number[];
  totalHeight: number;
}

/** Range of items visible in the viewport */
export interface VisibleRange {
  startIndex: number;
  endIndex: number;
}

/** Configuration for the virtualizer */
export interface VirtualizerConfig {
  /** Pixels above and below viewport to pre-render. Default: 600 */
  overscan: number;
  /** Estimated height for unmeasured items. Default: 300 */
  estimatedItemHeight: number;
}

/** Column computation strategy */
export type ColumnStrategy =
  | { type: 'fixed'; count: number }
  | { type: 'auto'; minColumnWidth: number }
  | { type: 'responsive'; breakpoints: Record<number, number> };

/** Full constructor options */
export interface MasonryGridOptions {
  /** Column strategy. Default: { type: 'auto', minColumnWidth: 250 } */
  columns?: number | ColumnStrategy;
  /** Gap between items in pixels. Default: 16 */
  gap?: number;
  /** Enable virtualization. Default: true */
  virtualize?: boolean;
  /** Virtualizer-specific config */
  virtualizer?: Partial<VirtualizerConfig>;
  /** Render function for virtualized mode: given an index, produce an HTMLElement */
  renderItem?: (index: number) => HTMLElement;
  /** Total item count (used with renderItem for virtualized mode) */
  totalItems?: number;
  /** Enable SSR-compatible initial render with CSS columns. Default: false */
  ssrFallback?: boolean;
  /** Custom class name prefix. Default: 'smg' */
  classPrefix?: string;
  /** Debounce delay for container resize (ms). Default: 100 */
  resizeDebounceMs?: number;
}

/** Events emitted by MasonryGrid */
export interface MasonryGridEvents {
  layout: (output: LayoutOutput) => void;
  resize: (containerWidth: number, columnCount: number) => void;
  scroll: (scrollTop: number, visibleRange: VisibleRange) => void;
  itemResize: (id: ItemId, oldHeight: number, newHeight: number) => void;
  destroy: () => void;
}

export type MasonryEventName = keyof MasonryGridEvents;
