# PROJETO ELO: Rede de Conexões e Comunidades

## 1. VISÃO GERAL

O ELO é uma rede social de nicho focada em comunidades reais, privacidade absoluta e utilidade técnica. O projeto busca resgatar o "espírito" do antigo Orkut (comunidades, fóruns, depoimentos), mas com uma interface moderna, segura e sem algoritmos de manipulação.

## 2. FILOSOFIA E DESIGN

**Público-Alvo:** Entusiastas de tecnologia, colecionadores (Áudio Hi-Fi, mídias raras), desenvolvedores e grupos que buscam um espaço seguro e exclusivo.

**Identidade Visual:**
- **Cores:** Fundo Negro Profundo (#000000), Detalhes em Dourado (#d4af37)
- **Logo:** A palavra "ELO" onde o "O" é um elo de corrente metálico
- **Diferencial:** Usuário é dono dos seus dados. Feed estritamente cronológico.

## 3. STACK TECNOLÓGICA

- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Backend/Banco:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hospedagem:** GitHub Pages

## 4. ESTRUTURA DE PÁGINAS

```
index.html     - Landing page premium
login.html    - Login com Supabase Auth
cadastro.html - Registro de novos usuários
home.html     - Dashboard SPA principal
config.html  - Editar perfil e avatar
admin.html   - Painel administrativo
sobre.html   - Página institucional
privacidade.html
termos.html
seguranca.html
config.js     - Credenciais Supabase
```

## 5. BANCO DE DADOS (SUPABASE)

### Tabelas principais:

```sql
-- Perfis de usuários
CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users,
  nome_completo TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT false
);

-- Comunidades
CREATE TABLE comunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  categoria TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_leiloavel BOOLEAN DEFAULT false,
  status_venda TEXT DEFAULT 'aberto',
  lance_atual NUMERIC DEFAULT 0,
  id_ultimo_licitante UUID,
  data_fim_leilao TIMESTAMPTZ
);

-- Membros de comunidades
CREATE TABLE membros_comunidades (
  comunidade_id UUID REFERENCES comunidades,
  usuario_id UUID REFERENCES auth.users,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tópicos nas comunidades
CREATE TABLE topicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunidade_id UUID REFERENCES comunidades,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  autor_id UUID REFERENCES auth.users,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Recados (scrapbook global)
CREATE TABLE recados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  curtidas INTEGER DEFAULT 0
);

-- Comentários nos recados
CREATE TABLE comentarios_recados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recado_id UUID REFERENCES recados,
  autor_id UUID REFERENCES auth.users,
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. FUNCIONALIDADES IMPLEMENTADAS

### Autenticação
- Login/logout com Supabase Auth
- Cadastro de novos usuários
- Criação automática de perfil
- Nível admin (is_admin)

### Comunidades
- Criar comunidades
- Listar todas as comunidades
- Participar/Sair de comunidades
- Ver detalhes e membros
- Criar tópicos
- Comentar em tópicos

### Recados (Scrapbook)
- Postar recados no mural global
- Exibir com avatar e nome do autor
- Contador de curtidas
- Sistema de comentários
- Like/Curtir (+1 no banco)
- Badge "Autor" em comentários do dono do post
- Trava: usuário não pode curtir próprio post

### Sistema de Leilão de Comunidades Elite
- Criar comunidade para leasing (apenas admin)
- Card com cronômetro regressivo visível
- Modal luxuoso Black & Gold
- Timer em tempo real (setInterval 1s)
- Fallback de atualização (3s)
- +5 minutos se lance nos últimos 5 min
- Realtime listener para updates
- Status: aberto/processando/vendido
- Identificação visual do dono

### Admin
-Painel administrativo
- Setup de admin manual
- Gerenciar comunidades (CRUD completo)

### Perfil
- Editar nome completo
- Avatar com upload/redimensionamento
- Bio/descrição pessoal

## 7. ARQUITETURA SPA (Single Page Application)

O home.html usa JS para carregar seções dinamicamente:
- loadSection(section) - roteamento
- loadHome() - dashboard inicial
- loadRecados() - mural de recados
- loadComunidades() - lista de comunidades
- loadRecentRecados() - preview na home
- abrirComunidade() - detalhes

## 8. DESIGN SYSTEM (CSS)

### Cores principais:
- --black: #000000
- --gold: #d4af37
- --gold-bright: #f9e295
- --bg-secondary: #111111

### Componentes:
- Toast notifications douradas
- Modal com backdrop
- Cards de comunidades
- Botões gold/black
- Formulários escuros

## 9. SCRIPTS SQL AUXILIARES

```
sql/
├── setup_perfis.sql
├── setup_admin.sql
├── setup_storage.sql
├── setup_tabelas.sql
├── setup_forum.sql
├── setup_membros.sql
├── fix_topicos.sql
├── setup_recados_features.sql
└── setup_leilao_rpc.sql (não implementado)
```

## 10. REGRAS DE OURO

- Código Limpo e legível
- Interface Premium (Dourado/Preto)
- LGPD: privacidade em primeiro
- Homenagem ao Orkut (não plágio)
- Feed cronológico (sem algoritmos)

## 11. STATUS COMPLETO

- [x] Landing page
- [x] Login/Cadastro
- [x] Dashboard SPA
- [x] Comunidades (CRUD)
- [x] Tópicos e comentários
- [x] Recados com like/comentar
- [x] Sistema de Leilão Elite
- [x] Painel Admin
- [x] Perfil do usuário
- [x] Realtime updates

---

> **ELO - Conectando Personas, Construindo Comunidades**
> Atualizado: 19/04/2026