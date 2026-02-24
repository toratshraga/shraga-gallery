'use client';

import { useState, useEffect, use, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import AutocompleteSearch from '@/components/AutocompleteSearch';
import Lightbox from '@/components/Lightbox';
import MultiSearchModal from '@/components/MultiSearchModal';
import { useRouter } from 'next/navigation';

interface Photo {
  storage_path: string;
  event_name: string;
  student_ids: number[];
  rabbi_ids: number[];
  student_names?: string[];
  rabbi_names?: string[];
}

interface Props {
  searchParams: Promise<{ studentId?: string; rabbiId?: string; event?: string }>;
}

export default function GalleryPage({ searchParams }: Props) {
  const params = use(searchParams);
  const router = useRouter();
  
  const studentIds = params.studentId ? params.studentId.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
  const rabbiIds = params.rabbiId ? params.rabbiId.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
  const currentEvent = params.event || '';

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isMatchMakerOpen, setIsMatchMakerOpen] = useState(false);

  const s3Prefix = "https://yeshiva-photos.s3.eu-west-2.amazonaws.com/";
  const observerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch Event Names
  useEffect(() => {
    async function getEventNames() {
      const { data } = await supabase.from('unique_event_names').select('event_name');
      if (data) setEvents(data.map(e => e.event_name));
    }
    getEventNames();
  }, []);

  // 2. Fetch Photos from View
  useEffect(() => {
    async function getPhotos() {
      setLoading(true);
      setVisibleCount(50); 
      
      let query = supabase
        .from('gallery_display_view') 
        .select('*')
        .order('created_at', { ascending: false });

      if (studentIds.length > 0) query = query.contains('student_ids', studentIds);
      if (rabbiIds.length > 0) query = query.contains('rabbi_ids', rabbiIds);
      if (currentEvent) query = query.eq('event_name', currentEvent);

      const { data, error } = await query;
      if (!error) setPhotos(data || []);
      setLoading(false);
    }
    getPhotos();
  }, [params.studentId, params.rabbiId, params.event]);

  // 3. Infinite Scroll
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < photos.length) {
          setVisibleCount((prev) => prev + 50);
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, visibleCount, photos.length]);

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const urlParams = new URLSearchParams(window.location.search);
    if (val) urlParams.set('event', val);
    else urlParams.delete('event');
    router.push(`/?${urlParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {selectedPhoto && (
        <Lightbox 
          src={`${s3Prefix}${selectedPhoto.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`} 
          eventName={selectedPhoto.event_name} 
          studentNames={selectedPhoto.student_names || []}
          rabbiNames={selectedPhoto.rabbi_names || []}
          onClose={() => setSelectedPhoto(null)} 
        />
      )}

      {isMatchMakerOpen && <MultiSearchModal onClose={() => setIsMatchMakerOpen(false)} />}

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-xl font-black tracking-tight text-blue-900 cursor-pointer" onClick={() => router.push('/')}>
            SHRAGA <span className="text-slate-400 font-light">AI</span>
          </h1>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsMatchMakerOpen(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
            >
              🔍 Find Together
            </button>
            
            <div className="relative">
              <select 
                value={currentEvent}
                onChange={handleEventChange}
                className="appearance-none bg-slate-100 border-none rounded-full px-5 py-2 text-xs font-bold text-slate-700 outline-none pr-10"
              >
                <option value="">All Events</option>
                {events.map((evt) => (
                  <option key={evt} value={evt}>{evt}</option>
                ))}
              </select>
            </div>

            <AutocompleteSearch table="students" placeholder="Search Student..." />
            <AutocompleteSearch table="rabbis" placeholder="Search Rabbi..." />
            
            {(studentIds.length > 0 || rabbiIds.length > 0 || currentEvent) && (
              <button onClick={() => router.push('/')} className="text-xs font-bold text-red-500 px-3 py-2">
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {loading ? (
          <div className="flex justify-center py-20 animate-pulse text-blue-900 font-bold">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {photos.slice(0, visibleCount).map((photo) => {
                const fullUrl = `${s3Prefix}${photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`;

                return (
                  <div 
                    key={photo.storage_path} 
                    onClick={() => setSelectedPhoto(photo)}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-200 overflow-hidden cursor-zoom-in"
                  >
                    <div className="relative aspect-[4/5] bg-slate-100">
                      <img src={fullUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">{photo.event_name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {/* 1. Show Rabbis first with "R-" prefix */}
                        {photo.rabbi_names?.map((name, idx) => (
                          <span 
                            key={`r-${idx}`} 
                            className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-100"
                          >
                            R- {name}
                          </span>
                        ))}
                        {/* 2. Show Students */}
                        {photo.student_names?.map((name, idx) => (
                          <span 
                            key={`s-${idx}`} 
                            className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-100"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {visibleCount < photos.length && (
              <div ref={observerRef} className="h-24 w-full flex items-center justify-center mt-10 text-slate-400 text-sm">
                Loading more photos...
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}