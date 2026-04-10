import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, X, Square, CheckSquare } from 'lucide-react';
import { Ferramenta } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LabelGeneratorProps {
  tool: Ferramenta;
  onClose: () => void;
}

type LabelSize = 'A' | 'B';

export default function LabelGenerator({ tool, onClose }: LabelGeneratorProps) {
  const [size, setSize] = useState<LabelSize>('B');
  const labelRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const qrUrl = `${window.location.origin}?id=${tool.id}`;

  const downloadLabel = async () => {
    if (!labelRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(labelRef.current, {
        scale: 4, // Higher scale for better print quality
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `Etiqueta_${tool.nome.replace(/\s+/g, '_')}_${size}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating label:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-950/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-brand-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-brand-900 uppercase tracking-tight">Gerador de Etiqueta</h3>
            <p className="text-xs font-bold text-brand-500 uppercase tracking-widest">Niimbot B1 / Térmica</p>
          </div>
          <button onClick={onClose} className="p-2 text-brand-400 hover:text-brand-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Size Selector */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSize('A')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${
                size === 'A' ? 'border-accent-600 bg-accent-50' : 'border-brand-100 hover:border-brand-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest">Opção A</span>
                {size === 'A' ? <CheckSquare size={18} className="text-accent-600" /> : <Square size={18} className="text-brand-300" />}
              </div>
              <p className="text-sm font-bold text-brand-900">50 x 15 mm</p>
              <p className="text-[10px] text-brand-500 font-medium">Layout Compacto</p>
            </button>

            <button
              onClick={() => setSize('B')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${
                size === 'B' ? 'border-accent-600 bg-accent-50' : 'border-brand-100 hover:border-brand-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest">Opção B</span>
                {size === 'B' ? <CheckSquare size={18} className="text-accent-600" /> : <Square size={18} className="text-brand-300" />}
              </div>
              <p className="text-sm font-bold text-brand-900">50 x 30 mm</p>
              <p className="text-[10px] text-brand-500 font-medium">Layout Completo</p>
            </button>
          </div>

          {/* Preview Area */}
          <div className="bg-brand-50 p-12 rounded-[32px] flex items-center justify-center border-2 border-dashed border-brand-200">
            <div 
              ref={labelRef}
              className={`bg-white shadow-sm flex items-center overflow-hidden text-black font-sans ${
                size === 'A' ? 'w-[189px] h-[57px] p-1' : 'w-[189px] h-[113px] p-2'
              }`}
              style={{ width: size === 'A' ? '189px' : '189px', height: size === 'A' ? '57px' : '113px' }}
            >
              {size === 'A' ? (
                <div className="flex w-full h-full items-center gap-1">
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[10px] font-black leading-tight truncate uppercase">{tool.nome}</p>
                    <p className="text-[8px] font-bold leading-tight truncate text-gray-700">{tool.modelo || tool.marca || ''}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <QRCodeCanvas value={qrUrl} size={45} level="M" />
                  </div>
                </div>
              ) : (
                <div className="flex w-full h-full gap-2">
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <p className="text-[11px] font-black leading-tight uppercase line-clamp-2">{tool.nome}</p>
                      <p className="text-[9px] font-bold leading-tight text-gray-700 mt-0.5">{tool.modelo || tool.marca || ''}</p>
                    </div>
                    {tool.numero_serie && (
                      <p className="text-[7px] font-black tracking-wider uppercase text-gray-500">S/N: {tool.numero_serie}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center">
                    <QRCodeCanvas value={qrUrl} size={85} level="H" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={downloadLabel}
            disabled={isGenerating}
            className="w-full btn-primary py-4 text-lg"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">Gerando...</span>
            ) : (
              <span className="flex items-center gap-2">
                <Download size={20} /> Baixar Etiqueta (PNG)
              </span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
