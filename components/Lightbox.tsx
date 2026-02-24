'use client';

import { useEffect } from 'react';

interface LightboxProps {
  src: string;
  eventName: string;
  onClose: () => void;
}

export default function Lightbox({ src, eventName, onClose }: LightboxProps) {
  
  const handleWhatsAppShare = () => {
    try {
      // 1. Standardize URL to prevent broken links or double-encoding
      const rawUrl = decodeURIComponent(src);
      const baseUrl = "https://yeshiva-photos.s3.eu-west-2.amazonaws.com/";
      const path = rawUrl.replace(baseUrl, "");
      
      const cleanPath = path
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

      const finalCleanLink = baseUrl + cleanPath;
      const messageText = `Check out this photo from ${eventName} at Shraga!\n\n${finalCleanLink}`;
      const encodedMessage = encodeURIComponent(messageText);

      // 2. Detection: Are we on a mobile device or a computer?
      const isMobile = /iPhone|Android|iPad|iPod/i.test(navigator.userAgent);
      
      // 3. Desktop fix: Use 'web' to target existing browser sessions
      // Mobile fix: Use 'api' to trigger the installed app
      const whatsappBase = isMobile 
        ? "https://api.whatsapp.com/send?text=" 
        : "https://web.whatsapp.com/send?text=";

      window.open(`${whatsappBase}${encodedMessage}`, '_blank');
    } catch (error) {
      console.error("WhatsApp share failed", error);
      window.open(`https://wa.me/?text=${encodeURIComponent(src)}`, '_blank');
    }
  };

  // Close when pressing the Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Top Close Button */}
      <button 
        className="absolute top-6 right-6 text-white text-5xl font-extralight hover:text-green-400 transition-colors z-50"
        onClick={onClose}
      >
        &times;
      </button>
      
      <div 
        className="max-w-5xl w-full flex flex-col items-center" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo Display */}
        <div className="relative group">
          <img 
            src={src} 
            alt={eventName} 
            className="max-h-[70vh] rounded-xl shadow-2xl border border-white/10 object-contain shadow-black/60"
          />
        </div>
        
        {/* Control Panel */}
        <div className="mt-8 text-center">
          <h3 className="text-white text-2xl font-black tracking-tighter uppercase mb-6">
            {eventName}
          </h3>
          
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={handleWhatsAppShare}
              className="bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 text-white px-12 py-4 rounded-full font-bold text-sm uppercase tracking-widest shadow-xl transition-all flex items-center gap-3"
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.236 3.484 8.417 0 6.556-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.652zm5.835-3.332c1.515.899 3.3 1.447 5.231 1.447 5.425 0 9.839-4.415 9.84-9.842 0-2.628-1.023-5.097-2.88-6.956-1.857-1.859-4.325-2.881-6.952-2.881-5.428 0-9.84 4.415-9.842 9.844-.001 1.93.565 3.713 1.562 5.218l-1.026 3.746 3.867-1.012z"/>
                <path d="M17.472 14.382c-.301-.15-1.781-.879-2.056-.979-.275-.1-.475-.15-.675.15-.199.299-.775.979-.95 1.178-.175.199-.35.224-.651.075-.301-.15-1.27-.468-2.42-1.494-.894-.797-1.498-1.782-1.673-2.081-.175-.299-.018-.462.131-.61.135-.133.301-.35.452-.524.151-.174.199-.298.301-.497.102-.199.049-.374-.025-.524-.075-.15-.675-1.625-.925-2.225-.244-.589-.491-.51-.675-.519-.174-.009-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-.775.757-.775 1.84s.799 2.132.91 2.281c.11.15 1.573 2.4 3.812 3.368.533.23 1.042.425 1.435.553.535.17 1.023.146 1.408.089.43-.064 1.32-.54 1.506-1.061.185-.52.185-.964.13-1.06-.055-.101-.201-.15-.502-.3z"/>
              </svg>
              Share via WhatsApp
            </button>
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText(src);
                alert("Link copied!");
              }}
              className="text-white/30 text-[10px] font-bold uppercase tracking-[0.4em] hover:text-white transition-all"
            >
              Copy Direct Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}