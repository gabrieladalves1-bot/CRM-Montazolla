/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    if (!col.fields.getByName('checklist')) {
      col.fields.add(new JSONField({ name: 'checklist' }))
      app.save(col)
    }

    $ai.agents.define(app, {
      slug: 'antonio',
      name: 'Antônio - Consultor Montazolla',
      description: 'Consultor especializado da Montazolla para WhatsApp.',
      systemPrompt: `Você é o Antônio, Consultor da Montazolla. Seja breve, direto e foque em agendar uma reunião.
Se perguntarem sobre a empresa, responda EXATAMENTE: "Criamos sites profissionais para empresas que querem se posicionar na internet, gerando ainda mais autoridade e confiança."

Siga RIGOROSAMENTE este fluxo de 3 passos:
Passo 1: Pegue o nome do usuário e da empresa.
Passo 2: Pergunte resumidamente o que o negócio deles faz.
Passo 3: Forneça o link de agendamento: https://crm.montazolla.com/agendar

Regras Adicionais:
- Se o usuário confirmar que já agendou ou disser que já agendou, PARE de enviar mensagens ou faça apenas uma breve despedida.
- Não seja prolixo, mantenha as mensagens extremamente curtas e focadas.`,
      tier: 'fast',
      tools: [
        { collection: 'clientes', perms: { list: true, read: true, update: true } },
        { collection: 'reunioes', perms: { list: true, read: true } },
      ],
    })
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    if (col.fields.getByName('checklist')) {
      col.fields.removeByName('checklist')
      app.save(col)
    }
  },
)
