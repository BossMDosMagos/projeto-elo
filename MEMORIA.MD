# PROJETO ELO: Rede de Conexões e Comunidades

## 1. VISÃO GERAL

O ELO é uma rede social de nicho focada em comunidades reais, privacidade absoluta e utilidade técnica. O projeto busca resgatar o "espírito" do antigo Orkut (comunidades, fóruns, depoimentos), mas com uma interface moderna, segura e sem algoritmos de manipulação.

## 2. FILOSOFIA E DESIGN

**Público-Alvo:** Entusiastas de tecnologia, colecionadores (Áudio Hi-Fi, mídias raras), desenvolvedores e grupos que buscam um espaço seguro e exclusivo (ex: classe LGBTQ+).

**Identidade Visual:**
- **Cores:** Fundo Negro Profundo (#000000), Detalhes em Dourado (#d4af37) e acentos nas cores do arco-íris (Progress Pride Flag).
- **Logo:** A palavra "ELO" onde o "O" é um elo de corrente metálico, com um símbolo interno triangular de conexão.

**Diferencial:** O usuário é dono dos seus dados. O feed é estritamente cronológico.

## 3. STACK TECNOLÓGICA (BASE)

- **Frontend:** HTML5, CSS3 (Moderno/Responsivo) e JavaScript Vanilla (por enquanto).
- **Backend/Banco de Dados:** Supabase (PostgreSQL + Auth + Storage).
- **Integrações Futuras:** RawBT (Impressão térmica), reconhecimento de QR Code e players de áudio de alta fidelidade.

## 4. ESTRUTURA DE DADOS (DATABASE SCHEMA)

```
profiles: (id, username, full_name, avatar_url, bio, reputation_points)

communities: (id, name, description, creator_id, category, is_private)

posts: (id, user_id, community_id, content, file_url, created_at)

scraps: (id, sender_id, receiver_id, content, is_private)
```

## 5. REGRAS DE OURO PARA O DESENVOLVIMENTO

- **Código Limpo:** Priorizar legibilidade e performance.
- **Interface Premium:** Manter o contraste Dourado/Preto em todos os componentes.
- **LGPD:** Toda funcionalidade deve ser pensada na privacidade do usuário.
- **Homenagem, não Plágio:** Usar as funções do Orkut (Sorte do Dia, Quem visitou, Selos), mas com nomes e estilos próprios da rede ELO.

## 6. STATUS ATUAL DO PROJETO

- [x] Definição de Nome e Marca.
- [x] Criação da Identidade Visual.
- [x] Estruturação do HTML5/CSS3 da Landing Page Inicial.
- [ ] Integração com Autenticação Supabase (PRÓXIMO PASSO).

---

> **Nota:** Sempre que uma nova função for implementada, consultar este arquivo para garantir que a interface e a lógica sigam o padrão ELO.
