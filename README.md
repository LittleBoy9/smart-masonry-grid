<p align="center">
  <h1 align="center">smart-masonry-grid</h1>
  <p align="center">
    A zero-dependency, virtualized masonry grid layout library for vanilla JS and React.
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/smart-masonry-grid"><img src="https://img.shields.io/npm/v/smart-masonry-grid?color=blue&label=npm" alt="npm version" /></a>
  <a href="https://bundlephobia.com/package/smart-masonry-grid"><img src="https://img.shields.io/bundlephobia/minzip/smart-masonry-grid?color=green&label=size" alt="bundle size" /></a>
  <a href="https://www.npmjs.com/package/smart-masonry-grid"><img src="https://img.shields.io/npm/dm/smart-masonry-grid?color=orange" alt="downloads" /></a>
  <a href="https://github.com/LittleBoy9/smart-masonry-grid/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/smart-masonry-grid" alt="license" /></a>
  <a href="https://github.com/LittleBoy9/smart-masonry-grid"><img src="https://img.shields.io/github/stars/LittleBoy9/smart-masonry-grid?style=social" alt="GitHub stars" /></a>
</p>

<p align="center">
  <a href="https://littleboy9.github.io/smart-masonry-grid/"><b>Landing Page</b></a> &nbsp;&middot;&nbsp;
  <a href="https://smart-masonry-grid-demo-1dkf4r5bx-iamsounak01s-projects.vercel.app/"><b>Live Demo</b></a> &nbsp;&middot;&nbsp;
  <a href="https://github.com/LittleBoy9/smart-masonry-grid"><b>GitHub</b></a>
</p>

---

## Highlights

- **Zero dependencies** — uses native `ResizeObserver` and `IntersectionObserver`
- **Virtualization** — renders only visible items, handles **10,000+ items** smoothly
- **Responsive** — auto columns, fixed count, named breakpoints, or custom pixel breakpoints
- **SSR-compatible** — CSS columns fallback with hydration support for Next.js
- **TypeScript-first** — full type definitions included
- **Dual API** — vanilla `MasonryGrid` class + React components (`<Masonry>`, `<VirtualMasonry>`, `useMasonryGrid`)
- **Animations** — built-in entry animations with configurable duration, easing, and offset
- **Infinite scroll** — built-in `onReachEnd` callback
- **Tree-shakeable** — ESM + CommonJS, `sideEffects: false`

---

## Why smart-masonry-grid?

Most masonry libraries are **abandoned**, **React-only**, or **missing critical features**. Here's how `smart-masonry-grid` compares:

| Feature | smart-masonry-grid | masonry-layout | react-masonry-css | masonic | @mui/lab Masonry |
|---|:---:|:---:|:---:|:---:|:---:|
| Zero dependencies | **Yes** | No | Yes | No | No (heavy) |
| Virtualization (10K+ items) | **Yes** | No | No | Yes | No |
| SSR / Next.js support | **Yes** | No | No | Partial | Buggy |
| Vanilla JS + React | **Yes** | Vanilla only | React only | React only | React only |
| Built-in animations | **Yes** | No | No | No | No |
| Built-in infinite scroll | **Yes** | No | No | Yes | No |
| TypeScript (built-in) | **Yes** | No (@types) | Partial | Yes | Yes |
| Responsive breakpoints | **4 modes** | No | Basic | No | Basic |
| Actively maintained | **Yes** | Barely | No (4yr+) | Partial | Yes |

> **No other library** combines zero-dependency virtualization, SSR support, and multi-framework support in one package.

---

## Install

```bash
npm install smart-masonry-grid
```

```bash
# or
yarn add smart-masonry-grid
# or
pnpm add smart-masonry-grid
```

---

## Quick Start

### React

#### `<Masonry>` — renders all children

```tsx
import { Masonry } from 'smart-masonry-grid/react';

function Gallery({ photos }) {
  return (
    <Masonry columns={{ sm: 2, md: 3, lg: 4 }} gap={16} animate>
      {photos.map((photo) => (
        <img key={photo.id} src={photo.src} alt={photo.alt} />
      ))}
    </Masonry>
  );
}
```

#### `<VirtualMasonry>` — for large datasets (1,000+ items)

```tsx
import { VirtualMasonry } from 'smart-masonry-grid/react';

function Gallery({ photos }) {
  return (
    <VirtualMasonry
      totalItems={photos.length}
      renderItem={(index) => (
        <img src={photos[index].src} alt={photos[index].alt} />
      )}
      height={600}
      columns={4}
      gap={16}
      animate
    />
  );
}
```

#### `useMasonryGrid` hook — full control

