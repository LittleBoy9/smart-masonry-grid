const STYLE_ID = 'smart-masonry-grid-styles';

/**
 * Injects a <style> tag with base styles (idempotent).
 * Called once on first MasonryGrid instantiation.
 */
export function injectBaseStyles(prefix: string = 'smg'): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${prefix}-container--ssr {
      column-gap: var(--${prefix}-gap, 16px);
      column-count: var(--${prefix}-columns, 3);
    }
    .${prefix}-container--ssr > .${prefix}-item {
      break-inside: avoid;
      margin-bottom: var(--${prefix}-gap, 16px);
    }
    .${prefix}-container--js {
      position: relative;
      overflow: hidden;
    }
    .${prefix}-container--js > .${prefix}-item {
      position: absolute;
      top: 0;
      left: 0;
      will-change: transform;
    }
    .${prefix}-container--transitioning > .${prefix}-item {
      transition: transform 0.2s ease-out, opacity 0.2s ease-out;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Returns a CSS string for SSR <head> injection.
 * Use this on the server to include styles without JS.
 */
export function getSSRStyles(
  prefix: string = 'smg',
  columns: number = 3,
  gap: number = 16,
): string {
  return `.${prefix}-container--ssr{column-gap:${gap}px;column-count:${columns}}.${prefix}-container--ssr>.${prefix}-item{break-inside:avoid;margin-bottom:${gap}px}`;
}
