-- ============================================
-- SQL PARA CRIAÇÃO DE TÓPICOS E COMENTÁRIOS
-- Execute no SQL Editor do Supabase
-- ============================================

-- Tabela para as discussões dentro das comunidades
CREATE TABLE IF NOT EXISTS topicos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comunidade_id UUID REFERENCES comunidades(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    conteudo TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para os comentários nos tópicos
CREATE TABLE IF NOT EXISTS comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID REFERENCES topicos(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS para testes
ALTER TABLE topicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios DISABLE ROW LEVEL SECURITY;
