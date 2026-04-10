import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Loader2, X, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginFormProps {
  onClose: () => void;
}

export default function LoginForm({ onClose }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-wood-900">Acesso Restrito</h2>
        <button onClick={onClose} className="p-2 text-wood-400 hover:text-wood-600">
          <X size={24} />
        </button>
      </div>

      <p className="text-wood-600 text-sm">
        Faça login para gerenciar o catálogo de ferramentas.
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-wood-700 uppercase tracking-wider flex items-center gap-2">
            <Mail size={14} /> E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="input-field"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-wood-700 uppercase tracking-wider flex items-center gap-2">
            <Lock size={14} /> Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-field"
            required
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary mt-4"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Entrando...
            </>
          ) : (
            <>
              <LogIn size={20} />
              Entrar
            </>
          )}
        </button>
      </form>
    </div>
  );
}
