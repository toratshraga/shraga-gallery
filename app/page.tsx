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

  const isParentView = studentIds.length === 1 && rabbiIds.length === 0 && !currentEvent;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isMatchMakerOpen, setIsMatchMakerOpen] = useState(false);

  const s3Prefix = "https://yeshiva-photos.s3.eu-west-2.amazonaws.com/";
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isParentView) return;
    async function getEventNames() {
      const { data } = await supabase.from('unique_event_names').select('event_name');
      if (data) setEvents(data.map(e => e.event_name));
    }
    getEventNames();
  }, [isParentView]);

  useEffect(() => {
    async function getPhotos() {
      setLoading(true);
      setVisibleCount(50); 
      let query = supabase.from('gallery_display_view').select('*').order('created_at', { ascending: false });
      if (studentIds.length > 0) query = query.contains('student_ids', studentIds);
      if (rabbiIds.length > 0) query = query.contains('rabbi_ids', rabbiIds);
      if (currentEvent) query = query.eq('event_name', currentEvent);
      const { data, error } = await query;
      if (!error) setPhotos(data || []);
      setLoading(false);
    }
    getPhotos();
  }, [params.studentId, params.rabbiId, params.event]);

  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < photos.length) {
        setVisibleCount((prev) => prev + 50);
      }
    }, { threshold: 0.1 });
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
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans">
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

      {/* HEADER: Torat Shraga Branding */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-[#003366] px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div 
            className="flex items-center gap-4 cursor-pointer" 
            onClick={() => router.push('/')}
          >
            {/* Logo Placeholder - You can replace the src with the actual logo path from toratshraga.com */}
            <img 
              src="https://toratshraga.com/wp-content/uploads/2021/05/Logo.png" 
              alt="Yeshivat Torat Shraga" 
              className="h-12 md:h-16 w-auto object-contain"
            />
            <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex flex-col">
              <h1 className="text-lg font-serif font-bold text-[#003366] leading-none">
                PHOTO GALLERY
              </h1>
              <span className="text-[10px] font-bold text-[#C5A059] tracking-[.2em] uppercase mt-1">
                Preserving the Shraga Experience
              </span>
            </div>
          </div>

          {!isParentView && (
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
              <button 
                onClick={() => setIsMatchMakerOpen(true)}
                className="bg-[#C5A059] text-white px-5 py-2 rounded-md text-xs font-bold hover:bg-[#B08D48] transition-all shadow-sm active:scale-95"
              >
                Multi-Search
              </button>
              
              <div className="relative">
                <select 
                  value={currentEvent}
                  onChange={handleEventChange}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-md px-5 py-2 text-xs font-bold text-[#003366] outline-none pr-10 cursor-pointer focus:border-[#C5A059]"
                >
                  <option value="">All Events</option>
                  {events.map((evt) => (
                    <option key={evt} value={evt}>{evt}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              <AutocompleteSearch table="students" placeholder="Search Students..." />
              <AutocompleteSearch table="rabbis" placeholder="Search Rabbis..." />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        
        {/* PARENT MODE: Personalized Pre-Pesach Section */}
        {isParentView && photos.length > 0 && (
          <div className="mb-16 animate-in fade-in zoom-in-95 duration-1000">
            <div className="bg-[#003366] rounded-xl p-8 md:p-16 text-center text-white shadow-2xl border-b-8 border-[#C5A059] relative overflow-hidden">
              {/* Elegant Geometric Background Overlay */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%"><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern><rect width="100%" height="100%" fill="url(#grid)" /></svg>
              </div>
              
              <div className="relative z-10">
                <p className="text-[#C5A059] font-serif italic text-xl md:text-2xl mb-4">
                  Wishing you and your family a
                </p>
                <h2 className="text-5xl md:text-7xl font-serif font-extrabold mb-8 tracking-tight">
                  Chag Kasher V’Samach
                </h2>
                <div className="w-24 h-1 bg-[#C5A059] mx-auto mb-8"></div>
                <p className="text-white/90 text-lg md:text-2xl font-light max-w-3xl mx-auto leading-relaxed">
                  It is a privilege to share these cherished moments of <br/>
                  <span className="font-bold text-white border-b-2 border-[#C5A059]">
                    {photos[0].student_names?.[0]}
                  </span> 
                  <br className="md:hidden"/> as he grows and thrives at <br/>
                  <span className="font-serif italic font-medium">Yeshivat Torat Shraga</span>.
                </p>
                <p className="mt-12 text-sm font-bold tracking-[.3em] uppercase text-[#C5A059]">
                  {photos.length} High-Resolution Memories
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-[#003366]/20 border-t-[#C5A059] rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Your Collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {photos.slice(0, visibleCount).map((photo) => {
              const fullUrl = `${s3Prefix}${photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`;

              return (
                <div 
                  key={photo.storage_path} 
                  onClick={() => setSelectedPhoto(photo)}
                  className="group bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden cursor-zoom-in"
                >
                  <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                    <img 
                      src={fullUrl} 
                      alt="" 
                      loading="lazy" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  </div>
                  <div className="p-4 border-t border-slate-50">
                    <p className="text-[10px] text-[#C5A059] uppercase font-black tracking-widest mb-2">
                      {photo.event_name}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {photo.rabbi_names?.map((name, idx) => (
                        <span key={`r-${idx}`} className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#003366]/5 text-[#003366] border border-[#003366]/10">
                          R- {name}
                        </span>
                      ))}
                      {photo.student_names?.map((name, idx) => (
                        <span key={`s-${idx}`} className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Infinite Scroll Loader */}
        {visibleCount < photos.length && (
          <div ref={observerRef} className="h-32 w-full flex items-center justify-center mt-10">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Loading more...</span>
          </div>
        )}
      </main>

      {/* FOOTER: Official Branding */}
      <footer className="mt-20 py-10 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[#003366] font-serif font-bold text-lg mb-2">YESHIVAT TORAT SHRAGA</p>
          <p className="text-slate-400 text-[10px] tracking-widest uppercase">
            Built by Shraga AI &bull; Pesach {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}