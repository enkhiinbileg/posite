"use client";

import Image from "next/image";
import { type CategoryWithStats } from "@/app/actions/category-actions";
import { FolderHeart, Play, Sparkles } from "lucide-react";
import { cn, formatCountNumber } from "@/lib/utils";

interface CategoryGridProps {
  categories: CategoryWithStats[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: CategoryWithStats) => void;
  title?: string;
}

export function CategoryGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  title = "Most Popular Categories"
}: CategoryGridProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="w-full my-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-7 bg-primary rounded-full" />
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            {title}
          </h2>
        </div>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
          {categories.length} Категори
        </span>
      </div>

      {/* Grid matching fuq.com screenshot layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.name || selectedCategory === cat.slug;
          const displayImage = cat.first_video_thumbnail || cat.thumbnail_url || '/logo.png';
          const displayCount = formatCountNumber(cat.total_views > 0 ? cat.total_views : (cat.video_count || 1200));

          return (
            <div
              key={cat.id || cat.slug}
              onClick={() => onSelectCategory && onSelectCategory(cat)}
              className={cn(
                "group cursor-pointer flex flex-col gap-2 transition-all duration-200 select-none",
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-[#0f0f0f] rounded-2xl p-1"
              )}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-zinc-900 border border-white/10 shadow-md">
                <Image
                  src={displayImage}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                  unoptimized
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Bottom Left Badge (Views / Count) */}
                <div className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-black text-white tracking-tight flex items-center gap-1">
                  <span>{displayCount}</span>
                </div>

                {/* Play Button Overlay on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Title Below Thumbnail */}
              <div className="px-0.5">
                <h3 className={cn(
                  "font-black text-xs sm:text-sm tracking-tight truncate transition-colors",
                  isSelected ? "text-primary" : "text-zinc-200 group-hover:text-white"
                )}>
                  {cat.name}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
