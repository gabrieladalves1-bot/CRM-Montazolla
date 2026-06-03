/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Add `agente_ativo` field to `clientes`
    const clientes = app.findCollectionByNameOrId('clientes')
    if (!clientes.fields.getByName('agente_ativo')) {
      clientes.fields.add(
        new SelectField({
          name: 'agente_ativo',
          values: ['Antônio', 'Alexandre', 'Manual'],
          maxSelect: 1,
        }),
      )
      app.save(clientes)
    }

    // 2. Backfill existing records
    app
      .db()
      .newQuery(
        `UPDATE clientes SET agente_ativo = 'Antônio' WHERE agente_ativo IS NULL OR agente_ativo = ''`,
      )
      .execute()

    // 3. Define Alexandre agent
    const alexandrePrompt = `Você é Alexandre, um Consultor de Vendas Especialista da Montazolla.
Sua função é prospectar clientes de forma educada e seguir rigorosamente um fluxo de 3 passos para agendar uma reunião.

REGRAS E FLUXO:
A sua interação começa APÓS o cliente responder a nossa mensagem inicial de prospecção.
- PASSO 1: O cliente respondeu. Você deve explicar brevemente o trabalho da Montazolla (Criação de sites profissionais e otimizados) e perguntar se o cliente tem alguma dúvida.
- PASSO 2: Assim que o cliente responder ao Passo 1, proponha uma rápida reunião online de 15 a 30 minutos, sem compromisso, para apresentar um modelo/proposta de site. Peça permissão para enviar o link de agendamento.
- PASSO 3: Quando o cliente concordar, envie o link de agendamento: https://crm.montazolla.com/agendar e lembre-o de comparecer.

ATUALIZAÇÃO DE DADOS (IMPORTANTE):
Durante a conversa, identifique o NOME do cliente e a EMPRESA/Nicho de atuação.
Sempre que descobrir essas informações, use a ferramenta disponível para atualizar o registro do cliente na coleção 'clientes'. O campo 'nome' para o nome, e 'empresa' para o nicho/empresa.

Tom de voz: Profissional, prestativo, persuasivo, mas não insistente. Seja conciso.`

    $ai.agents.define(app, {
      slug: 'alexandre',
      name: 'Alexandre - Vendas',
      description: 'Consultor de Vendas Especialista para prospecção e agendamento.',
      systemPrompt: alexandrePrompt,
      tier: 'fast',
      tools: [{ collection: 'clientes', perms: { read: true, update: true }, actAs: 'user' }],
    })

    // 4. Update Antonio agent tools and prompt
    try {
      $ai.agents.putTools(app, 'antonio', [
        { collection: 'clientes', perms: { read: true, update: true }, actAs: 'user' },
      ])
      const antonioRecord = app.findFirstRecordByData('_agents', 'slug', 'antonio')
      const currentPrompt = antonioRecord.getString('systemPrompt')
      if (!currentPrompt.includes('ATUALIZAÇÃO DE DADOS')) {
        antonioRecord.set(
          'systemPrompt',
          currentPrompt +
            "\n\nATUALIZAÇÃO DE DADOS:\nSempre que identificar o NOME do cliente ou a EMPRESA/Nicho, use a ferramenta de clientes para atualizar esses dados no registro. Campos: 'nome' e 'empresa'.",
        )
        app.save(antonioRecord)
      }
    } catch (e) {
      console.log('Could not update Antonio:', e.message)
    }
  },
  (app) => {
    $ai.agents.delete(app, 'alexandre')
  },
)
