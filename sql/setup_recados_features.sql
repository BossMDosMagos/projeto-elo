-- Adiciona a coluna de curtidas
ALTER TABLE recados ADD COLUMN IF NOT EXISTS curtidas INTEGER DEFAULT 0;

-- Cria a tabela de comentários para os recados
CREATE TABLE IF NOT EXISTS comentarios_recados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recado_id uuid REFERENCES recados(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES auth.users,
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilita RLS nas tabelas para desenvolvimento
ALTER TABLE comentarios_recados DISABLE ROW LEVEL SECURITY;
ALTER TABLE recados DISABLE ROW LEVEL SECURITY;
