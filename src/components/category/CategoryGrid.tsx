"use client";

import Image from "next/image";
import { type CategoryWithStats } from "@/app/actions/category-actions";
import { Play, Flame } from "lucide-react";
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
    <section className="w-full my-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
          <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-tight text-white">
            {title}
          </h2>
        </div>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          {categories.length} Категори
        </span>
      </div>

      {/* FUQ Style Category Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.name || selectedCategory === cat.slug;
          const displayImage = cat.first_video_thumbnail || cat.thumbnail_url || '/logo.png';
          const displayCount = formatCountNumber(cat.total_views > 0 ? cat.total_views : (cat.video_count || 1200));

          return (
            <div
              key={cat.id || cat.slug}
              onClick={() => onSelectCategory && onSelectCategory(cat)}
              className={cn(
                "group cursor-pointer flex flex-col gap-1.5 transition-all duration-300 select-none",
                isSelected && "ring-2 ring-red-600 ring-offset-2 ring-offset-[#0a0610] rounded-xl"
              )}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#161220] border border-white/10 shadow-md transition-all group-hover:border-red-600/50">
                <Image
                  src={displayImage}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  unoptimized
                />

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />

                {/* Bottom Left View Count Badge */}
                <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white tracking-tight">
                  {displayCount}
                </div>

                {/* Hover Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-[1px]">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Title Below Thumbnail */}
              <div className="px-0.5">
                <h3 className={cn(
                  "font-bold text-xs sm:text-sm tracking-tight truncate transition-colors",
                  isSelected ? "text-red-500 font-extrabold" : "text-zinc-200 group-hover:text-red-500"
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
