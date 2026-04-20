-- Tabela de fotos do álbum
CREATE TABLE IF NOT EXISTS fotos_album (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  url TEXT NOT NULL,
  key TEXT,
  legenda TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE fotos_album ENABLE ROW LEVEL SECURITY;

-- Policy: todos podem ver, só dono pode gerenciar
CREATE POLICY "Album visivel para todos" ON fotos_album FOR SELECT USING (true);
CREATE POLICY "Album insert para autenticado" ON fotos_album FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Album update para dono" ON fotos_album FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Album delete para dono" ON fotos_album FOR DELETE USING (auth.uid() = usuario_id);

-- Se não quiser RLS temporariamente:
ALTER TABLE fotos_album DISABLE ROW LEVEL SECURITY;