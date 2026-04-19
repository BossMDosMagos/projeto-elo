-- Função para validar lance no servidor (antifraude)
CREATE OR REPLACE FUNCTION validar_lance_leilao(
    p_comunidade_id UUID,
    p_lance NUMERIC,
    p_usuario_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comunidade RECORD;
    v_resultado JSONB;
BEGIN
    -- Busca dados da comunidade
    SELECT * INTO v_comunidade
    FROM comunidades
    WHERE id = p_comunidade_id;

    IF v_comunidade IS NULL THEN
        RETURN jsonb_build('success', false, 'message', 'Comunidade não encontrada');
    END IF;

    -- Verifica se é leilão ativo
    IF NOT v_comunidade.is_leiloavel THEN
        RETURN jsonb_build('success', false, 'message', 'Esta comunidade não está em leilão');
    END IF;

    IF v_comunidade.status_venda != 'aberto' THEN
        RETURN jsonb_build('success', false, 'message', 'Leilão já encerrado');
    END IF;

    -- Valida tempo usando relógio do servidor (UTC)
    IF v_comunidade.data_fim_leilao IS NOT NULL THEN
        IF NOW() > v_comunidade.data_fim_leilao THEN
            RETURN jsonb_build('success', false, 'message', 'Leilão encerrado! Tempo esgotado.');
        END IF;
    END IF;

    -- Valida valor mínimo
    IF p_lance <= COALESCE(v_comunidade.lance_atual, 0) THEN
        RETURN jsonb_build('success', false, 'message', 'Lance deve ser maior que o atual');
    END IF;

    -- Calcula novo tempo (+5 min se menos de 5 min restantes)
    DECLARE
        v_novo_tempo TIMESTAMPTZ := v_comunidade.data_fim_leilao;
    BEGIN
        IF v_comunidade.data_fim_leilao IS NOT NULL THEN
            IF (v_comunidade.data_fim_leilao - NOW()) < INTERVAL '5 minutes' THEN
                v_novo_tempo := NOW() + INTERVAL '5 minutes';
            END IF;
        END IF;

        -- Atualiza o banco
        UPDATE comunidades SET
            lance_atual = p_lance,
            id_ultimo_licitante = p_usuario_id,
            data_fim_leilao = v_novo_tempo
        WHERE id = p_comunidade_id;

        RETURN jsonb_build(
            'success', true,
            'message', 'Lance registrado!',
            'novo_tempo', v_novo_tempo
        );
    END;
END;
$$;

-- Ativa Realtime na tabela comunidades
ALTER PUBLICATION supabase_re ADD TABLE comunidades;

-- Garante que TIMESTAMPTZ está correto
ALTER TABLE comunidades ALTER COLUMN data_fim_leilao TYPE TIMESTAMPTZ USING data_fim_leilao::TIMESTAMPTZ;