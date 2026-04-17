-- ============================================
-- SQL COMPLETO PARA CORRIGIR TABELAS
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. DROPAR Tabelas existentes (se houver problemas)
DROP TABLE IF EXISTS comentarios CASCADE;
DROP TABLE IF EXISTS topicos CASCADE;

-- 2. Criar tabela topicos sem foreign keys problemáticas
CREATE TABLE topicos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comunidade_id UUID NOT NULL,
    autor_id UUID,
    titulo TEXT NOT NULL,
    conteudo TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela comentarios
CREATE TABLE comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID NOT NULL,
    autor_id UUID,
    texto TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Desabilitar RLS para testes
ALTER TABLE topicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios DISABLE ROW LEVEL SECURITY;

-- 5. Inserir tópico de teste na primeira comunidade
DO $$
DECLARE
    comm_id UUID;
BEGIN
    SELECT id INTO comm_id FROM comunidades LIMIT 1;
    IF comm_id IS NOT NULL THEN
        INSERT INTO topicos (comunidade_id, autor_id, titulo, conteudo)
        VALUES (comm_id, NULL, '🎉 Primeiro Tópico!', 'Este é um tópico de teste para verificar se está funcionando.');
    ELSE
        RAISE NOTICE 'Nenhuma comunidade encontrada. Crie uma comunidade primeiro.';
    END IF;
END $$;