```tsx
import { useMasonryGrid } from 'smart-masonry-grid/react';

function CustomGrid({ items }) {
  const { containerRef, layout, getItemStyle } = useMasonryGrid({
    columns: 3,
    gap: 16,
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', height: layout?.totalHeight }}>
      {items.map((item, i) => (
        <div key={item.id} style={getItemStyle(i)}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
```

### Vanilla JS

```js
import { MasonryGrid } from 'smart-masonry-grid';

const grid = new MasonryGrid(document.getElementById('grid'), {
  columns: { type: 'auto', minColumnWidth: 250 },
  gap: 16,
});

// Dynamic operations
grid.append(newElement);
grid.prepend(newElement);
grid.remove(element);
grid.refresh();

// Events
grid.on('layout', (output) => console.log(output.totalHeight));
grid.on('resize', (width, cols) => console.log(width, cols));

// Cleanup
grid.destroy();
```

#### Virtualized (vanilla)

```js
const grid = new MasonryGrid(container, {
  totalItems: 10000,
  renderItem: (index) => {
    const el = document.createElement('div');
    el.textContent = `Item ${index}`;
    return el;
  },
});
```

---

## Column Strategies

4 flexible ways to configure columns:

```tsx
// 1. Fixed column count
<Masonry columns={4} />

// 2. Auto — fill based on minimum column width
<Masonry columns={{ type: 'auto', minColumnWidth: 250 }} />

// 3. Named breakpoints (sm=640, md=768, lg=1024, xl=1280)
<Masonry columns={{ sm: 2, md: 3, lg: 4, xl: 5 }} />

// 4. Custom pixel breakpoints
<Masonry columns={{ 480: 2, 768: 3, 1200: 4 }} />
```

---

## API Reference

### `<Masonry>` Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | — | Items to lay out |
| `columns` | `number \| ColumnStrategy \| NamedBreakpoints` | `auto, 250px` | Column configuration |
| `gap` | `number` | `16` | Gap between items in pixels |
| `animate` | `boolean \| AnimationConfig` | `false` | Entry animations |
| `onLayout` | `(output: LayoutOutput) => void` | — | Called after each layout computation |
| `onReachEnd` | `() => void` | — | Called when scrolled near the bottom (infinite scroll) |
| `reachEndThreshold` | `number` | `200` | Pixels from bottom to trigger `onReachEnd` |

### `<VirtualMasonry>` Props

All `<Masonry>` props except `children`, plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `totalItems` | `number` | — | Total number of items |
| `renderItem` | `(index: number) => ReactElement` | — | Render function for each item |
| `height` | `number` | — | Scroll container height in pixels |
| `overscan` | `number` | `600` | Pre-render buffer in pixels |
| `estimatedItemHeight` | `number` | `300` | Height estimate for unmeasured items |
| `placeholder` | `ReactElement` | — | Shown while an item is being measured |

### `MasonryGrid` (Vanilla JS)

```ts
const grid = new MasonryGrid(container: HTMLElement, options?: MasonryGridOptions);
```

| Option | Type | Default | Description |
|---|---|---|---|
| `columns` | `number \| ColumnStrategy` | `auto, 250px` | Column configuration |
| `gap` | `number` | `16` | Gap between items in pixels |
| `virtualize` | `boolean` | `true` | Enable virtualization |
| `totalItems` | `number` | — | Total items (virtualized mode) |
| `renderItem` | `(index: number) => HTMLElement` | — | Item renderer (virtualized mode) |
| `ssrFallback` | `boolean` | `false` | Use CSS columns for SSR |
| `resizeDebounceMs` | `number` | `100` | Debounce delay for resize events |

**Methods:**

| Method | Description |
|---|---|
| `append(elements)` | Add elements to the end |
| `prepend(elements)` | Add elements to the beginning |
| `remove(id)` | Remove an item by ID |
| `refresh()` | Force a full relayout |
| `getLayout()` | Returns current `LayoutOutput` |
| `getColumnCount()` | Returns current column count |
| `on(event, callback)` | Subscribe to events |
| `destroy()` | Clean up observers and DOM |

**Events:** `layout`, `resize`, `scroll`, `itemResize`, `destroy`

---

## SSR

```js
import { getSSRStyles } from 'smart-masonry-grid';

// Returns a CSS string for server-side rendering
const css = getSSRStyles();
```

The library provides a CSS columns fallback for the initial server render, then smoothly transitions to the JS-powered masonry layout after hydration.

---

## Browser Support

Uses native browser APIs with excellent coverage:

| API | Support |
|---|---|
| `ResizeObserver` | 99%+ |
| `IntersectionObserver` | 98%+ |

No polyfills needed for modern browsers.

---

## License

[MIT](LICENSE) — Built by [Sounak Das](https://sounakdas.in)
