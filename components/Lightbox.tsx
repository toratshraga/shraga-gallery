'use client';

import { useState } from 'react';

interface LightboxProps {
  src: string;
  eventName: string;
  studentNames?: string[];
  rabbiNames?: string[];
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
      // Map names to include "R-" for Rabbis and use only first names for the file slug
      const formattedRabbis = rabbiNames.map(name => `R-${name.split(' ')[0]}`);
      const formattedStudents = studentNames.map(name => name.split(' ')[0]);
      
      const allPeople = [...formattedRabbis, ...formattedStudents];
      
      let peopleSlug = '';
      if (allPeople.length > 0) {
        // Take the first 2 people for the filename to keep it clean
        peopleSlug = '-' + allPeople.slice(0, 2).join('-');
        
        // If there are more than 2 people total, append the suffix
        if (allPeople.length > 2) {
          peopleSlug += '-and-others';
        }
      }

      // Format event name for URL/File safety (replace spaces with dashes)
      const cleanEvent = (eventName || 'Gallery').replace(/\s+/g, '-');
      
      // Final filename: e.g., "Chanukah-R-Moishe-Avi-and-others.jpg"
      // No random string: OS will handle duplicates with (1), (2), etc.
      const fileName = `${cleanEvent}${peopleSlug}.jpg`;

      // 2. FETCH FILE WITH CORS FIXES
      // Cache buster 't=' forces a fresh fetch to avoid S3 CORS caching issues
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
      link.download = fileName; 
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: Just open the image in a new tab if the script fails
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

      {/* Main Image Container */}
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
          
          {/* Display tags in UI: Amber for Rabbis (with R-), Blue for Students */}
          {(studentNames.length > 0 || rabbiNames.length > 0) && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {rabbiNames.map((name, i) => (
                <span key={`r-${i}`} className="text-amber-400 text-sm font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  R- {name}
                </span>
              ))}
              {studentNames.map((name, i) => (
                <span key={`s-${i}`} className="text-blue-400 text-sm bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-10 py-3 rounded-full font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
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
          High-res files are named by event and people tagged.
        </p>
      </div>
    </div>
  );
}