"use client";

import { useState } from "react";
import { Masonry } from "smart-masonry-grid/react";
import { photos, getUnsplashUrl } from "./photos";
import { Nav } from "./nav";
import { Controls } from "./controls";

type ColumnOption = number | { type: "auto"; minColumnWidth: number };

export default function Home() {
  const [columns, setColumns] = useState<ColumnOption>({
    type: "auto",
    minColumnWidth: 280,
  });
  const [gap, setGap] = useState(12);
  const [animateEnabled, setAnimateEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl">
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
          {/* Info bar */}
          <div className="flex items-center justify-between border-t border-zinc-800/40 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-400">
                <span className="font-medium text-zinc-300">&lt;Masonry&gt;</span>
                {" "} — renders all {photos.length} children in the DOM
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-zinc-500">Animate</span>
              <input
                type="checkbox"
                checked={animateEnabled}
                onChange={(e) => setAnimateEnabled(e.target.checked)}
                className="accent-emerald-500"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-350 px-6 py-6">
        <Masonry columns={columns} gap={gap} animate={animateEnabled}>
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800/50 transition-all hover:ring-zinc-700/80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getUnsplashUrl(photo.id, 600)}
                alt={photo.alt}
                loading="lazy"
                className="w-full block transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/20 to-transparent px-3 pb-3 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="text-xs font-medium text-white truncate">
                  {photo.alt}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Photo {i + 1} of {photos.length}
                </p>
              </div>
            </div>
          ))}
        </Masonry>
      </main>
    </div>
  );
}
