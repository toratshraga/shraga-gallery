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

  // Personalized Banner Logic
  const isParentView = studentIds.length === 1 && rabbiIds.length === 0 && !currentEvent;
  const isGoldMatchView = studentIds.length === 1 && rabbiIds.length === 1;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isMatchMakerOpen, setIsMatchMakerOpen] = useState(false);
  const [parentStudentName, setParentStudentName] = useState<string>('');

  const s3Prefix = "https://yeshiva-photos.s3.eu-west-2.amazonaws.com/";
  const observerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch Student Name (Direct from DB for accuracy)
  useEffect(() => {
    if ((isParentView || isGoldMatchView) && studentIds[0]) {
      async function getStudentName() {
        const { data } = await supabase
          .from('students')
          .select('name')
          .eq('id', studentIds[0])
          .single();
        if (data) setParentStudentName(data.name);
      }
      getStudentName();
    }
  }, [isParentView, isGoldMatchView, studentIds]);

  // 2. Fetch Event Names
  useEffect(() => {
    if (isParentView) return;
    async function getEventNames() {
      const { data } = await supabase.from('unique_event_names').select('event_name');
      if (data) setEvents(data.map(e => e.event_name));
    }
    getEventNames();
  }, [isParentView]);

  // 3. Fetch Photos (Handles "Intersection" query)
  useEffect(() => {
    async function getPhotos() {
      setLoading(true);
      setVisibleCount(50); 
      let query = supabase.from('gallery_display_view').select('*').order('created_at', { ascending: false });

      if (studentIds.length > 0 && rabbiIds.length > 0) {
        query = query.contains('student_ids', studentIds).contains('rabbi_ids', rabbiIds);
      } else {
        if (studentIds.length > 0) query = query.contains('student_ids', studentIds);
        if (rabbiIds.length > 0) query = query.contains('rabbi_ids', rabbiIds);
      }
      
      if (currentEvent) query = query.eq('event_name', currentEvent);

      const { data, error } = await query;
      if (!error) setPhotos(data || []);
      setLoading(false);
    }
    getPhotos();
  }, [params.studentId, params.rabbiId, params.event]);

  // 4. Infinite Scroll
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
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

      <header className="sticky top-0 z-30 bg-white border-b-4 border-[#003366] px-4 md:px-8 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6 cursor-pointer group" onClick={() => router.push('/')}>
            <img src="/logo.png" alt="Torat Shraga" className="h-12 md:h-20 w-auto object-contain transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <h1 className="text-sm md:text-xl font-serif font-black tracking-tight text-[#003366] leading-none uppercase">Yeshivat Torat Shraga</h1>
              <span className="text-[9px] md:text-[11px] font-bold text-[#C5A059] tracking-[.15em] uppercase mt-1">Official Photo Gallery</span>
            </div>
          </div>

          {!isParentView && (
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={() => setIsMatchMakerOpen(true)} className="bg-[#C5A059] text-white px-5 py-2 rounded text-xs font-bold hover:brightness-110 shadow-md">Multi-Search</button>
              <AutocompleteSearch table="students" placeholder="Search Students..." />
              <AutocompleteSearch table="rabbis" placeholder="Search Rabbis..." />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-10">
        
        {/* PERSONALIZED BANNER */}
        {(isParentView || isGoldMatchView) && (
          <div className="mb-12 animate-in fade-in zoom-in-95 duration-1000">
            <div className="bg-[#003366] rounded-3xl p-8 md:p-24 text-center text-white shadow-2xl border-b-[16px] border-[#C5A059] relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
              <div className="relative z-10">
                <p className="text-[#C5A059] font-serif italic text-xl md:text-4xl mb-4 md:mb-8">
                  {isGoldMatchView ? "Celebrating a Special Connection" : "Wishing you and your family a"}
                </p>
                <h2 className="text-5xl md:text-9xl font-serif font-extrabold mb-8 md:mb-14 tracking-tight leading-tight">
                  {isGoldMatchView ? "Shraga Gold" : "Chag Kasher V’Samach"}
                </h2>
                <div className="w-24 md:w-48 h-1 bg-[#C5A059] mx-auto mb-8 md:mb-14"></div>
                <p className="text-white/95 text-lg md:text-4xl font-light max-w-5xl mx-auto leading-relaxed px-4">
                  We are proud to share these snapshots of <br className="hidden md:block" />
                  <span className="font-bold text-white border-b-4 border-[#C5A059] px-2">{parentStudentName || 'Your Son'}</span> 
                  <br /> from his time here at <br className="md:hidden" />
                  <span className="font-serif italic font-medium">Yeshivat Torat Shraga</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-12 h-12 border-4 border-[#003366]/20 border-t-[#C5A059] rounded-full animate-spin"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-40 text-slate-300 font-serif italic text-2xl">No photos found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
            {photos.slice(0, visibleCount).map((photo) => {
              const fullUrl = `${s3Prefix}${photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`;
              
              // PRECISE GOLD MATCH CHECK: Checks if THIS specific photo contains BOTH IDs in the URL
              const isActualGoldPhoto = isGoldMatchView && 
                                        photo.student_ids.includes(studentIds[0]) && 
                                        photo.rabbi_ids.includes(rabbiIds[0]);

              return (
                <div key={photo.storage_path} onClick={() => setSelectedPhoto(photo)} className="group bg-white rounded-xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 overflow-hidden cursor-zoom-in">
                  <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                    <img src={fullUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    
                    {isActualGoldPhoto && (
                      <div className="absolute top-4 right-4 bg-[#C5A059] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-10 animate-in fade-in slide-in-from-top-2">
                        Gold Match
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <div className="p-5 border-t border-slate-50">
                    <p className="text-[10px] text-[#C5A059] uppercase font-black tracking-widest mb-3">{photo.event_name}</p>
                    <div className="flex flex-wrap gap-2">
                      {photo.rabbi_names?.map((name, idx) => (
                        <span key={`r-${idx}`} className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#003366] text-white">R- {name}</span>
                      ))}
                      {photo.student_names?.map((name, idx) => (
                        <span key={`s-${idx}`} className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-100 text-[#003366] border border-slate-200">{name}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {visibleCount < photos.length && (
          <div ref={observerRef} className="h-40 w-full flex items-center justify-center mt-10">
            <span className="text-xs font-black text-slate-300 uppercase tracking-[.5em]">Scroll for more memories</span>
          </div>
        )}
      </main>

      <footer className="mt-32 py-20 bg-[#003366] text-white text-center">
        <div className="max-w-7xl mx-auto px-6">
          <img src="/logo.png" alt="Torat Shraga" className="h-16 mx-auto mb-6 brightness-0 invert opacity-50" />
          <p className="text-white/40 text-[10px] tracking-[.6em] uppercase">Curated by Shraga AI &bull; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}