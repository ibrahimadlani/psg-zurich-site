"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const src = (id: string) => `/api/v1/media/${id}`;

/**
 * Product photos. Computer: the large photo with its thumbnails below. Phone: photos swiped
 * sideways with dots. A tap opens the photo full screen (arrows, Esc, swipe down to close).
 */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const t = useTranslations("Shop");
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);

  // Phone: the dot follows the photo in view.
  const onScroll = () => {
    const element = track.current;
    if (!element) return;
    setCurrent(Math.round(element.scrollLeft / element.clientWidth));
  };

  useEffect(() => {
    if (zoom === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoom(null);
      if (event.key === "ArrowRight") setZoom((value) => (value === null ? null : (value + 1) % images.length));
      if (event.key === "ArrowLeft") setZoom((value) => (value === null ? null : (value - 1 + images.length) % images.length));
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [zoom, images.length]);

  if (images.length === 0) {
    return <div className="aspect-[4/5] rounded-[16px] bg-foreground/[0.05]" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Phone: swiped photos. */}
      <div className="relative -mx-4 lg:hidden">
        <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
          {images.map((image, index) => (
            <button key={image} type="button" onClick={() => setZoom(index)} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-foreground/[0.04]">
              {/* eslint-disable-next-line @next/next/no-img-element -- stored media */}
              <img src={src(image)} alt={index === 0 ? name : ""} loading={index === 0 ? "eager" : "lazy"} className="absolute inset-0 size-full object-cover" />
            </button>
          ))}
        </div>
        {images.length > 1 ? (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
            {images.map((image, index) => (
              <span key={image} className={cn("h-1.5 rounded-full bg-white/90 shadow transition-all duration-300", index === current ? "w-5" : "w-1.5 opacity-60")} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Computer: the large photo and its thumbnails. */}
      <div className="hidden flex-col gap-3 lg:flex">
        <button type="button" onClick={() => setZoom(current)} className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[16px] bg-foreground/[0.04]">
          {images.map((image, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- stored media
            <img
              key={image}
              src={src(image)}
              alt={index === 0 ? name : ""}
              loading={index === 0 ? "eager" : "lazy"}
              className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500", index === current ? "opacity-100" : "opacity-0")}
            />
          ))}
        </button>
        {images.length > 1 ? (
          <div className="grid grid-cols-5 gap-2">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                aria-label={t("photo", { index: index + 1 })}
                aria-current={index === current || undefined}
                onClick={() => setCurrent(index)}
                className={cn("aspect-square cursor-pointer overflow-hidden rounded-[10px] border-2 transition-[border-color,opacity]", index === current ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- stored media */}
                <img src={src(image)} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Full screen. */}
      {zoom !== null ? (
        <div
          role="dialog"
          aria-modal
          aria-label={name}
          className="fixed inset-0 z-[60] grid animate-in place-items-center bg-black/95 fade-in-0 duration-200"
          onClick={() => setZoom(null)}
          onTouchStart={(event) => (touchStart.current = event.touches[0]?.clientY ?? null)}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            const end = event.changedTouches[0]?.clientY;
            if (start !== null && end !== undefined && end - start > 80) setZoom(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- stored media */}
          <img src={src(images[zoom]!)} alt={name} onClick={(event) => event.stopPropagation()} className="max-h-[92svh] max-w-[94vw] animate-in object-contain zoom-in-95 duration-300" />
          <button type="button" aria-label={t("close")} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white">
            <X className="size-5" aria-hidden />
          </button>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                aria-label={t("previous")}
                onClick={(event) => {
                  event.stopPropagation();
                  setZoom((zoom - 1 + images.length) % images.length);
                }}
                className="absolute left-3 grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white max-sm:hidden"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t("next")}
                onClick={(event) => {
                  event.stopPropagation();
                  setZoom((zoom + 1) % images.length);
                }}
                className="absolute right-3 grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white max-sm:hidden"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
