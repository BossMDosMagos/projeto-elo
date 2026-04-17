-- ============================================
-- SQL PARA ATUALIZAR TABELA PERFIS
-- Execute no SQL Editor do Supabase
-- ============================================

-- Adicionar colunas bio e avatar_url
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS avatar_url TEXT;
