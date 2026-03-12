
import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, GripVertical, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const MAX_IMAGES = 10;

export interface ProductImage {
    id?: string;          // uuid from DB (undefined if new/local-only)
    url: string;
    position: number;
}

interface MultiImageUploadProps {
    images: ProductImage[];
    onChange: (images: ProductImage[]) => void;
    folder?: string;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
    images,
    onChange,
    folder = 'products'
}) => {
    const { user, profile } = useAuth();
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        if (!user || !profile) { alert('Você deve estar logado para enviar imagens.'); return; }
        if (images.length >= MAX_IMAGES) { alert(`Limite de ${MAX_IMAGES} fotos atingido.`); return; }

        const files: File[] = (Array.from(event.target.files as FileList) as File[]).slice(0, MAX_IMAGES - images.length);
        const newImages: ProductImage[] = [...images];

        for (let i = 0; i < files.length; i++) {
            setUploadingIndex(newImages.length);
            try {
                const file: File = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${profile.tenant_id}/${folder}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('catalog')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('catalog')
                    .getPublicUrl(filePath);

                newImages.push({ url: publicUrl, position: newImages.length });
            } catch (err: any) {
                alert(`Erro ao enviar imagem: ${err.message}`);
            }
        }

        setUploadingIndex(null);
        onChange(newImages.map((img, idx) => ({ ...img, position: idx })));
        // Clear input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        const updated = images.filter((_, i) => i !== index)
            .map((img, idx) => ({ ...img, position: idx }));
        onChange(updated);
    };

    const setAsCover = (index: number) => {
        if (index === 0) return;
        const updated = [...images];
        const [moved] = updated.splice(index, 1);
        updated.unshift(moved);
        onChange(updated.map((img, idx) => ({ ...img, position: idx })));
    };

    // Drag & drop reorder
    const handleDragStart = (index: number) => { dragItem.current = index; };
    const handleDragEnter = (index: number) => { dragOverItem.current = index; };
    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const updated = [...images];
        const [dragged] = updated.splice(dragItem.current, 1);
        updated.splice(dragOverItem.current, 0, dragged);
        dragItem.current = null;
        dragOverItem.current = null;
        onChange(updated.map((img, idx) => ({ ...img, position: idx })));
    };

    const isLoading = uploadingIndex !== null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Fotos do Produto</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${images.length >= MAX_IMAGES ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                    {images.length}/{MAX_IMAGES}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {/* Existing images */}
                {images.map((img, index) => (
                    <div
                        key={img.url}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className="relative group aspect-square bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-800 hover:border-emerald-500/50 transition-all cursor-grab active:cursor-grabbing"
                    >
                        <img
                            src={img.url}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-full object-cover"
                        />

                        {/* Cover badge */}
                        {index === 0 && (
                            <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star size={8} fill="white" /> CAPA
                            </div>
                        )}

                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center gap-0.5 text-white/70">
                                <GripVertical size={14} />
                                <span className="text-[10px]">Arrastar</span>
                            </div>
                            {index !== 0 && (
                                <button
                                    type="button"
                                    onClick={() => setAsCover(index)}
                                    className="text-[9px] font-bold bg-emerald-500/80 text-white px-2 py-0.5 rounded-full hover:bg-emerald-500"
                                >
                                    Tornar capa
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Loading slot */}
                {isLoading && (
                    <div className="aspect-square bg-slate-900 rounded-xl border-2 border-slate-800 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    </div>
                )}

                {/* Add new slot */}
                {images.length < MAX_IMAGES && !isLoading && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="aspect-square bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-emerald-500 hover:border-emerald-500/50 transition-all"
                    >
                        <Upload size={20} />
                        <span className="text-[10px] font-bold">Adicionar</span>
                    </button>
                )}
            </div>

            {images.length > 0 && (
                <p className="text-[10px] text-slate-600 italic">
                    Arraste as fotos para reordenar. A primeira foto é a capa exibida na listagem.
                </p>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="image/*"
                multiple
                className="hidden"
            />
        </div>
    );
};
