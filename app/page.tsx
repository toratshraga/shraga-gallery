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

  // Determine if this is a "Parent View" (one specific student, no other filters)
  const isParentView = studentIds.length === 1 && rabbiIds.length === 0 && !currentEvent;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isMatchMakerOpen, setIsMatchMakerOpen] = useState(false);

  const s3Prefix = "https://yeshiva-photos.s3.eu-west-2.amazonaws.com/";
  const observerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch Event Names (Only if not in parent view to save resources)
  useEffect(() => {
    if (isParentView) return;
    async function getEventNames() {
      const { data } = await supabase.from('unique_event_names').select('event_name');
      if (data) setEvents(data.map(e => e.event_name));
    }
    getEventNames();
  }, [isParentView]);

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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-xl font-black tracking-tight text-blue-900 cursor-pointer" onClick={() => router.push('/')}>
            SHRAGA <span className="text-slate-400 font-light">AI</span>
          </h1>

          {/* Hide Filters if isParentView is true */}
          {!isParentView ? (
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
              <button 
                onClick={() => setIsMatchMakerOpen(true)}
                className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
              >
                🔍 Find Together
              </button>
              
              <div className="relative">
                <select 
                  value={currentEvent}
                  onChange={handleEventChange}
                  className="appearance-none bg-slate-100 border-none rounded-full px-5 py-2 text-xs font-bold text-slate-700 outline-none pr-10 cursor-pointer"
                >
                  <option value="">All Events</option>
                  {events.map((evt) => (
                    <option key={evt} value={evt}>{evt}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              <AutocompleteSearch table="students" placeholder="Search Student..." />
              <AutocompleteSearch table="rabbis" placeholder="Search Rabbi..." />
              
              {(studentIds.length > 0 || rabbiIds.length > 0 || currentEvent) && (
                <button onClick={() => router.push('/')} className="text-xs font-bold text-red-500 px-3 py-2 hover:bg-red-50 rounded-full transition-colors">
                  Clear
                </button>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-xs font-bold tracking-widest uppercase">
              Student Portfolio
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        
        {/* Parent Greeting Banner */}
        {isParentView && photos.length > 0 && (
          <div className="mb-12 animate-in slide-in-from-top duration-1000">
            <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-[2rem] p-10 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-blue-400 blur-3xl"></div>
              </div>

              <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                Chag Kasher V’Samach!
              </h2>
              <p className="text-blue-100 text-lg md:text-2xl font-medium max-w-3xl mx-auto leading-relaxed">
                We are delighted to share these special moments of <br/>
                <span className="text-white font-extrabold underline decoration-blue-400 underline-offset-8">
                  {photos[0].student_names?.[0]}
                </span> 
                <br className="md:hidden"/> from this past term at Yeshivas Shraga.
              </p>
              
              <div className="mt-10 flex flex-col items-center gap-2">
                <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-sm font-bold border border-white/20">
                  {photos.length} High-Resolution Photos
                </div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mt-2">Scroll to explore</p>
              </div>
            </div>
          </div>
        )}

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
                        {photo.rabbi_names?.map((name, idx) => (
                          <span key={`r-${idx}`} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-100">
                            R- {name}
                          </span>
                        ))}
                        {photo.student_names?.map((name, idx) => (
                          <span key={`s-${idx}`} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-100">
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
              <div ref={observerRef} className="h-32 w-full flex items-center justify-center mt-10 text-slate-400 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <span>Loading more memories...</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}