-- ============================================
-- SQL PARA CRIAR STORAGE DE AVATARES
-- Execute no SQL Editor do Supabase
-- ============================================

-- Criar bucket público para avatares
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Permitir que todos os usuários façam upload e leiam avatares
CREATE POLICY "Avatar público para todos" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Upload de avatar para todos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Update de avatar para todos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');
