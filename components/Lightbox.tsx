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
    try {
      // 1. Fetch the image data
      const response = await fetch(src);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      
      // 2. Create a temporary 'blob' URL
      const url = window.URL.createObjectURL(blob);
      
      // 3. Create a hidden link and click it
      const link = document.createElement('a');
      link.href = url;
      
      // Clean up filename (e.g., "Chanukah-Photo.jpg")
      const safeName = `${eventName.replace(/\s+/g, '-') || 'Shraga-Photo'}.jpg`;
      link.setAttribute('download', safeName);
      
      document.body.appendChild(link);
      link.click();
      
      // 4. Clean up
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: Just open the image in a new tab if fetch is blocked
      window.open(src, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/50 hover:text-white text-4xl font-light transition-colors p-4"
      >
        &times;
      </button>

      {/* Main Image Container */}
      <div className="relative max-w-[90vw] max-h-[75vh] flex items-center justify-center shadow-2xl">
        <img 
          src={src} 
          alt="Full size" 
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

      {/* Info & Actions */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
          {eventName || 'General Gallery'}
        </p>
        
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
              <><span>⬇</span> Download Photo</>}
            </button>
        </div>
      </div>
    </div>
  );
}