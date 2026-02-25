"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VirtualMasonry } from "smart-masonry-grid/react";
import { getPhoto, getUnsplashUrl } from "../photos";
import { Nav } from "../nav";
import { Controls } from "../controls";

const PRESETS = [100, 500, 1_000, 5_000, 10_000];

type ColumnOption = number | { type: "auto"; minColumnWidth: number };

export default function VirtualDemo() {
  const [columns, setColumns] = useState<ColumnOption>({
    type: "auto",
    minColumnWidth: 280,
  });
  const [gap, setGap] = useState(12);
  const [totalItems, setTotalItems] = useState(1_000);
  const [animateEnabled, setAnimateEnabled] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(600);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function update() {
      const headerH = headerRef.current?.offsetHeight ?? 0;
      setViewportHeight(window.innerHeight - headerH);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const renderItem = useCallback(
    (index: number) => {
      const photo = getPhoto(index);
      return (
        <div className="group relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800/50 transition-all hover:ring-zinc-700/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getUnsplashUrl(photo.id, 400)}
            alt={photo.alt}
            loading="lazy"
            className="w-full block transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/20 to-transparent px-3 pb-3 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <p className="text-xs font-medium text-white truncate">
              {photo.alt}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              #{(index + 1).toLocaleString()} of {totalItems.toLocaleString()}
            </p>
          </div>
        </div>
      );
    },
    [totalItems],
  );

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header
        ref={headerRef}
        className="shrink-0 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-350 px-6">
          {/* Top row */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-5">
              <h1 className="text-lg font-semibold tracking-tight">
                smart-masonry-grid
              </h1>
              <div className="hidden sm:block">
                <Nav />
              </div>
            </div>
            <Controls
              columns={columns}
              onColumnsChange={setColumns}
              gap={gap}
              onGapChange={setGap}
            />
          </div>
          {/* Info bar with item count selector */}
          <div className="flex items-center justify-between border-t border-zinc-800/40 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-500" />
              <span className="text-xs text-zinc-400">
                <span className="font-medium text-zinc-300">
                  &lt;VirtualMasonry&gt;
                </span>
                {" "} — only visible items rendered in the DOM
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Items
              </span>
              <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900/50 p-0.5">
                {PRESETS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalItems(n)}
                    className={`rounded-[5px] px-2.5 py-1 text-xs font-medium tabular-nums transition-all ${
                      totalItems === n
                        ? "bg-violet-500 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {n >= 1000 ? `${n / 1000}k` : n}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-zinc-500">Animate</span>
                <input
                  type="checkbox"
                  checked={animateEnabled}
                  onChange={(e) => setAnimateEnabled(e.target.checked)}
                  className="accent-violet-500"
                />
              </label>
              <div className="h-4 w-px bg-zinc-800" />
              <span className="text-xs text-zinc-600">or</span>
              <input
                type="number"
                min={1}
                max={10_000}
                value={totalItems}
                onChange={(e) => {
                  const v = Math.min(
                    10_000,
                    Math.max(1, Number(e.target.value) || 1),
                  );
                  setTotalItems(v);
                }}
                className="w-20 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-xs tabular-nums text-zinc-300 outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Virtualized Masonry Grid */}
      <main className="flex-1 min-h-0">
        <VirtualMasonry
          totalItems={totalItems}
          renderItem={renderItem}
          columns={columns}
          gap={gap}
          height={viewportHeight}
          overscan={800}
          estimatedItemHeight={250}
          animate={animateEnabled}
          placeholder={
            <div className="rounded-xl bg-zinc-800 animate-pulse" style={{ height: 250 }} />
          }
          className="mx-auto max-w-350 px-6"
        />
      </main>
    </div>
  );
}
