'use client';

import { useState, useEffect, use, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import AutocompleteSearch from '@/components/AutocompleteSearch';
import Lightbox from '@/components/Lightbox';
import MultiSearchModal from '@/components/MultiSearchModal';

interface Photo {
  storage_path: string;
  event_name: string;
  student_ids: number[];
  rabbi_ids: number[];
}

interface Props {
  searchParams: Promise<{ studentId?: string; rabbiId?: string }>;
}

export default function GalleryPage({ searchParams }: Props) {
  const params = use(searchParams);
  
  // Parse IDs from URL (handles "101,102")
  const studentIds = params.studentId ? params.studentId.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
  const rabbiIds = params.rabbiId ? params.rabbiId.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<string>('');
  const [isMatchMakerOpen, setIsMatchMakerOpen] = useState(false);

  const s3Prefix = "https://yeshiva-photos.s3.eu-west-2.amazonaws.com/";
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function getPhotos() {
      setLoading(true);
      setVisibleCount(50); 
      
      let query = supabase
        .from('event_photos_v2')
        .select('*')
        .order('created_at', { ascending: false });

      // Use .contains to find photos where ALL selected IDs are present
      if (studentIds.length > 0) {
        query = query.contains('student_ids', studentIds);
      }
      if (rabbiIds.length > 0) {
        query = query.contains('rabbi_ids', rabbiIds);
      }

      const { data, error } = await query;
      if (!error) setPhotos(data || []);
      setLoading(false);
    }
    getPhotos();
  }, [params.studentId, params.rabbiId]);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Lightbox Overlay */}
      {activePhoto && (
        <Lightbox src={activePhoto} eventName={activeEvent} onClose={() => setActivePhoto(null)} />
      )}

      {/* Match Maker Modal */}
      {isMatchMakerOpen && (
        <MultiSearchModal onClose={() => setIsMatchMakerOpen(false)} />
      )}

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-xl font-black tracking-tight text-blue-900 cursor-pointer" onClick={() => window.location.href='/'}>
            SHRAGA <span className="text-slate-400 font-light">AI</span>
          </h1>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsMatchMakerOpen(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 whitespace-nowrap shadow-md active:scale-95"
            >
              🔍 Find Together
            </button>
            <AutocompleteSearch table="students" placeholder="Search Student..." />
            <AutocompleteSearch table="rabbis" placeholder="Search Rabbi..." />
            
            {(studentIds.length > 0 || rabbiIds.length > 0) && (
              <button 
                onClick={() => window.location.href='/'} 
                className="text-xs font-bold text-red-500 px-3 py-2 hover:bg-red-50 rounded-full transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {loading ? (
          <div className="flex justify-center py-20 animate-pulse text-blue-900 font-bold">Loading Gallery...</div>
        ) : photos.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium text-lg">No photos found for this selection.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {photos.slice(0, visibleCount).map((photo) => {
                const encodedPath = photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/');
                const fullUrl = `${s3Prefix}${encodedPath}`;

                return (
                  <div 
                    key={photo.storage_path} 
                    onClick={() => { setActivePhoto(fullUrl); setActiveEvent(photo.event_name); }}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-200 overflow-hidden cursor-zoom-in"
                  >
                    <div className="relative aspect-[4/5] bg-slate-100">
                      <img src={fullUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {/* Array.from(new Set(...)) handles duplicate IDs in the DB to fix Key errors */}
                        {Array.from(new Set(photo.student_ids || [])).map((id) => (
                          <span 
                            key={`s-${id}`} 
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${studentIds.includes(id) ? 'bg-blue-600 text-white border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-100'}`}
                          >
                            #{id}
                          </span>
                        ))}
                        {Array.from(new Set(photo.rabbi_ids || [])).map((id) => (
                          <span 
                            key={`r-${id}`} 
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${rabbiIds.includes(id) ? 'bg-amber-600 text-white border-amber-700' : 'bg-amber-50 text-amber-800 border-amber-100'}`}
                          >
                            #R{id}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Sentinel for Intersection Observer */}
            {visibleCount < photos.length && (
              <div ref={observerRef} className="h-24 w-full flex items-center justify-center mt-10 text-slate-400 text-sm font-medium">
                <div className="animate-bounce">Loading more photos...</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}