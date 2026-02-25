'use client';

import { useState } from 'react';

interface LightboxProps {
  src: string;
  eventName: string;
  studentNames?: string[];
  rabbiNames?: string[];
  onClose: () => void;
  isParentView?: boolean;
}

export default function Lightbox({ 
  src, 
  eventName, 
  studentNames = [], 
  rabbiNames = [], 
  onClose,
  isParentView
}: LightboxProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let fileName = '';
      if (isParentView) {
        const primaryName = studentNames.length > 0 ? studentNames[0] : "Student";
        fileName = `${primaryName} - ${eventName}`;
      } else {
        const formattedRabbis = rabbiNames.map(name => `R-${name.split(' ')[0]}`);
        const formattedStudents = studentNames.map(name => name.split(' ')[0]);
        const allPeople = [...formattedRabbis, ...formattedStudents];
        const peopleSlug = allPeople.length > 0 ? '-' + allPeople.slice(0, 3).join('-') : '';
        fileName = `${(eventName || 'Gallery').replace(/\s+/g, '-')}${peopleSlug}`;
      }

      const finalFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-').trim() + '.jpg';
      const fetchUrl = `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`;
      
      const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFileName; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(src, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white text-4xl p-4">&times;</button>
      <div className="relative max-w-[90vw] max-h-[70vh] flex items-center justify-center shadow-2xl">
        <img src={src} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg border border-white/10" />
      </div>
      <div className="mt-8 flex flex-col items-center gap-4 text-center px-4">
        <div>
          <h2 className="text-white text-lg font-medium">{eventName || 'Event Photo'}</h2>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {rabbiNames.map((name, i) => <span key={i} className="text-amber-400 text-sm font-bold">R- {name}</span>)}
            {studentNames.map((name, i) => <span key={i} className="text-blue-400 text-sm">{name}</span>)}
          </div>
        </div>
        <button onClick={handleDownload} disabled={isDownloading} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-10 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
          {isDownloading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : 'Download Image'}
        </button>
      </div>
    </div>
  );
}