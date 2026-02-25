import type { ColumnStrategy } from '../types';
import type { AnimateProp, AnimationConfig, ColumnsProp } from './types';

/** Predefined breakpoint widths matching common CSS frameworks */
export const NAMED_BREAKPOINTS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/**
 * Normalize all accepted column prop formats into a ColumnStrategy.
 * Handles: number, ColumnStrategy, named breakpoints, numeric breakpoints.
 */
export function resolveStrategy(columns: ColumnsProp | undefined): ColumnStrategy {
  if (columns === undefined) return { type: 'auto', minColumnWidth: 250 };
  if (typeof columns === 'number') return { type: 'fixed', count: columns };

  // Already a ColumnStrategy (has 'type' property)
  if ('type' in columns) return columns;

  // Object with breakpoint keys — named (sm/md/lg/xl) or numeric
  const breakpoints: Record<number, number> = {};
  for (const [key, value] of Object.entries(columns)) {
    const namedPx = NAMED_BREAKPOINTS[key];
    breakpoints[namedPx ?? Number(key)] = value;
  }

  return { type: 'responsive', breakpoints };
}

/**
 * Resolve animate prop into a full AnimationConfig or null.
 */
export function resolveAnimationConfig(animate: AnimateProp | undefined): AnimationConfig | null {
  if (!animate) return null;
  if (animate === true) {
    return { duration: 300, easing: 'ease-out', offset: 20 };
  }
  return {
    duration: animate.duration ?? 300,
    easing: animate.easing ?? 'ease-out',
    offset: animate.offset ?? 20,
  };
}
