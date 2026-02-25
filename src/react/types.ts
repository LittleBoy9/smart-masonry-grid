import type { CSSProperties, ReactNode, ReactElement } from 'react';
import type { ColumnStrategy, LayoutOutput, ItemPosition } from '../types';

// ---------------------------------------------------------------------------
// Column prop types
// ---------------------------------------------------------------------------

/** Predefined breakpoint names */
export type BreakpointName = 'sm' | 'md' | 'lg' | 'xl';

/** Named breakpoints: { sm: 2, md: 3, lg: 4, xl: 5 } */
export type NamedBreakpoints = Partial<Record<BreakpointName, number>>;

/** All accepted formats for the columns prop */
export type ColumnsProp = number | ColumnStrategy | NamedBreakpoints | Record<number, number>;

// ---------------------------------------------------------------------------
// Animation types
// ---------------------------------------------------------------------------

/** Configuration for entry animations */
export interface AnimationConfig {
  /** Duration in milliseconds. Default: 300 */
  duration?: number;
  /** CSS easing function. Default: 'ease-out' */
  easing?: string;
  /** Initial vertical offset in pixels (slide-up distance). Default: 20 */
  offset?: number;
}

/** animate prop: boolean shorthand or config object */
export type AnimateProp = boolean | AnimationConfig;

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface MasonryProps {
  /** Child elements to lay out in masonry pattern */
  children: ReactNode;
  /** Number of columns, strategy, or responsive breakpoints. Default: { type: 'auto', minColumnWidth: 250 } */
  columns?: ColumnsProp;
  /** Gap between items in pixels. Default: 16 */
  gap?: number;
  /** Container className */
  className?: string;
  /** Container inline style */
  style?: CSSProperties;
  /** Callback when layout is computed */
  onLayout?: (output: LayoutOutput) => void;
  /** Enable entry animations. Pass true for defaults or a config object. */
  animate?: AnimateProp;
  /** Callback when user scrolls near the bottom. Useful for infinite scroll. */
  onReachEnd?: () => void;
  /** Pixels from bottom to trigger onReachEnd. Default: 200 */
  reachEndThreshold?: number;
}

export interface VirtualMasonryProps {
  /** Total number of items */
  totalItems: number;
  /** Render function for each item */
  renderItem: (index: number) => ReactElement;
  /** Number of columns, strategy, or responsive breakpoints. Default: { type: 'auto', minColumnWidth: 250 } */
  columns?: ColumnsProp;
  /** Gap between items in pixels. Default: 16 */
  gap?: number;
  /** Container height in pixels (required for scroll container) */
  height: number;
  /** Pixels above/below viewport to pre-render. Default: 600 */
  overscan?: number;
  /** Estimated item height for unmeasured items. Default: 300 */
  estimatedItemHeight?: number;
  /** Container className */
  className?: string;
  /** Container inline style */
  style?: CSSProperties;
  /** Callback when layout is computed */
  onLayout?: (output: LayoutOutput) => void;
  /** Enable entry animations. Pass true for defaults or a config object. */
  animate?: AnimateProp;
  /** Callback when user scrolls near the bottom. Useful for infinite scroll. */
  onReachEnd?: () => void;
  /** Pixels from bottom to trigger onReachEnd. Default: 200 */
  reachEndThreshold?: number;
  /** Placeholder element to show for unmeasured items */
  placeholder?: ReactElement;
}

export interface UseMasonryGridOptions {
  /** Number of columns, strategy, or responsive breakpoints */
  columns?: ColumnsProp;
  /** Gap between items in pixels. Default: 16 */
  gap?: number;
  /** Callback when layout is computed */
  onLayout?: (output: LayoutOutput) => void;
}

export interface UseMasonryGridReturn {
  /** Ref to attach to the container div */
  containerRef: React.RefCallback<HTMLElement>;
  /** Current layout output (null before first compute) */
  layout: LayoutOutput | null;
  /** Current column count */
  columnCount: number;
  /** Force a relayout */
  refresh: () => void;
  /** Get a position style for a specific item index */
  getItemStyle: (index: number) => CSSProperties;
}

export { ColumnStrategy, LayoutOutput, ItemPosition };
