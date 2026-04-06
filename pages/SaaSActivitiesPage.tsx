
import React from 'react';
import { CheckSquare } from 'lucide-react';
import SaaSKanbanBoard from '../components/SaaSKanbanBoard';

const SaaSActivitiesPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CheckSquare className="text-emerald-500" /> Atividades e Operações
          </h1>
          <p className="text-slate-400">Gerencie o backlog, bugs e suporte da plataforma MeuBarbeiro.</p>
        </div>
      </div>

      <SaaSKanbanBoard />
    </div>
  );
};

export default SaaSActivitiesPage;
