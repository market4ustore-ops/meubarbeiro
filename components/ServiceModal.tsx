
import React, { useState, useEffect } from 'react';
import { Scissors, DollarSign, Clock, Loader2 } from 'lucide-react';
import { Modal, Input, Button, Card, Badge } from './UI';
import { Service, Category } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ImageUpload } from './ImageUpload';

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editingService?: Service | null;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingService
}) => {
    const { profile } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState<Omit<Service, 'id'>>({
        name: '',
        category: 'CORTE',
        duration: 30,
        price: 0,
        active: true,
        featured: false,
        description: '',
        image_url: ''
    } as any);

    // No longer using dynamic categories as the schema uses a fixed enum
    /*
    useEffect(() => {
        const fetchCategories = async () => {
            if (!profile?.tenant_id) return;
            const { data } = await supabase
                .from('categories')
                .select('*')
                .eq('tenant_id', profile.tenant_id);

            if (data) setCategories(data);
        };

        if (isOpen) fetchCategories();
    }, [isOpen, profile?.tenant_id]);
    */

    useEffect(() => {
        if (editingService) {
            setFormData({
                name: editingService.name,
                category: editingService.category,
                duration: editingService.duration,
                price: editingService.price,
                active: editingService.active,
                featured: (editingService as any).featured || false,
                description: editingService.description || '',
                image_url: (editingService as any).image_url || ''
            });
        } else {
            setFormData({
                name: '',
                category: 'CORTE',
                duration: 30,
                price: 0,
                active: true,
                featured: false,
                description: '',
                image_url: ''
            });
        }
    }, [editingService, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.tenant_id) return;

        setLoading(true);
        try {
            const payload = {
                tenant_id: profile.tenant_id,
                name: formData.name,
                category: formData.category,
                duration: formData.duration,
                price: formData.price,
                active: formData.active,
                featured: (formData as any).featured,
                description: formData.description,
                image_url: (formData as any).image_url
            };

            if (editingService) {
                const { error } = await supabase
                    .from('services')
                    .update(payload)
                    .eq('id', editingService.id);
                if (error) throw error;
                addToast('Serviço atualizado!', 'success');
            } else {
                const { error } = await supabase
                    .from('services')
                    .insert(payload);
                if (error) throw error;
                addToast('Serviço cadastrado!', 'success');
            }

            onSave();
            onClose();
        } catch (err: any) {
            console.error('Error saving service:', err);
            addToast('Erro ao salvar serviço.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingService ? "Editar Serviço" : "Novo Serviço"}
            maxWidth="max-w-4xl"
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nome do Serviço"
                        placeholder="Ex: Corte Masculino"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-400">Categoria</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                required
                            >
                                <option value="CORTE">Corte</option>
                                <option value="BARBA">Barba</option>
                                <option value="COMBO">Combo</option>
                                <option value="OUTROS">Outros</option>
                            </select>
                        </div>
                        <Input
                            label="Duração (min)"
                            type="number"
                            icon={<Clock size={16} />}
                            value={formData.duration}
                            onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Preço (R$)"
                            type="number"
                            step="0.01"
                            icon={<DollarSign size={16} />}
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                            required
                        />
                        <div className="flex items-center gap-3 pt-8">
                            <span className="text-sm font-medium text-slate-400">Ativo</span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, active: !formData.active })}
                                className={`w-12 h-6 rounded-full relative transition-colors ${formData.active ? 'bg-emerald-600' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.active ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                        <div className="flex items-center gap-3 pt-8">
                            <span className="text-sm font-medium text-slate-400 font-bold text-amber-500">Destaque</span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, featured: !(formData as any).featured } as any)}
                                className={`w-12 h-6 rounded-full relative transition-colors ${(formData as any).featured ? 'bg-amber-500' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${(formData as any).featured ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-400">Descrição (opcional)</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all min-h-[100px] resize-none"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descreva o que está incluso no serviço..."
                        />
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-slate-800">
                        <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancelar</Button>
                        <Button className="flex-1" type="submit" isLoading={loading}>
                            {editingService ? "Salvar Alterações" : "Criar Serviço"}
                        </Button>
                    </div>
                </form>

                <div className="hidden lg:block space-y-4">
                    <label className="text-sm font-medium text-slate-400">Imagem do Serviço</label>
                    <ImageUpload
                        value={(formData as any).image_url}
                        onChange={(url) => setFormData({ ...formData, image_url: url } as any)}
                        bucket="catalog"
                        folder="services"
                        aspectRatio="video"
                        description="Uma boa imagem atrai mais clientes."
                    />

                    <div className="mt-8">
                        <label className="text-sm font-medium text-slate-400 block mb-3">Prévia no Feed</label>
                        <Card className="overflow-hidden border-slate-800 bg-slate-900/40">
                            <div className="aspect-video w-full bg-slate-800 relative flex items-center justify-center overflow-hidden">
                                {(formData as any).image_url ? (
                                    <img src={(formData as any).image_url} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-slate-600">
                                        <Scissors size={48} className="opacity-20" />
                                        <span className="text-xs font-bold uppercase tracking-widest opacity-40">Sem Imagem</span>
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                    <Badge variant={formData.active ? 'success' : 'secondary'}>
                                        {formData.active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    {(formData as any).featured && (
                                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50">
                                            Em Destaque
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-white">{formData.name || 'Nome do Serviço'}</h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">{formData.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-500">R$ {formData.price.toFixed(2)}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{formData.duration} min</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
