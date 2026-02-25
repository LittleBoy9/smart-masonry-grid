import type {
  MasonryGridOptions,
  MasonryGridEvents,
  MasonryEventName,
  ItemPosition,
  LayoutOutput,
  MeasuredItem,
  ItemId,
  ColumnStrategy,
  VirtualizerConfig,
} from './types';
import { computeLayout, resolveColumnCount } from './layout';
import { Virtualizer } from './virtualizer';
import { ObserverManager } from './observers';
import { injectBaseStyles } from './styles';
import { debounce, generateId } from './utils';

interface ResolvedOptions {
  columns: ColumnStrategy;
  gap: number;
  virtualize: boolean;
  virtualizer: VirtualizerConfig;
  renderItem: ((index: number) => HTMLElement) | null;
  totalItems: number;
  ssrFallback: boolean;
  classPrefix: string;
  resizeDebounceMs: number;
}

function resolveOptions(options: Partial<MasonryGridOptions>): ResolvedOptions {
  const gap = options.gap ?? 16;
  let columns: ColumnStrategy;
  if (typeof options.columns === 'number') {
    columns = { type: 'fixed', count: options.columns };
  } else if (options.columns) {
    columns = options.columns;
  } else {
    columns = { type: 'auto', minColumnWidth: 250 };
  }

  return {
    columns,
    gap,
    virtualize: options.virtualize ?? true,
    virtualizer: {
      overscan: options.virtualizer?.overscan ?? 600,
      estimatedItemHeight: options.virtualizer?.estimatedItemHeight ?? 300,
    },
    renderItem: options.renderItem ?? null,
    totalItems: options.totalItems ?? 0,
    ssrFallback: options.ssrFallback ?? false,
    classPrefix: options.classPrefix ?? 'smg',
    resizeDebounceMs: options.resizeDebounceMs ?? 100,
  };
}

export class MasonryGrid {
  private container: HTMLElement;
  private opts: ResolvedOptions;
  private prefix: string;

  // State
  private items: MeasuredItem[] = [];
  private itemMap: Map<ItemId, MeasuredItem> = new Map();
  private elementMap: Map<ItemId, HTMLElement> = new Map();
  private indexToElement: Map<number, HTMLElement> = new Map();
  private currentLayout: LayoutOutput | null = null;
  private containerWidth = 0;
  private columnCount = 0;
  private isDestroyed = false;

  // Subsystems
  private virtualizer: Virtualizer | null = null;
  private observers: ObserverManager;
  private scrollContainer: HTMLElement | Window;

  // Events
  private listeners: Map<MasonryEventName, Set<Function>> = new Map();

  // Debounced
  private debouncedRelayout: (() => void) & { cancel: () => void };
  private boundScrollHandler: (() => void) | null = null;

  constructor(container: HTMLElement, options: Partial<MasonryGridOptions> = {}) {
    this.container = container;
    this.opts = resolveOptions(options);
    this.prefix = this.opts.classPrefix;

    injectBaseStyles(this.prefix);

    this.observers = new ObserverManager({
      onContainerResize: (width) => this.handleContainerResize(width),
      onItemResize: (id, _element, _width, height) =>
        this.handleItemResize(id, height),
    });

    this.debouncedRelayout = debounce(() => {
      this.relayout();
      this.applyPositions();
    }, this.opts.resizeDebounceMs);

    this.scrollContainer = this.findScrollParent(container) ?? window;

    this.init();
  }

  // ==================== INITIALIZATION ====================

  private init(): void {
    const isSSR = this.container.classList.contains(
      `${this.prefix}-container--ssr`,
    );

    this.observers.observeContainer(this.container);
    this.containerWidth = this.container.offsetWidth;
    this.columnCount = resolveColumnCount(
      this.containerWidth,
      this.opts.columns,
      this.opts.gap,
    );

    if (isSSR) {
      this.hydrateFromSSR();
    } else if (
      this.opts.virtualize &&
      this.opts.renderItem &&
      this.opts.totalItems > 0
    ) {
      this.container.classList.add(`${this.prefix}-container--js`);
      this.initVirtualized();
    } else {
      this.container.classList.add(`${this.prefix}-container--js`);
      this.initFromExistingChildren();
    }
  }

  private hydrateFromSSR(): void {
    const children = Array.from(this.container.children) as HTMLElement[];
    this.collectItems(children);
    this.relayout();

    requestAnimationFrame(() => {
      this.container.classList.add(`${this.prefix}-container--transitioning`);
      this.container.classList.remove(`${this.prefix}-container--ssr`);
      this.container.classList.add(`${this.prefix}-container--js`);
      this.applyPositions();

      setTimeout(() => {
        this.container.classList.remove(
          `${this.prefix}-container--transitioning`,
        );
      }, 250);
    });
  }

