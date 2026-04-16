-- ============================================
-- SQL PARA CRIAR TABELA PERFIS NO SUPABASE
-- Execute este código no SQL Editor do Supabase
-- ============================================

-- Criar tabela perfis
CREATE TABLE perfis (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    data_nascimento DATE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Política: qualquer usuário pode ver perfis (para buscar dados do usuário logado)
CREATE POLICY "Perfis são visíveis para o próprio usuário" ON perfis
    FOR SELECT USING (auth.uid() = id);

-- Política: usuários podem inserir seu próprio perfil
CREATE POLICY "Usuários podem criar seu próprio perfil" ON perfis
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Política: usuários podem atualizar seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON perfis
    FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- FUNCTION PARA CRIAR PERFIL AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfis (id, nome_completo, data_nascimento, is_admin)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        CASE 
            WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
            THEN TO_DATE(NEW.raw_user_meta_data->>'birth_date', 'YYYY-MM-DD')
            ELSE NULL 
        END,
        FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente após cadastro
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
