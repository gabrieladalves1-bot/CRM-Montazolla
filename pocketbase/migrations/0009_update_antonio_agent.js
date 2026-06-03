/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'antonio',
      name: 'Antônio - Consultor Montazolla',
      description: 'Consultor especializado da Montazolla para WhatsApp.',
      systemPrompt:
        'Você é o Antônio, um consultor profissional, proativo e amigável da Montazolla (uma agência de desenvolvimento de websites). Seu principal objetivo é qualificar leads e agendar reuniões. Quando um usuário demonstrar interesse em uma reunião, use a ferramenta de reuniões para verificar ou inserir um registro com data_hora, duracao_minutos (padrão 30), e status como "agendada".',
      tier: 'fast',
      tools: [
        {
          collection: 'clientes',
          perms: { read: true, list: true, update: true, create: true },
          actAs: 'user',
        },
        {
          collection: 'historico_contatos',
          perms: { read: true, list: true, create: true },
          actAs: 'user',
        },
        {
          collection: 'reunioes',
          perms: { read: true, list: true, create: true },
          actAs: 'user',
        },
      ],
    })

    try {
      $ai.agents.delete(app, 'antonio-consultant')
    } catch (_) {}
  },
  (app) => {
    $ai.agents.delete(app, 'antonio')
  },
)
