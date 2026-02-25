import type { ItemId } from './types';

export interface ObserverCallbacks {
  onContainerResize: (width: number, height: number) => void;
  onItemResize: (id: ItemId, element: HTMLElement, width: number, height: number) => void;
}

/**
 * Manages a single shared ResizeObserver for ALL items.
 * Uses WeakMap<HTMLElement, ItemId> so entries are GC'd when elements are removed.
 * Batches item resize callbacks via queueMicrotask to prevent layout thrashing.
 */
export class ObserverManager {
  private containerObserver: ResizeObserver | null = null;
  private itemObserver: ResizeObserver | null = null;
  private elementToId: WeakMap<HTMLElement, ItemId> = new WeakMap();
  private callbacks: ObserverCallbacks;
  private pendingItemResizes: Map<
    ItemId,
    { element: HTMLElement; width: number; height: number }
  > = new Map();
  private batchScheduled = false;

  constructor(callbacks: ObserverCallbacks) {
    this.callbacks = callbacks;
  }

  /** Observe container for width changes */
  observeContainer(container: HTMLElement): void {
    this.containerObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width =
          entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        const height =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        this.callbacks.onContainerResize(width, height);
      }
    });
    this.containerObserver.observe(container);
  }

  /** Initialize the shared item observer (lazy) */
  private initItemObserver(): void {
    this.itemObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const id = this.elementToId.get(element);
        if (id === undefined) continue;

        const height =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        const width =
          entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;

        this.pendingItemResizes.set(id, { element, width, height });
      }

      if (!this.batchScheduled) {
        this.batchScheduled = true;
        queueMicrotask(() => {
          this.batchScheduled = false;
          const batch = new Map(this.pendingItemResizes);
          this.pendingItemResizes.clear();
          for (const [id, { element, width, height }] of batch) {
            this.callbacks.onItemResize(id, element, width, height);
          }
        });
      }
    });
  }

  /** Observe a single item element */
  observeItem(element: HTMLElement, id: ItemId): void {
    if (!this.itemObserver) this.initItemObserver();
    this.elementToId.set(element, id);
    this.itemObserver!.observe(element);
  }

  /** Stop observing a single item element */
  unobserveItem(element: HTMLElement): void {
    this.elementToId.delete(element);
    this.itemObserver?.unobserve(element);
  }

  /** Clean up everything */
  destroy(): void {
    this.containerObserver?.disconnect();
    this.itemObserver?.disconnect();
    this.containerObserver = null;
    this.itemObserver = null;
    this.elementToId = new WeakMap();
    this.pendingItemResizes.clear();
  }
}
