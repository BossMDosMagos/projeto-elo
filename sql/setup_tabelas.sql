-- ============================================
-- SQL PARA CRIAR TABELAS DO ELO
-- Execute no SQL Editor do Supabase
-- ============================================

-- Tabela Comunidades
CREATE TABLE IF NOT EXISTS comunidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    icone TEXT DEFAULT '👥',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela Recados (Scraps)
CREATE TABLE IF NOT EXISTS recados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela Fotos
CREATE TABLE IF NOT EXISTS fotos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS para testes (depois de configurar, habilite novamente)
ALTER TABLE comunidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE recados DISABLE ROW LEVEL SECURITY;
ALTER TABLE fotos DISABLE ROW LEVEL SECURITY;

-- Inserir algumas comunidades de exemplo
INSERT INTO comunidades (nome, descricao, icone) VALUES
('🎵 Hi-Fi Audio', 'Comunidade para entusiastas de áudio de alta fidelidade', '🎵'),
('💻 Desenvolvimento', 'Programadores e desenvolvedores compartilhando conhecimento', '💻'),
('🎮 Gamers', 'Para os amantes de jogos de todos os tipos', '🎮'),
('📚 Leitura', 'Amantes de livros e literatura', '📚'),
('🎬 Cinema', 'Discussões sobre filmes e séries', '🎬');
