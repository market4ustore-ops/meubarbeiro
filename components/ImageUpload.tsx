
import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './UI';
import { useAuth } from '../context/AuthContext';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    bucket: 'profiles' | 'catalog';
    folder?: string;
    label?: string;
    description?: string;
    aspectRatio?: 'square' | 'video' | 'portrait';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    bucket,
    folder = 'general',
    label,
    description,
    aspectRatio = 'square'
}) => {
    const { user, profile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Você deve selecionar uma imagem para enviar.');
            }

            if (!user || !profile) {
                throw new Error('Você deve estar logado para enviar imagens.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            // Path structure: tenant_id/folder/random_name.ext
            const filePath = `${profile.tenant_id}/${folder}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            setPreview(publicUrl);
            onChange(publicUrl);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setPreview(null);
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const ratioClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]'
    };

    return (
        <div className="space-y-4">
            {label && <label className="text-sm font-medium text-slate-400 block">{label}</label>}

            <div
                className={`relative group bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-emerald-500/50 ${ratioClasses[aspectRatio]}`}
            >
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                type="button"
                                className="h-8 text-xs"
                            >
                                Alterar
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={removeImage}
                                type="button"
                                className="h-8 w-8 !p-0"
                            >
                                <X size={14} />
                            </Button>
                        </div>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-emerald-500 transition-colors"
                    >
                        {uploading ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                            <>
                                <div className="p-4 bg-slate-800/50 rounded-full group-hover:bg-emerald-500/10 transition-colors">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div className="text-center">
                                    <span className="text-sm font-bold">Clique para enviar</span>
                                    {description && <p className="text-[10px] text-slate-600 mt-1">{description}</p>}
                                </div>
                            </>
                        )}
                    </button>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    accept="image/*"
                    className="hidden"
                />
            </div>
        </div>
    );
};
