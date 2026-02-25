# smart-masonry-grid

[![npm version](https://img.shields.io/npm/v/smart-masonry-grid)](https://www.npmjs.com/package/smart-masonry-grid)
[![bundle size](https://img.shields.io/bundlephobia/minzip/smart-masonry-grid)](https://bundlephobia.com/package/smart-masonry-grid)
[![license](https://img.shields.io/npm/l/smart-masonry-grid)](https://github.com/LittleBoy9/smart-masonry-grid/blob/main/LICENSE)

A zero-dependency, virtualized masonry grid layout library for vanilla JS and React.

- **Zero dependencies** — uses native `ResizeObserver` and `IntersectionObserver`
- **Virtualization** — renders only visible items, handles 10,000+ items smoothly
- **Responsive** — auto columns, fixed count, or breakpoint-based
- **SSR-compatible** — CSS columns fallback with hydration support
- **TypeScript-first** — full type definitions included
- **Dual API** — vanilla `MasonryGrid` class + React components

**[Landing Page](https://littleboy9.github.io/smart-masonry-grid/)** · **[Live Demo](https://smart-masonry-grid-demo-1dkf4r5bx-iamsounak01s-projects.vercel.app/)** · **[GitHub](https://github.com/LittleBoy9/smart-masonry-grid)**

## Install

```bash
npm install smart-masonry-grid
```

## React

### `<Masonry>` — renders all children

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

### `<VirtualMasonry>` — renders only visible items

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

### `useMasonryGrid` hook — full control

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

## Vanilla JS

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

### Virtualized (vanilla)

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

## Column strategies

```tsx
// Fixed column count
<Masonry columns={4} />

// Auto: fill based on minimum column width
<Masonry columns={{ type: 'auto', minColumnWidth: 250 }} />

// Named breakpoints (sm=640, md=768, lg=1024, xl=1280)
<Masonry columns={{ sm: 2, md: 3, lg: 4, xl: 5 }} />

// Custom pixel breakpoints
<Masonry columns={{ 480: 2, 768: 3, 1200: 4 }} />
```

## Props

### `<Masonry>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Items to lay out |
| `columns` | `number \| ColumnStrategy \| NamedBreakpoints` | `auto, 250px` | Column configuration |
| `gap` | `number` | `16` | Gap between items (px) |
| `animate` | `boolean \| AnimationConfig` | `false` | Entry animations |
| `onLayout` | `(output: LayoutOutput) => void` | — | Layout callback |
| `onReachEnd` | `() => void` | — | Infinite scroll callback |
| `reachEndThreshold` | `number` | `200` | Pixels from bottom to trigger `onReachEnd` |

### `<VirtualMasonry>`

All `<Masonry>` props except `children`, plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `totalItems` | `number` | — | Total item count |
| `renderItem` | `(index: number) => ReactElement` | — | Render function per item |
| `height` | `number` | — | Scroll container height (px) |
| `overscan` | `number` | `600` | Pre-render buffer (px) |
| `estimatedItemHeight` | `number` | `300` | Height estimate for unmeasured items |
| `placeholder` | `ReactElement` | — | Shown while item is unmeasured |

## SSR

```js
import { getSSRStyles } from 'smart-masonry-grid';

// Returns a CSS string for server-side rendering
const css = getSSRStyles();
```

## License

[MIT](LICENSE) — Built by [Sounak Das](https://sounakdas.in)
