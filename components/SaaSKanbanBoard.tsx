
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Layout,
  Tag
} from 'lucide-react';
import { Card, Badge, Button, Modal, Input, EmptyState } from './UI';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

type TaskStatus = 'TODO' | 'DOING' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
type TaskLabel = 'BUG' | 'FEATURE' | 'SUPPORT' | 'FINANCIAL';

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  label: TaskLabel;
  created_at: string;
}

const SaaSKanbanBoard: React.FC = () => {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<KanbanTask> | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saas_kanban_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar tarefas do Kanban:', err);
      addToast('Erro ao carregar Kanban.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask?.title) return;

    try {
      setLoading(true);
      if (editingTask.id) {
        const { error } = await supabase
          .from('saas_kanban_tasks')
          .update({
            title: editingTask.title,
            description: editingTask.description,
            priority: editingTask.priority,
            label: editingTask.label,
            status: editingTask.status || 'TODO'
          })
          .eq('id', editingTask.id);
        if (error) throw error;
        addToast('Tarefa atualizada!', 'success');
      } else {
        const { error } = await supabase
          .from('saas_kanban_tasks')
          .insert([{
            title: editingTask.title,
            description: editingTask.description,
            priority: editingTask.priority || 'MEDIUM',
            label: editingTask.label || 'FEATURE',
            status: 'TODO'
          }]);
        if (error) throw error;
        addToast('Tarefa criada!', 'success');
      }
      setIsModalOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err: any) {
      addToast('Erro ao salvar tarefa.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Deseja excluir esta tarefa?')) return;
    try {
      const { error } = await supabase.from('saas_kanban_tasks').delete().eq('id', id);
      if (error) throw error;
      addToast('Tarefa excluída.', 'info');
      fetchTasks();
    } catch (err) {
      addToast('Erro ao excluir.', 'error');
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      const { error } = await supabase
        .from('saas_kanban_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      addToast('Erro ao mover tarefa.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Drag and Drop Lógica
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      await updateTaskStatus(taskId, status);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'HIGH': return <Badge variant="danger">Alta</Badge>;
      case 'MEDIUM': return <Badge variant="warning">Recorrente</Badge>;
      case 'LOW': return <Badge variant="info">Baixa</Badge>;
    }
  };

  const getLabelBadge = (l: TaskLabel) => {
    const labels = {
      BUG: { color: '#ef4444', text: 'Bug' },
      FEATURE: { color: '#10b981', text: 'Melhoria' },
      SUPPORT: { color: '#a855f7', text: 'Suporte' },
      FINANCIAL: { color: '#f59e0b', text: 'Financeiro' }
    };
    const cfg = labels[l] || labels.FEATURE;
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-white/5 bg-white/5" style={{ color: cfg.color }}>
        {cfg.text}
      </span>
    );
  };

  const columns: { status: TaskStatus; label: string; icon: any; color: string }[] = [
    { status: 'TODO', label: 'A Fazer', icon: <Plus size={16} />, color: '#64748b' },
    { status: 'DOING', label: 'Em Progresso', icon: <Clock size={16} />, color: '#0ea5e9' },
    { status: 'DONE', label: 'Concluído', icon: <CheckCircle2 size={16} />, color: '#10b981' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Layout size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Board de Atividades SaaS</h2>
            <p className="text-xs text-slate-500">Gerencie o backlog e operações da plataforma.</p>
          </div>
        </div>
        <Button onClick={() => { setEditingTask({}); setIsModalOpen(true); }}>
          <Plus size={18} /> Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => (
          <div 
            key={col.status} 
            className="flex flex-col h-full min-h-[500px]"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.status)}
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="font-bold text-slate-400 text-sm uppercase tracking-widest">{col.label}</span>
                <Badge variant="secondary" className="ml-2 bg-slate-900 border-none">{tasks.filter(t => t.status === col.status).length}</Badge>
              </div>
            </div>

            <div className="flex-1 bg-slate-950/20 border border-slate-900 rounded-2xl p-4 space-y-4">
              {tasks.filter(t => t.status === col.status).length > 0 ? (
                tasks.filter(t => t.status === col.status).map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                    className={`group bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all ${updatingId === task.id ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        {getLabelBadge(task.label)}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                            <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="p-1 hover:bg-slate-800 rounded text-slate-500">
                                <Edit3 size={12} />
                            </button>
                            <button onClick={() => handleDeleteTask(task.id)} className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-500">
                                <Trash2 size={12} />
                            </button>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 line-clamp-2">{task.title}</h4>
                      {task.description && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Clock size={10} />
                            {new Date(task.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center py-10 opacity-30">
                  <span className="text-xs text-slate-600 font-bold uppercase tracking-widest italic">Vazio</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask?.id ? 'Editar Atividade' : 'Nova Atividade'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveTask} className="space-y-6">
          <Input 
            label="Título da Atividade"
            placeholder="Ex: Corrigir erro no webhook do Cakto"
            required
            value={editingTask?.title || ''}
            onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Descrição (Opcional)</label>
            <textarea
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              rows={3}
              value={editingTask?.description || ''}
              onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">Prioridade</label>
              <select
                 className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                 value={editingTask?.priority || 'MEDIUM'}
                 onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Crítica</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">Categoria</label>
              <select
                 className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none"
                 value={editingTask?.label || 'FEATURE'}
                 onChange={e => setEditingTask({ ...editingTask, label: e.target.value as TaskLabel })}
              >
                <option value="BUG">Bug</option>
                <option value="FEATURE">Melhoria</option>
                <option value="SUPPORT">Suporte</option>
                <option value="FINANCIAL">Financeiro</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" isLoading={loading}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SaaSKanbanBoard;
