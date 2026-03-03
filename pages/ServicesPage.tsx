import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Scissors, Loader2 } from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/UI';
import { ServiceModal } from '../components/ServiceModal';
import { Service } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ServicesPage: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name');

      if (error) throw error;
      setServices(data.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category || 'OUTROS',
        duration: s.duration,
        price: s.price,
        active: s.active,
        description: s.description,
        image_url: s.image_url
      })));
    } catch (err: any) {
      addToast('Erro ao carregar serviços.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [profile?.tenant_id]);

  const handleAddService = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este serviço?')) {
      try {
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setServices(services.filter(s => s.id !== id));
        addToast('Serviço removido!', 'success');
      } catch (err: any) {
        addToast('Erro ao remover serviço.', 'error');
      }
    }
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ active: !service.active })
        .eq('id', service.id);

      if (error) throw error;

      // Optimistic update
      setServices(services.map(s =>
        s.id === service.id ? { ...s, active: !service.active } : s
      ));

      addToast(`Serviço ${!service.active ? 'ativado' : 'desativado'}!`, 'success');
    } catch (err) {
      addToast('Erro ao atualizar status.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Serviços</h1>
          <p className="text-slate-400">Gerencie o menu de serviços da sua barbearia.</p>
        </div>
        <Button onClick={handleAddService}><Plus size={18} /> Novo Serviço</Button>
      </div>

      <Card className="p-4 bg-slate-900/40">
        <div className="max-w-md">
          <Input
            icon={<Search size={18} />}
            placeholder="Buscar serviço..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="font-medium animate-pulse">Carregando serviços...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card key={service.id} className="group relative overflow-hidden">
              {service.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={service.image_url} alt={service.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                </div>
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl transition-transform ${service.image_url ? 'bg-slate-900 border border-slate-800' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <Scissors size={24} />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditService(service)}
                      className="p-2 bg-slate-900/50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 bg-slate-900/50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{service.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <Badge>{service.category}</Badge>
                  <span className="text-xs text-slate-500">{service.duration} min</span>
                </div>

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
                  <div className="text-2xl font-bold text-white">
                    R$ {service.price.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{service.active ? 'Ativo' : 'Inativo'}</span>
                    <Button
                      variant={service.active ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleActive(service)}
                      className={`w-10 h-5 rounded-full relative transition-all p-0 min-w-0 ${service.active ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${service.active ? 'left-6' : 'left-1'}`}></div>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <Button
            variant="ghost"
            onClick={handleAddService}
            className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-600 hover:border-emerald-500/50 hover:text-emerald-500 transition-all group min-h-[250px] bg-transparent"
          >
            <div className="p-4 bg-slate-900 rounded-full mb-3 group-hover:bg-emerald-500/10">
              <Plus size={32} />
            </div>
            <span className="font-bold">Adicionar Novo</span>
            <span className="text-sm opacity-50">Crie um novo serviço ou combo</span>
          </Button>
        </div>
      )}

      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchServices}
        editingService={editingService}
      />
    </div>
  );
};

export default ServicesPage;
