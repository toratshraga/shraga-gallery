'use client';

import { useState } from 'react';

interface LightboxProps {
  src: string;
  eventName: string;
  studentNames?: string[]; // From our new SQL View
  rabbiNames?: string[];   // From our new SQL View
  onClose: () => void;
}

export default function Lightbox({ 
  src, 
  eventName, 
  studentNames = [], 
  rabbiNames = [], 
  onClose 
}: LightboxProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      // 1. CONSTRUCT FILENAME
      // Combine all names into one array
      const allPeople = [...studentNames, ...rabbiNames];
      
      let peopleSlug = 'Photo';
      if (allPeople.length > 0) {
        // Take first 2 names, use first names only to keep filename short
        const mainNames = allPeople.slice(0, 2).map(name => name.split(' ')[0]);
        peopleSlug = mainNames.join('-');
        
        // Add a suffix if there are more people tagged
        if (allPeople.length > 2) {
          peopleSlug += '-and-others';
        }
      }

      const cleanEvent = (eventName || 'Gallery').replace(/\s+/g, '-');
      const uniqueId = Math.random().toString(36).substring(2, 6);
      const safeName = `${cleanEvent}-${peopleSlug}-${uniqueId}.jpg`;

      // 2. FETCH FILE WITH CORS FIXES
      // Cache buster 't=' forces a fresh fetch with the new S3 CORS headers
      const fetchUrl = `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 3. TRIGGER DOWNLOAD
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: Just open the image in a new tab if everything fails
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
        className="absolute top-6 right-6 text-white/50 hover:text-white text-4xl font-light transition-colors p-4 z-10"
        aria-label="Close"
      >
        &times;
      </button>

      {/* Main Image */}
      <div className="relative max-w-[90vw] max-h-[70vh] flex items-center justify-center shadow-2xl">
        <img 
          src={src} 
          alt="Full size view" 
          className="max-w-full max-h-full object-contain rounded-lg border border-white/10"
        />
      </div>

      {/* Controls & Info */}
      <div className="mt-8 flex flex-col items-center gap-4 text-center px-4">
        <div>
          <h2 className="text-white text-lg font-medium">
            {eventName || 'Event Photo'}
          </h2>
          {(studentNames.length > 0 || rabbiNames.length > 0) && (
            <p className="text-white/60 text-sm mt-1">
              With: {[...studentNames, ...rabbiNames].join(', ')}
            </p>
          )}
        </div>

        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-10 py-3 rounded-full font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Preparing...
            </>
          ) : (
            <>
              <span className="text-xl">📥</span>
              <span>Download Image</span>
            </>
          )}
        </button>
        
        <p className="text-white/20 text-[10px] italic">
          Files are named automatically based on event and people tagged.
        </p>
      </div>
    </div>
  );
}