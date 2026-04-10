import { useState } from 'react';
import { Plus, Hammer, Settings, Search, LayoutGrid, LogIn, LogOut, User as UserIcon, Share2 } from 'lucide-react';
import ToolList from './components/ToolList';
import AddToolForm from './components/AddToolForm';
import LoginForm from './components/LoginForm';
import { useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Ferramenta } from './types';

export default function App() {
  const [isAdding, setIsAdding] = useState(false);
  const [toolToEdit, setToolToEdit] = useState<Ferramenta | undefined>(undefined);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user, isAdmin, signOut, loading } = useAuth();
  
  const handleShareCatalog = async () => {
    const shareData = {
      title: 'Stein und Fass - Catálogo de Ferramentas',
      text: 'Olá! Confira meu catálogo de ferramentas Stein und Fass:',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    }
  };

  const handleEdit = (tool: Ferramenta) => {
    setToolToEdit(tool);
    setIsAdding(true);
  };

  const handleCloseForm = () => {
    setIsAdding(false);
    setToolToEdit(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-brand-800"
        >
          <Hammer size={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-brand-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-brand-900 p-2 rounded-xl text-white">
            <Hammer size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-brand-950 tracking-tight uppercase">
              Catálogo de <span className="text-accent-600">Ferramentas</span>
            </h1>
            <p className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.2em] -mt-1">
              Oficina Digital
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShareCatalog}
            className="p-2 text-brand-600 hover:bg-brand-50 rounded-xl transition-colors flex items-center gap-2"
            title="Compartilhar Catálogo"
          >
            <Share2 size={20} />
            <span className="hidden md:inline text-sm font-bold">Compartilhar</span>
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-brand-900">{user.email}</span>
                {isAdmin && <span className="text-[9px] font-black text-accent-600 uppercase tracking-widest">Administrador</span>}
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2 text-brand-400 hover:text-red-500 transition-colors flex items-center gap-2"
                title="Sair"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline text-sm font-bold">Sair</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="btn-secondary py-2 px-4 text-sm"
            >
              <LogIn size={18} />
              Entrar
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 pb-32">
        <AnimatePresence mode="wait">
          {isAdding && isAdmin ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[40px] shadow-xl border border-brand-100"
            >
              <AddToolForm 
                onSuccess={handleCloseForm} 
                onCancel={handleCloseForm}
                toolToEdit={toolToEdit}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-black text-brand-900 tracking-tight">Inventário</h2>
                  <p className="text-brand-500 font-medium">Organize e catalogue suas ferramentas</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-brand-100 p-1 rounded-xl">
                  <button className="p-2 bg-white shadow-sm rounded-lg text-brand-900">
                    <LayoutGrid size={18} />
                  </button>
                </div>
              </div>

              <ToolList onEdit={handleEdit} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button - Only for Admin */}
      {!isAdding && isAdmin && (
        <motion.button
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-brand-900 text-white rounded-2xl shadow-2xl flex items-center justify-center z-40 group"
        >
          <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
        </motion.button>
      )}

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginOpen(false)}
              className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="relative w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl border border-brand-100"
            >
              <LoginForm onClose={() => setIsLoginOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-brand-100 px-8 py-4 flex justify-between items-center z-30">
        <button className="text-brand-900 flex flex-col items-center gap-1">
          <LayoutGrid size={20} />
          <span className="text-[10px] font-bold uppercase">Ferramentas</span>
        </button>
        <div className="w-12" /> {/* Space for FAB */}
        <button 
          onClick={() => !user && setIsLoginOpen(true)}
          className={`${user ? 'text-brand-900' : 'text-brand-400'} flex flex-col items-center gap-1`}
        >
          <UserIcon size={20} />
          <span className="text-[10px] font-bold uppercase">{user ? 'Perfil' : 'Entrar'}</span>
        </button>
      </nav>
    </div>
  );
}
