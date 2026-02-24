'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
  table: 'students' | 'rabbis';
  placeholder: string;
  mode?: 'default' | 'modal';
  onSelectCustom?: (id: number, name: string) => void;
}

export default function AutocompleteSearch({ table, placeholder, mode = 'default', onSelectCustom }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: number; name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchNames = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      const { data } = await supabase
        .from(table)
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(5);
      
      setResults(data || []);
    };

    const debounce = setTimeout(fetchNames, 300);
    return () => clearTimeout(debounce);
  }, [query, table]);

  const handleSelect = (id: number, name: string) => {
    setIsOpen(false);
    setQuery('');

    // If we are in modal mode, just pass the data up and don't navigate
    if (mode === 'modal' && onSelectCustom) {
      onSelectCustom(id, name);
      return;
    }

    // Default Navigation Logic
    const params = new URLSearchParams(searchParams.toString());
    const paramName = table === 'students' ? 'studentId' : 'rabbiId';
    
    // For the main search boxes, we'll keep them as "single search" or "append"
    // Let's make the main ones overwrite to keep it simple, 
    // and let the Match Maker handle the complex ones.
    params.set(paramName, id.toString());
    if (paramName === 'studentId') params.delete('rabbiId');
    else params.delete('studentId');

    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="relative w-full md:w-64">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full px-4 py-2 bg-slate-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
      />
      
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {results.map((item) => (
            <li 
              key={item.id}
              onClick={() => handleSelect(item.id, item.name)}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-none text-slate-800"
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}