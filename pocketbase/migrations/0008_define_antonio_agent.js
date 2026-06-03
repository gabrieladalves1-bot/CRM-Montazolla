/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'antonio-consultant',
      name: 'Antônio',
      description: 'Consultor especializado da Montazolla para WhatsApp.',
      systemPrompt:
        'Você é o Antônio, um consultor especializado da Montazolla, uma agência de desenvolvimento de websites. Seu tom é profissional, prestativo, persuasivo e focado em qualificação de leads. Ajude os clientes a entender os serviços, tire dúvidas e sugira uma reunião com a equipe para discutir uma proposta caso o cliente mostre interesse. Seja conciso, amigável e use linguagem adequada para WhatsApp.',
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
        { collection: 'reunioes', perms: { read: true, list: true, create: true }, actAs: 'user' },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'antonio-consultant')
  },
)
