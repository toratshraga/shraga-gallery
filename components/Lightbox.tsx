'use client';

import { useState } from 'react';

interface LightboxProps {
  src: string;
  eventName: string;
  onClose: () => void;
}

export default function Lightbox({ src, eventName, onClose }: LightboxProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    
    // Create a clean filename (e.g., "Chanukah-Photo.jpg")
    const fileName = `${eventName.replace(/\s+/g, '-') || 'Shraga-Photo'}.jpg`;

    try {
      // 1. Add a cache-buster to the URL to bypass old 'No-CORS' browser cache
      const fetchUrl = `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) throw new Error('CORS or Network issue');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 2. Trigger the download using the blob
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setIsDownloading(false);
    } catch (error) {
      console.warn("CORS fetch failed, falling back to new tab download:", error);
      
      // 3. FALLBACK: Open in new tab for manual save
      // We try the 'download' attribute here, but browsers usually ignore it for cross-origin S3 links
      const fallbackLink = document.createElement('a');
      fallbackLink.href = src;
      fallbackLink.target = '_blank';
      fallbackLink.download = fileName;
      fallbackLink.click();
      
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/50 hover:text-white text-4xl font-light transition-colors p-4 z-10"
      >
        &times;
      </button>

      {/* Main Image Container */}
      <div className="relative max-w-[90vw] max-h-[75vh] flex items-center justify-center shadow-2xl">
        <img 
          src={src} 
          alt="Full size" 
          className="max-w-full max-h-full object-contain rounded-lg border border-white/10"
        />
      </div>

      {/* Info & Actions */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-1">
            {eventName || 'General Gallery'}
          </p>
          <p className="text-white/30 text-[9px]">
            If download opens a new tab, right-click and "Save Image As"
          </p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95"
          >
            {isDownloading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              <>
                <span className="text-lg">⬇</span>
                <span>Download Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}