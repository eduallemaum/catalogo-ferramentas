import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Ferramenta } from '../types';
import { Loader2, PackageOpen, Trash2, Edit2, Info, Calendar, User, Tag, Hammer, History, ChevronRight, X, Image as ImageIcon, FileText, CheckSquare, Square, Printer, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LabelGenerator from './LabelGenerator';

interface ToolListProps {
  onEdit: (tool: Ferramenta) => void;
}

export default function ToolList({ onEdit }: ToolListProps) {
  const [tools, setTools] = useState<Ferramenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<Ferramenta | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLabelGenOpen, setIsLabelGenOpen] = useState(false);
  const { isAdmin } = useAuth();

  const handleShareTool = async (e: React.MouseEvent, tool: Ferramenta) => {
    e.stopPropagation();
    const toolUrl = `${window.location.origin}?id=${tool.id}`;
    const shareData = {
      title: `Ferramenta: ${tool.nome}`,
      text: `Veja os detalhes desta ferramenta no meu catálogo: ${tool.nome}`,
      url: toolUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Erro ao compartilhar ferramenta:', err);
    }
  };

  const fetchTools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ferramentas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (err: any) {
      console.error('Error fetching tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTool = async (id: string, fotos: string[]) => {
    if (!isAdmin) return;
    if (!confirm('Tem certeza que deseja excluir esta ferramenta e todas as suas fotos?')) return;

    try {
      // Delete from DB first to ensure it's removed even if storage fails
      const { error: dbError } = await supabase
        .from('ferramentas')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Try to delete from storage but don't block or fail if it doesn't work
      if (fotos && fotos.length > 0) {
        const paths = fotos
          .filter(url => url && typeof url === 'string' && url.includes('ferramentas/'))
          .map(url => {
            const parts = url.split('/');
            return `ferramentas/${parts[parts.length - 1]}`;
          });
        
        if (paths.length > 0) {
          supabase.storage.from('ferramentas-fotos').remove(paths).catch(err => {
            console.warn('Storage deletion failed for tool:', id, err);
          });
        }
      }

      setTools(tools.filter(t => t.id !== id));
      setSelectedTool(null);
    } catch (err: any) {
      console.error('Error deleting tool:', err);
      alert('Erro ao excluir ferramenta.');
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const generatePDF = () => {
    const selectedTools = tools.filter(t => selectedIds.includes(t.id));
    if (selectedTools.length === 0) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('Relatório de Restauração', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Catálogo de Ferramentas - Oficina Digital', 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);

    const tableData = selectedTools.map(t => [
      t.nome,
      t.marca || 'N/A',
      t.modelo || 'N/A',
      t.categoria,
      t.estado_atual,
      t.historico_restauracao || 'Nenhum histórico registrado.'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Nome', 'Marca', 'Modelo', 'Categoria', 'Estado', 'Descrição do que foi feito']],
      body: tableData,
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 40 },
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      columnStyles: {
        5: { cellWidth: 60 } // Wider column for history
      }
    });

    doc.save(`Relatorio_Restauração_${Date.now()}.pdf`);
  };

  useEffect(() => {
    fetchTools();
    
    // Check for ID in URL to auto-open tool details
    const params = new URLSearchParams(window.location.search);
    const toolId = params.get('id');
    
    const channel = supabase
      .channel('ferramentas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ferramentas' }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          fetchTools();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Separate effect to handle auto-opening once tools are loaded
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolId = params.get('id');
    if (toolId && tools.length > 0) {
      const tool = tools.find(t => t.id === toolId);
      if (tool) {
        setSelectedTool(tool);
        // Clear param without refreshing
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [tools]);

  if (loading && tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-brand-400">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-medium">Carregando catálogo...</p>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mb-6 text-brand-300">
          <PackageOpen size={40} />
        </div>
        <h3 className="text-xl font-bold text-brand-900 mb-2">Catálogo Vazio</h3>
        <p className="text-brand-500 max-w-xs">
          Nenhuma ferramenta cadastrada no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Selection Toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-brand-900 text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg sticky top-24 z-20"
          >
            <div className="flex items-center gap-4">
              <div className="bg-accent-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-black">
                {selectedIds.length}
              </div>
              <span className="text-sm font-bold hidden sm:inline">Ferramentas selecionadas</span>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-xs font-bold text-brand-400 hover:text-white transition-colors uppercase tracking-widest"
              >
                Limpar
              </button>
            </div>
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-md active:scale-95"
            >
              <FileText size={18} />
              Gerar Relatório PDF
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {tools.map((tool) => (
            <motion.div
              key={tool.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setSelectedTool(tool)}
              className="card group cursor-pointer hover:shadow-md transition-shadow relative"
            >
              {/* Selection Checkbox */}
              <button
                onClick={(e) => toggleSelect(e, tool.id)}
                className={`absolute top-4 right-4 z-10 p-2 rounded-lg transition-all ${
                  selectedIds.includes(tool.id) 
                    ? 'bg-accent-600 text-white scale-110' 
                    : 'bg-white/80 backdrop-blur-sm text-brand-300 opacity-0 group-hover:opacity-100 hover:text-brand-500'
                }`}
              >
                {selectedIds.includes(tool.id) ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>

              <div className="aspect-video relative overflow-hidden">
                {tool.foto_url ? (
                  <img
                    src={tool.foto_url}
                    alt={tool.nome}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-brand-50 flex items-center justify-center text-brand-200">
                    <ImageIcon size={48} />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-brand-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    {tool.categoria}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className={`px-3 py-1 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full ${
                    tool.estado_atual === 'Pronta/Finalizada' ? 'bg-green-600/80' : 'bg-brand-600/80'
                  }`}>
                    {tool.estado_atual}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-lg font-bold text-brand-900">{tool.nome}</h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleShareTool(e, tool)}
                      className="p-2 text-brand-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-all"
                      title="Compartilhar Ferramenta"
                    >
                      <Share2 size={18} />
                    </button>
                    <ChevronRight size={18} className="text-brand-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                </div>
                <p className="text-brand-500 text-xs font-bold uppercase tracking-wider mb-3">
                  {tool.marca} {tool.modelo && `• ${tool.modelo}`}
                </p>
                <p className="text-brand-600 text-sm line-clamp-2 mb-4">{tool.descricao}</p>
                
                <div className="pt-4 border-t border-brand-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand-400">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {new Date(tool.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-300" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTool(null)}
              className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-brand-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-brand-100 p-3 rounded-2xl text-brand-700">
                    <Hammer size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-brand-900 tracking-tight">{selectedTool.nome}</h3>
                    <p className="text-xs font-bold text-brand-500 uppercase tracking-widest">
                      {selectedTool.marca} {selectedTool.modelo && `• ${selectedTool.modelo}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setIsLabelGenOpen(true)}
                        className="p-3 text-accent-600 hover:bg-accent-50 rounded-xl transition-colors"
                        title="Gerar Etiqueta"
                      >
                        <Printer size={20} />
                      </button>
                      <button
                        onClick={() => {
                          onEdit(selectedTool);
                          setSelectedTool(null);
                        }}
                        className="p-3 text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => deleteTool(selectedTool.id, [...selectedTool.fotos_antes, ...selectedTool.fotos_depois])}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedTool(null)}
                    className="p-3 text-brand-400 hover:bg-brand-50 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-6 md:col-span-2">
                    <section className="space-y-3">
                      <h4 className="flex items-center gap-2 text-sm font-black text-brand-900 uppercase tracking-widest">
                        <Info size={16} className="text-brand-400" /> Descrição
                      </h4>
                      <p className="text-brand-700 leading-relaxed">{selectedTool.descricao}</p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="flex items-center gap-2 text-sm font-black text-brand-900 uppercase tracking-widest">
                        <History size={16} className="text-brand-400" /> Histórico de Restauração
                      </h4>
                      <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100">
                        <p className="text-brand-700 whitespace-pre-wrap italic">
                          {selectedTool.historico_restauracao || 'Nenhum histórico registrado.'}
                        </p>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-brand-900 text-white p-6 rounded-3xl space-y-4 shadow-lg">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Estado Atual</p>
                        <p className="text-lg font-bold">{selectedTool.estado_atual}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Categoria</p>
                        <p className="text-lg font-bold">{selectedTool.categoria}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Nº de Série</p>
                        <p className="text-lg font-bold">{selectedTool.numero_serie || 'N/A'}</p>
                      </div>
                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <User size={14} className="text-brand-400" />
                          <span className="text-brand-200">Ex-dono:</span>
                          <span className="font-bold">{selectedTool.proprietario_anterior || 'Desconhecido'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Tag size={14} className="text-brand-400" />
                          <span className="text-brand-200">Recebido:</span>
                          <span className="font-bold">{selectedTool.estado_recebimento || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media Sections */}
                <div className="space-y-12">
                  {/* Antes */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h4 className="text-sm font-black text-brand-900 uppercase tracking-widest">Fotos 'Antes'</h4>
                      <div className="h-px flex-1 bg-brand-100" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {selectedTool.fotos_antes?.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-2xl overflow-hidden border border-brand-100 group">
                          {url && (
                            <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                          )}
                        </a>
                      ))}
                      {(!selectedTool.fotos_antes || selectedTool.fotos_antes.length === 0) && (
                        <div className="col-span-full py-12 bg-brand-50 rounded-3xl flex flex-col items-center justify-center text-brand-300">
                          <ImageIcon size={32} className="mb-2 opacity-20" />
                          <p className="text-xs font-bold uppercase tracking-widest">Sem fotos do registro inicial</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Depois */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h4 className="text-sm font-black text-brand-900 uppercase tracking-widest">Fotos 'Depois'</h4>
                      <div className="h-px flex-1 bg-brand-100" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {selectedTool.fotos_depois?.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-2xl overflow-hidden border border-brand-100 group">
                          {url && (
                            <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                          )}
                        </a>
                      ))}
                      {(!selectedTool.fotos_depois || selectedTool.fotos_depois.length === 0) && (
                        <div className="col-span-full py-12 bg-brand-50 rounded-3xl flex flex-col items-center justify-center text-brand-300">
                          <ImageIcon size={32} className="mb-2 opacity-20" />
                          <p className="text-xs font-bold uppercase tracking-widest">Sem fotos do resultado final</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Label Generator Modal */}
      <AnimatePresence>
        {isLabelGenOpen && selectedTool && (
          <LabelGenerator 
            tool={selectedTool} 
            onClose={() => setIsLabelGenOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
