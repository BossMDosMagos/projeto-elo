-- ============================================
-- SQL PARA CRIAÇÃO DE MEMBROS DE COMUNIDADES
-- Execute no SQL Editor do Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS membros_comunidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comunidade_id UUID REFERENCES comunidades(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comunidade_id, usuario_id)
);

ALTER TABLE membros_comunidades DISABLE ROW LEVEL SECURITY;
