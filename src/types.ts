export interface Ferramenta {
  id: string;
  nome: string;
  marca?: string;
  modelo?: string;
  descricao: string;
  categoria: string;
  estado_recebimento?: string;
  proprietario_anterior?: string;
  estado_atual: string;
  historico_restauracao?: string;
  numero_serie?: string;
  fotos_antes: string[];
  fotos_depois: string[];
  foto_url: string; // Main preview photo (usually the first 'after' or 'before')
  created_at: string;
}

export interface NewFerramenta extends Omit<Ferramenta, 'id' | 'created_at'> {}

export interface Categoria {
  id: string;
  nome: string;
}

export interface EstadoConfig {
  id: string;
  label: string;
}
