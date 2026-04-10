import { useState, FormEvent, useEffect, useRef, ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, Loader2, Save, X, Plus, Trash2, ChevronRight, ChevronLeft, Hammer, History, Image as ImageIcon, Info, Settings, Printer, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Ferramenta, Categoria } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

interface AddToolFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  toolToEdit?: Ferramenta;
}

type FormTab = 'identificacao' | 'situacao' | 'midia';

export default function AddToolForm({ onSuccess, onCancel, toolToEdit }: AddToolFormProps) {
  const [activeTab, setActiveTab] = useState<FormTab>('identificacao');
  
  // Block 1: Identificação
  const [nome, setNome] = useState(toolToEdit?.nome || '');
  const [marca, setMarca] = useState(toolToEdit?.marca || '');
  const [modelo, setModelo] = useState(toolToEdit?.modelo || '');
  const [numeroSerie, setNumeroSerie] = useState(toolToEdit?.numero_serie || '');
  const [descricao, setDescricao] = useState(toolToEdit?.descricao || '');
  const [categoria, setCategoria] = useState(toolToEdit?.categoria || 'Outros');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Block 2: Situação
  const [estadoRecebimento, setEstadoRecebimento] = useState(toolToEdit?.estado_recebimento || '');
  const [proprietarioAnterior, setProprietarioAnterior] = useState(toolToEdit?.proprietario_anterior || '');
  const [estadoAtual, setEstadoAtual] = useState(toolToEdit?.estado_atual || 'Na Fila');
  const [historicoRestauracao, setHistoricoRestauracao] = useState(toolToEdit?.historico_restauracao || '');
  const [statusOptions, setStatusOptions] = useState(['Na Fila', 'Em Limpeza', 'Em Restauração', 'Pronta/Finalizada']);
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  // Block 3: Mídia
  const [fotosAntes, setFotosAntes] = useState<{file?: File, url: string}[]>(
    toolToEdit?.fotos_antes?.map(url => ({ url })) || []
  );
  const [fotosDepois, setFotosDepois] = useState<{file?: File, url: string}[]>(
    toolToEdit?.fotos_depois?.map(url => ({ url })) || []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputAntesRef = useRef<HTMLInputElement>(null);
  const fileInputDepoisRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategorias();
    // Load custom status from local storage if any
    const savedStatus = localStorage.getItem('marcenaria_status_options');
    if (savedStatus) {
      setStatusOptions(JSON.parse(savedStatus));
    }
  }, []);

  const fetchCategorias = async () => {
    const { data, error } = await supabase.from('categorias').select('*').order('nome');
    if (data) setCategorias(data);
    else if (error) console.error('Error fetching categories:', error);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert([{ nome: newCategoryName.trim() }])
        .select();
      if (error) throw error;
      if (data) {
        setCategorias([...categorias, data[0]]);
        setCategoria(data[0].nome);
        setNewCategoryName('');
        setIsAddingCategory(false);
      }
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleAddStatus = (newStatus: string) => {
    if (!newStatus.trim() || statusOptions.includes(newStatus)) return;
    const updated = [...statusOptions, newStatus.trim()];
    setStatusOptions(updated);
    localStorage.setItem('marcenaria_status_options', JSON.stringify(updated));
  };

  const handleRemoveStatus = (statusToRemove: string) => {
    const updated = statusOptions.filter(s => s !== statusToRemove);
    setStatusOptions(updated);
    localStorage.setItem('marcenaria_status_options', JSON.stringify(updated));
    if (estadoAtual === statusToRemove) setEstadoAtual(updated[0] || '');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'antes' | 'depois') => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).map(file => ({
      file,
      url: URL.createObjectURL(file as Blob)
    }));

    if (type === 'antes') {
      setFotosAntes([...fotosAntes, ...newPhotos]);
    } else {
      setFotosDepois([...fotosDepois, ...newPhotos]);
    }
  };

  const removePhoto = (index: number, type: 'antes' | 'depois') => {
    if (type === 'antes') {
      const updated = [...fotosAntes];
      updated.splice(index, 1);
      setFotosAntes(updated);
    } else {
      const updated = [...fotosDepois];
      updated.splice(index, 1);
      setFotosDepois(updated);
    }
  };

  const uploadPhotos = async (photos: {file?: File, url: string}[]) => {
    const urls: string[] = [];
    for (const photo of photos) {
      if (photo.file) {
        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `ferramentas/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('ferramentas-fotos')
          .upload(filePath, photo.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ferramentas-fotos')
          .getPublicUrl(filePath);
        
        urls.push(publicUrl);
      } else {
        urls.push(photo.url);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome) {
      setError('O nome da ferramenta é obrigatório.');
      setActiveTab('identificacao');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const urlsAntes = await uploadPhotos(fotosAntes);
      const urlsDepois = await uploadPhotos(fotosDepois);
      
      // Main preview photo: first of 'after', or first of 'before'
      const mainFotoUrl = urlsDepois[0] || urlsAntes[0] || '';

      const toolData = {
        nome,
        marca,
        modelo,
        numero_serie: numeroSerie,
        descricao,
        categoria,
        estado_recebimento: estadoRecebimento,
        proprietario_anterior: proprietarioAnterior,
        estado_atual: estadoAtual,
        historico_restauracao: historicoRestauracao,
        fotos_antes: urlsAntes,
        fotos_depois: urlsDepois,
        foto_url: mainFotoUrl,
      };

      if (toolToEdit) {
        const { error: dbError } = await supabase
          .from('ferramentas')
          .update(toolData)
          .eq('id', toolToEdit.id);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('ferramentas')
          .insert([toolData]);
        if (dbError) throw dbError;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving tool:', err);
      setError(err.message || 'Erro ao salvar ferramenta. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintLabel = () => {
    const qrCanvas = qrRef.current?.querySelector('canvas');
    if (!qrCanvas) return;
    
    const qrDataUrl = qrCanvas.toDataURL();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta - ${nome}</title>
          <style>
            body { 
              font-family: 'Inter', sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0;
              text-align: center;
            }
            .label-container {
              border: 2px solid #000;
              padding: 20px;
              border-radius: 10px;
              width: 300px;
            }
            img { width: 150px; height: 150px; margin-bottom: 10px; }
            h1 { margin: 5px 0; font-size: 18px; font-weight: 900; text-transform: uppercase; }
            p { margin: 0; font-size: 14px; color: #666; font-weight: bold; }
            @media print {
              body { height: auto; }
              .label-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <img src="${qrDataUrl}" />
            <h1>${nome}</h1>
            <p>${modelo || marca || ''}</p>
            ${numeroSerie ? `<p style="font-size: 10px; margin-top: 5px;">S/N: ${numeroSerie}</p>` : ''}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const tabs = [
    { id: 'identificacao', label: 'Identificação', icon: Hammer },
    { id: 'situacao', label: 'Situação', icon: History },
    { id: 'midia', label: 'Mídia', icon: ImageIcon },
  ];

  const qrValue = toolToEdit?.id || numeroSerie || nome;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-900">
          {toolToEdit ? 'Editar Ferramenta' : 'Nova Ferramenta'}
        </h2>
        <button onClick={onCancel} className="p-2 text-brand-400 hover:text-brand-600">
          <X size={24} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex p-1 bg-brand-100 rounded-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FormTab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-brand-900 shadow-sm' 
                : 'text-brand-500 hover:text-brand-700'
            }`}
          >
            <tab.icon size={18} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'identificacao' && (
            <motion.div
              key="identificacao"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Nome da Ferramenta</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="input-field"
                    placeholder="Ex: Plaina Manual No. 4"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Marca / Fabricante</label>
                  <input
                    type="text"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="input-field"
                    placeholder="Ex: Stanley"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Modelo</label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="input-field"
                    placeholder="Ex: Bailey"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Número de Série</label>
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    className="input-field"
                    placeholder="Ex: SN-123456"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Categoria</label>
                  <div className="flex gap-2">
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="input-field flex-1"
                    >
                      <option value="Corte">Corte</option>
                      <option value="Medição">Medição</option>
                      <option value="Percussão">Percussão</option>
                      <option value="Aperto">Aperto</option>
                      <option value="Outros">Outros</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="p-3 bg-brand-200 text-brand-700 rounded-xl hover:bg-brand-300 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Identificação QR</label>
                  <div className="bg-brand-50 p-4 rounded-2xl border border-brand-200 flex items-center gap-4">
                    <div ref={qrRef} className="bg-white p-2 rounded-lg shadow-sm">
                      <QRCodeCanvas 
                        value={qrValue} 
                        size={80}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-2">QR Code Gerado</p>
                      <button
                        type="button"
                        onClick={handlePrintLabel}
                        className="flex items-center gap-2 text-xs font-black text-accent-700 hover:text-accent-800 transition-colors uppercase tracking-widest"
                      >
                        <Printer size={14} /> Imprimir Etiqueta
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Descrição Geral</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="input-field min-h-[100px]"
                  placeholder="Características, materiais, curiosidades..."
                />
              </div>

              {isAddingCategory && (
                <div className="p-4 bg-brand-100 rounded-2xl flex gap-2 items-center">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nova categoria..."
                    className="input-field flex-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="btn-primary py-2 px-4"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="p-2 text-brand-400"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'situacao' && (
            <motion.div
              key="situacao"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Estado de Recebimento</label>
                  <input
                    type="text"
                    value={estadoRecebimento}
                    onChange={(e) => setEstadoRecebimento(e.target.value)}
                    className="input-field"
                    placeholder="Ex: Muita ferrugem, cabo quebrado"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Proprietário Anterior</label>
                  <input
                    type="text"
                    value={proprietarioAnterior}
                    onChange={(e) => setProprietarioAnterior(e.target.value)}
                    className="input-field"
                    placeholder="Ex: Sr. João (Feira de Antiguidades)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Estado Atual</label>
                  <div className="flex gap-2">
                    <select
                      value={estadoAtual}
                      onChange={(e) => setEstadoAtual(e.target.value)}
                      className="input-field flex-1"
                    >
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsEditingStatus(!isEditingStatus)}
                      className="p-3 bg-brand-200 text-brand-700 rounded-xl hover:bg-brand-300 transition-all"
                    >
                      <Settings size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {isEditingStatus && (
                <div className="p-6 bg-brand-100 rounded-3xl space-y-4">
                  <h4 className="text-sm font-bold text-brand-900">Configurar Estados</h4>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map(opt => (
                      <div key={opt} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-brand-200">
                        <span className="text-sm font-medium">{opt}</span>
                        <button onClick={() => handleRemoveStatus(opt)} className="text-red-400 hover:text-red-600">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Novo estado..."
                      className="input-field flex-1 py-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStatus(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Histórico da Restauração</label>
                <textarea
                  value={historicoRestauracao}
                  onChange={(e) => setHistoricoRestauracao(e.target.value)}
                  className="input-field min-h-[150px]"
                  placeholder="Descreva o que foi feito: limpeza, afiação, pintura, substituição de peças..."
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'midia' && (
            <motion.div
              key="midia"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-8"
            >
              {/* Fotos Antes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Fotos 'Antes'</label>
                  <button
                    type="button"
                    onClick={() => fileInputAntesRef.current?.click()}
                    className="flex items-center gap-2 text-brand-700 font-bold text-sm hover:text-brand-900"
                  >
                    <Plus size={18} /> Adicionar
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputAntesRef}
                  onChange={(e) => handleFileChange(e, 'antes')}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {fotosAntes.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-brand-200 group">
                      <img src={photo.url} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx, 'antes')}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full shadow-lg transition-transform active:scale-90"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {fotosAntes.length === 0 && (
                    <div className="col-span-full py-8 border-2 border-dashed border-brand-200 rounded-2xl flex flex-col items-center justify-center text-brand-400">
                      <ImageIcon size={32} className="mb-2 opacity-20" />
                      <p className="text-xs font-medium">Nenhuma foto do 'antes'</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fotos Depois */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-widest">Fotos 'Depois'</label>
                  <button
                    type="button"
                    onClick={() => fileInputDepoisRef.current?.click()}
                    className="flex items-center gap-2 text-brand-700 font-bold text-sm hover:text-brand-900"
                  >
                    <Plus size={18} /> Adicionar
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputDepoisRef}
                  onChange={(e) => handleFileChange(e, 'depois')}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {fotosDepois.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-brand-200 group">
                      <img src={photo.url} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx, 'depois')}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full shadow-lg transition-transform active:scale-90"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {fotosDepois.length === 0 && (
                    <div className="col-span-full py-8 border-2 border-dashed border-brand-200 rounded-2xl flex flex-col items-center justify-center text-brand-400">
                      <ImageIcon size={32} className="mb-2 opacity-20" />
                      <p className="text-xs font-medium">Nenhuma foto do 'depois'</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-3">
            <Info size={18} />
            {error}
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t border-brand-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn-secondary"
            disabled={isSaving}
          >
            Cancelar
          </button>
          
          {activeTab !== 'midia' ? (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'identificacao' ? 'situacao' : 'midia')}
              className="flex-1 btn-primary"
            >
              Próximo <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 btn-primary bg-green-700 hover:bg-green-800"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {toolToEdit ? 'Atualizar' : 'Finalizar'}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
