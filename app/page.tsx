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
  const [parentStudentName, setParentStudentName] = useState<string>('');

  const s3Prefix = "https://yeshiva-photos.s3.eu-west-2.amazonaws.com/";
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isParentView && studentIds[0]) {
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
  }, [isParentView, studentIds]);

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

  /**
   * Updated Download Function
   * Forces the browser to name the file based on the student and event.
   */
  const handleDownload = async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    try {
      const fullUrl = `${s3Prefix}${photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const nameForFile = isParentView && parentStudentName ? parentStudentName : (photo.student_names?.[0] || 'Student');
      const cleanEvent = photo.event_name.replace(/[/\\?%*:|"<>]/g, '-');
      const cleanName = nameForFile.replace(/[/\\?%*:|"<>]/g, '-');

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${cleanName} - ${cleanEvent}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Renamed download failed, falling back to direct link", err);
      const fallbackUrl = `${s3Prefix}${photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`;
      window.open(fallbackUrl, '_blank');
    }
  };

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
          <div 
            className={`flex items-center gap-4 md:gap-6 ${!isParentView ? 'cursor-pointer group' : 'cursor-default'}`} 
            onClick={() => !isParentView && router.push('/')}
          >
            <img src="/logo.png" alt="YTS" className={`h-10 md:h-16 w-auto object-contain transition-transform ${!isParentView ? 'group-hover:scale-105' : ''}`} />
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
        
        {isParentView && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-6 duration-1000">
            <div className="bg-[#003366] rounded-3xl py-20 md:py-32 px-6 md:px-12 text-center text-white shadow-2xl border-b-[12px] border-[#C5A059] relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
              
              <div className="relative z-10 max-w-4xl mx-auto">
                <h2 className="text-4xl md:text-7xl font-serif font-extrabold tracking-tight leading-tight">
                  Chag Kasher V’Samach
                </h2>
                <div className="w-20 h-1 bg-[#C5A059] mx-auto my-6 md:my-8"></div>
                
                <p className="text-lg md:text-3xl font-light leading-relaxed">
                  We are proud to share these snapshots of <br className="hidden md:block" />
                  <span className="font-bold text-[#C5A059]">{parentStudentName || 'Your Son'}</span> 
                </p>
                
                <p className="mt-4 text-white/70 italic text-sm md:text-xl font-serif">
                  (He may be hiding in the crowd but he's certainly there 😉)
                </p>

                <div className="mt-10 md:mt-16 inline-flex items-center gap-4 bg-white/10 px-6 py-2 rounded-full border border-white/20">
                  <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-[#C5A059]">Archive Collection</span>
                  <div className="w-px h-4 bg-white/20"></div>
                  <span className="text-sm md:text-lg font-black">{photos.length} Photos</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#003366]/10 border-t-[#C5A059] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {photos.slice(0, visibleCount).map((photo) => (
              <div key={photo.storage_path} onClick={() => setSelectedPhoto(photo)} className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all border border-slate-200 overflow-hidden cursor-zoom-in relative">
                
                {/* Your Existing Download Button with New Logic */}
                <button 
                  onClick={(e) => handleDownload(e, photo)}
                  className="absolute top-3 right-3 z-20 bg-white/90 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#C5A059] hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>

                <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                  <img src={`${s3Prefix}${photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-[#C5A059] uppercase font-black tracking-widest">{photo.event_name}</p>
                  {!isParentView && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {photo.rabbi_names?.map((name, idx) => (
                        <span key={`r-${idx}`} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#003366] text-white">R- {name}</span>
                      ))}
                      {photo.student_names?.map((name, idx) => (
                        <span key={`s-${idx}`} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#003366] border border-slate-200">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {visibleCount < photos.length && <div ref={observerRef} className="h-20 w-full" />}
      </main>

      <footer className="mt-20 py-10 bg-[#003366] text-white/50 text-center text-[10px] tracking-[.4em] uppercase">
        Curated by Shraga AI &bull; {new Date().getFullYear()}
      </footer>
    </div>
  );
}