  private initFromExistingChildren(): void {
    const children = Array.from(this.container.children) as HTMLElement[];
    if (children.length > 0) {
      this.collectItems(children);
      this.relayout();
      this.applyPositions();
    }
  }

  private initVirtualized(): void {
    this.virtualizer = new Virtualizer(
      this.opts.virtualizer,
      (index, position) => this.renderVirtualItem(index, position),
      (index) => this.recycleVirtualItem(index),
    );

    const estimatedHeight = this.opts.virtualizer.estimatedItemHeight;
    for (let i = 0; i < this.opts.totalItems; i++) {
      this.items.push({
        id: i,
        index: i,
        element: null,
        height: estimatedHeight,
        measured: false,
      });
    }

    this.relayout();
    this.bindScrollListener();
  }

  // ==================== LAYOUT ====================

  private relayout(): void {
    if (this.isDestroyed) return;

    const layoutItems = this.items.map((item) => ({
      id: item.id,
      index: item.index,
      height: item.height,
    }));

    this.currentLayout = computeLayout({
      items: layoutItems,
      containerWidth: this.containerWidth,
      columnCount: this.columnCount,
      gap: this.opts.gap,
    });

    this.container.style.height = `${this.currentLayout.totalHeight}px`;

    if (this.virtualizer) {
      this.virtualizer.updatePositions(
        this.currentLayout.positions,
        this.currentLayout.totalHeight,
      );
    }

    this.emit('layout', this.currentLayout);
  }

  private applyPositions(): void {
    if (!this.currentLayout) return;

    for (const pos of this.currentLayout.positions) {
      const element = this.elementMap.get(pos.id);
      if (!element) continue;

      element.style.transform = `translate3d(${pos.left}px, ${pos.top}px, 0)`;
      element.style.width = `${pos.width}px`;
    }
  }

  // ==================== VIRTUAL ITEM LIFECYCLE ====================

  private renderVirtualItem(index: number, position: ItemPosition): void {
    let element = this.indexToElement.get(index);
    if (!element) {
      element = this.opts.renderItem!(index);
      element.classList.add(`${this.prefix}-item`);
      this.container.appendChild(element);
      this.indexToElement.set(index, element);
      this.elementMap.set(position.id, element);
      this.observers.observeItem(element, position.id);
    }

    element.style.transform = `translate3d(${position.left}px, ${position.top}px, 0)`;
    element.style.width = `${position.width}px`;
    element.style.display = '';

    // Measure after render
    requestAnimationFrame(() => {
      if (this.isDestroyed || !element) return;
      const measuredHeight = element.offsetHeight;
      const item = this.items[index];
      if (item && !item.measured && Math.abs(item.height - measuredHeight) > 1) {
        item.height = measuredHeight;
        item.measured = true;
        this.virtualizer?.recordMeasurement(position.id, measuredHeight);
        this.relayout();
      }
    });
  }

  private recycleVirtualItem(index: number): void {
    const element = this.indexToElement.get(index);
    if (element) {
      element.style.display = 'none';
      this.observers.unobserveItem(element);
    }
  }

  // ==================== OBSERVER HANDLERS ====================

  private handleContainerResize(width: number): void {
    if (Math.abs(width - this.containerWidth) < 1) return;

    this.containerWidth = width;
    this.columnCount = resolveColumnCount(
      width,
      this.opts.columns,
      this.opts.gap,
    );

    this.debouncedRelayout();
    this.emit('resize', width, this.columnCount);
  }

  private handleItemResize(id: ItemId, newHeight: number): void {
    const item = this.itemMap.get(id);
    if (!item) return;

    const oldHeight = item.height;
    if (Math.abs(oldHeight - newHeight) < 1) return;

    item.height = newHeight;
    item.measured = true;

    this.emit('itemResize', id, oldHeight, newHeight);
    this.debouncedRelayout();
  }

  // ==================== SCROLL ====================

