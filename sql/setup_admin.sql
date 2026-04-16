-- ============================================
-- SQL PARA CRIAR PERFIL DO ADMIN
-- Execute no SQL Editor do Supabase
-- Substitua o email pelo seu email
-- ============================================

-- Primeiro, encontre o ID do seu usuário pelo email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'SEU_EMAIL_AQUI';

-- Depois, insira/atualize seu perfil como admin
INSERT INTO perfis (id, nome_completo, is_admin)
VALUES ('SEU_USER_ID_AQUI', 'Seu Nome', true)
ON CONFLICT (id) DO UPDATE SET is_admin = true;
