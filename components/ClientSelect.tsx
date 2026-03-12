import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Plus, Phone, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { Button } from './UI';

interface ClientSelectProps {
  tenantId: string;
  onSelect: (client: Client) => void;
  selectedClientId?: string;
  placeholder?: string;
  onNewClient: () => void;
}

export const ClientSelect: React.FC<ClientSelectProps> = ({
  tenantId,
  onSelect,
  selectedClientId,
  placeholder = "Buscar cliente por nome ou celular...",
  onNewClient
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      const fetchSelected = async () => {
        const { data } = await (supabase.from('clients' as any).select('*') as any).eq('id', selectedClientId).single();
        if (data) setSelectedClient(data);
      };
      fetchSelected();
    } else {
      setSelectedClient(null);
    }
  }, [selectedClientId]);

  const searchClients = async (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await (supabase
        .from('clients' as any)
        .select('*') as any)
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(5);

      if (data) setResults(data);
    } catch (err) {
      console.error('Error searching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && searchTerm.length >= 2) searchClients(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  const handleSelect = (client: Client) => {
    setSelectedClient(client);
    onSelect(client);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="w-full space-y-1.5 relative" ref={wrapperRef}>
      <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Cliente</label>
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          {loading ? <Loader2 size={18} className="animate-spin text-emerald-500" /> : <Search size={18} />}
        </div>
        
        <input
          type="text"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-12 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
          placeholder={selectedClient ? `${selectedClient.name}` : placeholder}
          value={isOpen ? searchTerm : (selectedClient ? selectedClient.name : '')}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onNewClient();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors border border-emerald-500/20"
          title="Novo Cliente"
        >
          <Plus size={18} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
              {results.length > 0 ? (
                results.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => handleSelect(client)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200 group-hover:text-white">{client.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {client.phone}</p>
                      </div>
                    </div>
                    {selectedClientId === client.id && <Check size={16} className="text-emerald-500" />}
                  </div>
                ))
              ) : searchTerm.length >= 2 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500 mb-3 text-center">Nenhum cliente encontrado com "{searchTerm}"</p>
                  <Button 
                    variant="secondary" 
                    className="w-full text-xs py-2"
                    onClick={(e) => {
                      e.preventDefault();
                      onNewClient();
                    }}
                  >
                    Cadastrar "{searchTerm}"
                  </Button>
                </div>
              ) : (
                 <div className="p-4 text-center text-slate-500 text-xs italic">
                    Comece a digitar para buscar...
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
