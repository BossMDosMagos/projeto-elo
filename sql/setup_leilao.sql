-- Adiciona campos para leilão de comunidades
ALTER TABLE comunidades ADD COLUMN IF NOT EXISTS is_leiloavel BOOLEAN DEFAULT false;
ALTER TABLE comunidades ADD COLUMN IF NOT EXISTS status_venda TEXT DEFAULT 'aberto';
ALTER TABLE comunidades ADD COLUMN IF NOT EXISTS lance_atual NUMERIC DEFAULT 0;
ALTER TABLE comunidades ADD COLUMN IF NOT EXISTS id_ultimo_licitante UUID;
ALTER TABLE comunidades ADD COLUMN IF NOT EXISTS data_fim_leilao TIMESTAMP WITH TIME ZONE;

-- Atualiza comunidades existentes para leasing (exemplo)
-- UPDATE comunidades SET is_leiloavel = true, status_venda = 'aberto', lance_atual = 1000, data_fim_leilao = NOW() + INTERVAL '7 days' WHERE nome IN ('Apple', 'Microsoft', 'AMD');

-- Desabilita RLS para desenvolvimento
ALTER TABLE comunidades DISABLE ROW LEVEL SECURITY;