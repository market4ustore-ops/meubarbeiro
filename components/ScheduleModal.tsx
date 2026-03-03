
import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from './UI';
import { Barber, BarberSchedule, Service } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { Clock, Check, X, Loader2 } from 'lucide-react';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    barber: Barber | null;
    tenantId: string | undefined;
}

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
    isOpen,
    onClose,
    barber,
    tenantId
}) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [schedules, setSchedules] = useState<BarberSchedule[]>([]);

    // Services/Specialties state
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [enabledServices, setEnabledServices] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'SCHEDULE' | 'SPECIALTIES'>('SCHEDULE');

    useEffect(() => {
        if (isOpen && barber) {
            if (tenantId) {
                fetchSchedules();
                fetchServices();
                fetchSpecialties();
            } else {
                console.error("ScheduleModal: tenantId is missing", { barber });
                // We could also try to construct defaults here if we really wanted to, but saving would fail.
            }
        }
    }, [isOpen, barber, tenantId]);

    const fetchSchedules = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('barber_schedules')
            .select('*')
            .eq('user_id', barber?.id)
            .eq('tenant_id', tenantId);

        if (data) {
            // Fill missing days with defaults
            const completeSchedules = DAYS_OF_WEEK.map(day => {
                const existing = data.find(s => s.day === day);
                return existing || {
                    id: `temp-${day}`,
                    tenant_id: tenantId!,
                    user_id: barber!.id,
                    day,
                    is_working: true,
                    start_time: '09:00',
                    end_time: '18:00',
                    lunch_start: '12:00',
                    lunch_end: '13:00'
                } as BarberSchedule;
            });
            setSchedules(completeSchedules);
        }
        setLoading(false);
    };

    const fetchServices = async () => {
        const { data } = await supabase.from('services').select('*').eq('tenant_id', tenantId).eq('active', true);
        if (data) setAllServices(data);
    };

    const fetchSpecialties = async () => {
        const { data } = await supabase
            .from('barber_services')
            .select('service_id')
            .eq('user_id', barber?.id);

        if (data) {
            setEnabledServices(data.map(d => d.service_id));
        }
    };

    const handleScheduleChange = (index: number, field: keyof BarberSchedule, value: any) => {
        const newSchedules = [...schedules];
        newSchedules[index] = { ...newSchedules[index], [field]: value };
        setSchedules(newSchedules);
    };

    const saveSchedules = async () => {
        setLoading(true);
        try {
            const upsertData = schedules.map(({ id, ...rest }) => {
                if (id.startsWith('temp-')) return rest;
                return { id, ...rest };
            });

            const { error } = await supabase
                .from('barber_schedules')
                .upsert(upsertData, { onConflict: 'user_id,day' });

            if (error) throw error;
            addToast('Horários atualizados!', 'success');
        } catch (err: any) {
            console.error(err);
            addToast('Erro ao salvar horários.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleSpecialty = async (serviceId: string) => {
        const isEnabled = enabledServices.includes(serviceId);

        if (isEnabled) {
            const { error } = await supabase
                .from('barber_services')
                .delete()
                .eq('user_id', barber?.id)
                .eq('service_id', serviceId);

            if (!error) setEnabledServices(prev => prev.filter(id => id !== serviceId));
        } else {
            const { error } = await supabase
                .from('barber_services')
                .insert({
                    tenant_id: tenantId,
                    user_id: barber?.id,
                    service_id: serviceId
                });

            if (!error) setEnabledServices(prev => [...prev, serviceId]);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Gerenciar: ${barber?.name}`}
            maxWidth="max-w-3xl"
        >
            <div className="flex gap-4 mb-6 border-b border-slate-800">
                <button
                    onClick={() => setViewMode('SCHEDULE')}
                    className={`pb-2 px-4 text-sm font-bold transition-all ${viewMode === 'SCHEDULE' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}
                >
                    Horários de Trabalho
                </button>
                <button
                    onClick={() => setViewMode('SPECIALTIES')}
                    className={`pb-2 px-4 text-sm font-bold transition-all ${viewMode === 'SPECIALTIES' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}
                >
                    Especialidades
                </button>
            </div>

            {viewMode === 'SCHEDULE' ? (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {!tenantId && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-center">
                            Erro: Identificação da barbearia não encontrada. Tente recarregar a página.
                        </div>
                    )}

                    {schedules.length === 0 && !loading && tenantId && (
                        <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-50" />
                            <p>Carregando horários...</p>
                        </div>
                    )}

                    {schedules.map((schedule, index) => (
                        <div key={schedule.day} className={`p-4 rounded-xl border ${schedule.is_working ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-bold text-white w-24">{schedule.day}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 uppercase">{schedule.is_working ? 'Trabalha' : 'Folga'}</span>
                                    <button
                                        onClick={() => handleScheduleChange(index, 'is_working', !schedule.is_working)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${schedule.is_working ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${schedule.is_working ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {schedule.is_working && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Entrada</label>
                                        <input
                                            type="time"
                                            value={schedule.start_time}
                                            onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Saída</label>
                                        <input
                                            type="time"
                                            value={schedule.end_time}
                                            onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Início Almoço</label>
                                        <input
                                            type="time"
                                            value={schedule.lunch_start || ''}
                                            onChange={(e) => handleScheduleChange(index, 'lunch_start', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Fim Almoço</label>
                                        <input
                                            type="time"
                                            value={schedule.lunch_end || ''}
                                            onChange={(e) => handleScheduleChange(index, 'lunch_end', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="sticky bottom-0 bg-slate-950 pt-4 border-t border-slate-800">
                        <Button className="w-full" onClick={saveSchedules} isLoading={loading} disabled={!tenantId}>Salvar Horários</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800">
                        Selecione os serviços que <strong>{barber?.name}</strong> está apto a realizar. Apenas estes serviços aparecerão para agendamento com este profissional.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
                        {allServices.map(service => {
                            const isEnabled = enabledServices.includes(service.id);
                            return (
                                <div
                                    key={service.id}
                                    onClick={() => toggleSpecialty(service.id)}
                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isEnabled ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                >
                                    <div>
                                        <p className={`font-bold text-sm ${isEnabled ? 'text-emerald-400' : 'text-slate-300'}`}>{service.name}</p>
                                        <p className="text-xs text-slate-500">{service.category}</p>
                                    </div>
                                    {isEnabled ? (
                                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                            <Check size={14} />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-slate-700" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Modal>
    );
};
