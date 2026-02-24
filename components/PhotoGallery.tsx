'use client';

import { useState, useEffect, useRef } from 'react';
import PhotoCard from './PhotoCard'; // Adjust this path to your actual card component

interface PhotoGalleryProps {
  photos: any[]; // Replace 'any' with your Photo type if you have one
  eventName: string;
}

export default function PhotoGallery({ photos, eventName }: PhotoGalleryProps) {
  const [visibleCount, setVisibleCount] = useState(50);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Intersection Observer Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // If the bottom of the list is visible and we have more photos to show
        if (entries[0].isIntersecting && visibleCount < photos.length) {
          setVisibleCount((prev) => prev + 50);
        }
      },
      { threshold: 1.0 } // Trigger only when the full sentinel is visible
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, photos.length]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-white">
        {eventName} <span className="text-blue-500">({photos.length})</span>
      </h2>

      {/* The Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.slice(0, visibleCount).map((photo, index) => (
          <PhotoCard 
            key={photo.id || index} 
            photo={photo} 
            eventName={eventName} 
          />
        ))}
      </div>

      {/* The Sentinel (Invisible trigger) */}
      {visibleCount < photos.length && (
        <div 
          ref={observerRef} 
          className="h-20 w-full flex items-center justify-center mt-10"
        >
          {/* Loading Animation */}
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-.3s]" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-.5s]" />
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="mt-20 text-center text-white/20 text-[10px] uppercase tracking-[0.5em] font-bold">
        {visibleCount >= photos.length ? "End of Gallery" : `Loaded ${visibleCount} of ${photos.length}`}
      </div>
    </div>
  );
}