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
        const { data } = await supabase.from('students').select('name').eq('id', studentIds[0]).single();
        if (data) setParentStudentName(data.name);
      }
      getStudentName();
    }
  }, [isParentView, studentIds]);

  useEffect(() => {
    async function getPhotos() {
      setLoading(true);
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

  const handleDownload = async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    try {
      const fullUrl = `${s3Prefix}${photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`;
      let fileName = '';
      
      if (isParentView) {
        const primaryName = parentStudentName || (photo.student_names?.[0] || 'Student');
        fileName = `${primaryName} - ${photo.event_name}`;
      } else {
        const formattedRabbis = (photo.rabbi_names || []).map(name => `R-${name.split(' ')[0]}`);
        const formattedStudents = (photo.student_names || []).map(name => name.split(' ')[0]);
        const allPeople = [...formattedRabbis, ...formattedStudents];
        const peopleSlug = allPeople.length > 0 ? '-' + allPeople.slice(0, 3).join('-') : '';
        fileName = `${photo.event_name.replace(/\s+/g, '-')}${peopleSlug}`;
      }

      const finalFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-').trim() + '.jpg';
      const response = await fetch(`${fullUrl}?t=${Date.now()}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(`${s3Prefix}${photo.storage_path}`, '_blank');
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
          isParentView={isParentView}
          onClose={() => setSelectedPhoto(null)} 
        />
      )}

      <header className="sticky top-0 z-30 bg-white border-b-4 border-[#003366] px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className={`flex items-center gap-4 ${!isParentView ? 'cursor-pointer' : ''}`} onClick={() => !isParentView && router.push('/')}>
            <img src="/logo.png" alt="YTS" className="h-10 md:h-16 w-auto" />
            <div className="flex flex-col">
              <h1 className="text-sm md:text-xl font-serif font-black text-[#003366] uppercase">Yeshivat Torat Shraga</h1>
              <span className="text-[9px] md:text-[11px] font-bold text-[#C5A059] uppercase mt-1">Official Photo Gallery</span>
            </div>
          </div>
          {!isParentView && (
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={() => setIsMatchMakerOpen(true)} className="bg-[#C5A059] text-white px-5 py-2 rounded text-xs font-bold shadow-md">Multi-Search</button>
              <AutocompleteSearch table="students" placeholder="Search Students..." />
              <AutocompleteSearch table="rabbis" placeholder="Search Rabbis..." />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-10">
        {isParentView && (
          <div className="mb-12">
            <div className="bg-[#003366] rounded-3xl py-20 md:py-32 px-6 text-center text-white shadow-2xl border-b-[12px] border-[#C5A059] relative overflow-hidden">
              <div className="relative z-10 max-w-4xl mx-auto">
                <h2 className="text-4xl md:text-7xl font-serif font-extrabold leading-tight">Chag Kasher V’Samach</h2>
                <div className="w-20 h-1 bg-[#C5A059] mx-auto my-8"></div>
                <p className="text-lg md:text-3xl font-light">
                  We are proud to share snapshots of <span className="font-bold text-[#C5A059]">{parentStudentName || 'Your Son'}</span> 
                </p>
                <p className="mt-4 text-white/70 italic text-sm md:text-xl">(He may be hiding in the crowd but he's certainly there 😉)</p>
                <div className="mt-16 inline-flex items-center gap-4 bg-white/10 px-6 py-2 rounded-full border border-white/20">
                  <span className="text-sm md:text-lg font-black">{photos.length} Photos</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {photos.slice(0, visibleCount).map((photo) => (
            <div key={photo.storage_path} onClick={() => setSelectedPhoto(photo)} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-zoom-in relative">
              <button onClick={(e) => handleDownload(e, photo)} className="absolute top-3 right-3 z-20 bg-white/90 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#C5A059] hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <div className="aspect-[4/5] bg-slate-100 overflow-hidden">
                <img src={`${s3Prefix}${photo.storage_path.split('/').map(s => encodeURIComponent(s)).join('/')}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-4">
                <p className="text-[10px] text-[#C5A059] uppercase font-black">{photo.event_name}</p>
                {!isParentView && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {photo.rabbi_names?.map((name, i) => <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#003366] text-white">R- {name}</span>)}
                    {photo.student_names?.map((name, i) => <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#003366] border">{name}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {visibleCount < photos.length && <div ref={observerRef} className="h-20 w-full" />}
      </main>
      <footer className="mt-20 py-10 bg-[#003366] text-white/50 text-center text-[10px] tracking-[.4em]">YESHIVAT TORAT SHRAGA  &bull; {new Date().getFullYear()}</footer>
    </div>
  );
}