'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AutocompleteSearch from './AutocompleteSearch'; // We'll tweak this slightly

interface SelectedPerson {
  id: number;
  name: string;
  type: 'student' | 'rabbi';
}

export default function MultiSearchModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<SelectedPerson[]>([]);
  const router = useRouter();

  const addPerson = (id: number, name: string, type: 'student' | 'rabbi') => {
    if (selected.length >= 3) return; // Limit to 3 people for logic safety
    if (!selected.find(p => p.id === id && p.type === type)) {
      setSelected([...selected, { id, name, type }]);
    }
  };

  const handleSearch = () => {
    const students = selected.filter(p => p.type === 'student').map(p => p.id).join(',');
    const rabbis = selected.filter(p => p.type === 'rabbi').map(p => p.id).join(',');
    
    let url = '/?';
    if (students) url += `studentId=${students}`;
    if (students && rabbis) url += '&';
    if (rabbis) url += `rabbiId=${rabbis}`;
    
    router.push(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
        <h2 className="text-2xl font-black text-blue-900 mb-2 uppercase tracking-tighter">Match Maker</h2>
        <p className="text-slate-500 text-sm mb-6">Find photos featuring these people together:</p>

        {/* Selected Tags Area */}
        <div className="flex flex-wrap gap-2 mb-6 min-h-[40px] p-3 bg-slate-50 rounded-xl border border-slate-100">
          {selected.length === 0 && <span className="text-slate-400 text-xs italic">No one selected yet...</span>}
          {selected.map(p => (
            <span key={`${p.type}-${p.id}`} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${p.type === 'student' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>
              {p.name}
              <button onClick={() => setSelected(selected.filter(item => item !== p))}>&times;</button>
            </span>
          ))}
        </div>

        {/* Search Inputs (Simplified version of your existing ones) */}
        <div className="space-y-4 mb-8">
           <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Search to add:</p>
           {/* Note: You'll want to pass a prop to AutocompleteSearch 
              called 'onSelectCustom' so it doesn't navigate immediately 
           */}
           <AutocompleteSearch table="students" placeholder="Add Student..." onSelectCustom={(id, name) => addPerson(id, name, 'student')} mode="modal" />
           <AutocompleteSearch table="rabbis" placeholder="Add Rabbi..." onSelectCustom={(id, name) => addPerson(id, name, 'rabbi')} mode="modal" />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button 
            disabled={selected.length < 2}
            onClick={handleSearch} 
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Find Photos
          </button>
        </div>
      </div>
    </div>
  );
}