  private bindScrollListener(): void {
    this.boundScrollHandler = () => {
      const scrollTop =
        this.scrollContainer === window
          ? window.scrollY
          : (this.scrollContainer as HTMLElement).scrollTop;
      const viewportHeight =
        this.scrollContainer === window
          ? window.innerHeight
          : (this.scrollContainer as HTMLElement).clientHeight;

      this.virtualizer?.onScroll(scrollTop, viewportHeight);

      const visibleRange = this.virtualizer?.getVisibleRange() ?? {
        startIndex: 0,
        endIndex: 0,
      };
      this.emit('scroll', scrollTop, visibleRange);
    };

    this.scrollContainer.addEventListener('scroll', this.boundScrollHandler, {
      passive: true,
    });

    // Trigger initial render
    this.boundScrollHandler();
  }

  // ==================== PUBLIC API ====================

  /** Add items to the end of the grid */
  append(elements: HTMLElement[]): void {
    const startIndex = this.items.length;
    this.collectItems(elements, startIndex);
    this.relayout();
    this.applyPositions();
  }

  /** Add items to the beginning of the grid */
  prepend(elements: HTMLElement[]): void {
    const newItems: MeasuredItem[] = [];
    elements.forEach((el, i) => {
      const id = generateId();
      el.classList.add(`${this.prefix}-item`);
      this.container.prepend(el);
      const height =
        el.offsetHeight || this.opts.virtualizer.estimatedItemHeight;
      const item: MeasuredItem = {
        id,
        index: i,
        element: el,
        height,
        measured: el.offsetHeight > 0,
      };
      newItems.push(item);
      this.itemMap.set(id, item);
      this.elementMap.set(id, el);
      this.observers.observeItem(el, id);
    });

    // Reindex existing items
    this.items.forEach((item) => {
      item.index += elements.length;
    });
    this.items = [...newItems, ...this.items];

    this.relayout();
    this.applyPositions();
  }

  /** Remove an item by ID */
  remove(id: ItemId): void {
    const item = this.itemMap.get(id);
    if (!item) return;

    const element = this.elementMap.get(id);
    if (element) {
      this.observers.unobserveItem(element);
      element.remove();
    }

    this.items = this.items.filter((i) => i.id !== id);
    this.items.forEach((item, i) => {
      item.index = i;
    });
    this.itemMap.delete(id);
    this.elementMap.delete(id);

    this.relayout();
    this.applyPositions();
  }

  /** Force a full relayout */
  refresh(): void {
    for (const item of this.items) {
      const el = this.elementMap.get(item.id);
      if (el) {
        item.height = el.offsetHeight;
        item.measured = true;
      }
    }
    this.relayout();
    this.applyPositions();
  }

  /** Get current layout data */
  getLayout(): LayoutOutput | null {
    return this.currentLayout;
  }

  /** Get the number of columns */
  getColumnCount(): number {
    return this.columnCount;
  }

  /** Subscribe to events. Returns an unsubscribe function. */
  on<E extends MasonryEventName>(
    event: E,
    callback: MasonryGridEvents[E],
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit<E extends MasonryEventName>(
    event: E,
    ...args: Parameters<MasonryGridEvents[E]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    for (const cb of callbacks) {
      (cb as (...a: unknown[]) => void)(...args);
    }
  }

  /** Tear down everything */
  destroy(): void {
    this.isDestroyed = true;

    // Emit before clearing listeners so subscribers can react
    this.emit('destroy');

    this.observers.destroy();
    this.virtualizer?.destroy();
    this.debouncedRelayout.cancel();

    if (this.boundScrollHandler) {
      this.scrollContainer.removeEventListener('scroll', this.boundScrollHandler);
    }

    this.container.classList.remove(`${this.prefix}-container--js`);
    this.container.style.height = '';

    for (const [, element] of this.elementMap) {
      element.style.transform = '';
      element.style.width = '';
    }

    this.items = [];
    this.itemMap.clear();
    this.elementMap.clear();
    this.indexToElement.clear();
    this.listeners.clear();
  }

  // ==================== HELPERS ====================

  private collectItems(elements: HTMLElement[], startIndex = 0): void {
    elements.forEach((el, i) => {
      const id = el.dataset.masonryId ?? generateId();
      el.classList.add(`${this.prefix}-item`);
      const height =
        el.offsetHeight || this.opts.virtualizer.estimatedItemHeight;
      const item: MeasuredItem = {
        id,
        index: startIndex + i,
        element: el,
        height,
        measured: el.offsetHeight > 0,
      };
      this.items.push(item);
      this.itemMap.set(id, item);
      this.elementMap.set(id, el);
      this.observers.observeItem(el, id);
    });
  }

  private findScrollParent(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    while (parent) {
      const overflow = getComputedStyle(parent).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') return parent;
      parent = parent.parentElement;
    }
    return null;
  }
}
