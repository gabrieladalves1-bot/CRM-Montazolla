/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.dao().findCollectionByNameOrId('agentes_config')

    // Adiciona campo tipo (agente | automacao)
    if (!col.fields.getByName('tipo')) {
      col.fields.add(new SelectField({ name: 'tipo', values: ['agente', 'automacao'], maxSelect: 1 }))
      app.dao().saveCollection(col)
    }

    // Adiciona campo template_mensagem para automações
    if (!col.fields.getByName('template_mensagem')) {
      col.fields.add(new TextField({ name: 'template_mensagem', max: 2000 }))
      app.dao().saveCollection(col)
    }

    // Backfill: agentes existentes recebem tipo = 'agente'
    app.dao().db().newQuery("UPDATE agentes_config SET tipo = 'agente' WHERE tipo IS NULL OR tipo = ''").execute()

    // Sofia — Geradora de Propostas
    try {
      app.findFirstRecordByFilter('agentes_config', "slug = 'sofia'")
    } catch (_) {
      const sofia = new Record(col)
      sofia.set('slug', 'sofia')
      sofia.set('nome', 'Sofia')
      sofia.set('tipo', 'agente')
      sofia.set('ativo', true)
      sofia.set('system_prompt', `Você é Sofia, especialista em criar propostas comerciais da Montazolla — agência de criação de sites profissionais.

Sua tarefa: criar uma proposta comercial persuasiva, clara e personalizada para o cliente informado.

ESTRUTURA DA PROPOSTA:
1. Saudação personalizada com nome e empresa
2. Entendimento do negócio (baseado no nicho/descrição)
3. O que a Montazolla entrega (site profissional, design moderno, otimizado para celular, SEO básico)
4. 3 benefícios diretos para O NEGÓCIO ESPECÍFICO do cliente
5. Próximos passos: confirmar interesse e agendar reunião técnica

REGRAS:
- Tom: profissional, mas acessível. Nunca use jargão técnico.
- Tamanho: máximo 300 palavras
- Não mencione preços
- Não use asterisco duplo (**). Use *texto* para negrito (formato WhatsApp)
- Finalize sempre convidando para uma conversa`)
      app.dao().saveRecord(sofia)
    }

    // Automação 1: Lembrete de Reunião (1h antes)
    try {
      app.findFirstRecordByFilter('agentes_config', "slug = 'lembrete_reuniao'")
    } catch (_) {
      const lembrete = new Record(col)
      lembrete.set('slug', 'lembrete_reuniao')
      lembrete.set('nome', 'Lembrete de Reunião')
      lembrete.set('tipo', 'automacao')
      lembrete.set('ativo', true)
      lembrete.set('template_mensagem', `Olá {{nome}}! 🔔

Passando para lembrar que nossa reunião está marcada para daqui a 1 hora.

🕐 Horário: {{data_hora}}
📹 Link: {{link_reuniao}}

Até já!`)
      app.dao().saveRecord(lembrete)
    }

    // Automação 2: Confirmação de Agendamento
    try {
      app.findFirstRecordByFilter('agentes_config', "slug = 'confirmacao_agendamento'")
    } catch (_) {
      const confirmacao = new Record(col)
      confirmacao.set('slug', 'confirmacao_agendamento')
      confirmacao.set('nome', 'Confirmação de Agendamento')
      confirmacao.set('tipo', 'automacao')
      confirmacao.set('ativo', true)
      confirmacao.set('template_mensagem', `Oi {{nome}}! ✅

Seu agendamento foi confirmado com sucesso!

📅 Data e horário: {{data_hora}}
📹 Link da reunião: {{link_reuniao}}

Qualquer dúvida antes da reunião, pode me chamar aqui. Até lá!`)
      app.dao().saveRecord(confirmacao)
    }

    // Automação 3: Boas-vindas Onboarding
    try {
      app.findFirstRecordByFilter('agentes_config', "slug = 'boas_vindas_onboarding'")
    } catch (_) {
      const boasVindas = new Record(col)
      boasVindas.set('slug', 'boas_vindas_onboarding')
      boasVindas.set('nome', 'Boas-vindas ao Onboarding')
      boasVindas.set('tipo', 'automacao')
      boasVindas.set('ativo', true)
      boasVindas.set('template_mensagem', `Olá {{nome}}, seja muito bem-vindo(a) à Montazolla! 🎉

Estamos animados para começar o projeto do site de {{empresa}}!

Nossa equipe já está organizando tudo. Em breve entraremos em contato para dar os próximos passos.

Qualquer dúvida, estou à disposição aqui. 🙌`)
      app.dao().saveRecord(boasVindas)
    }
  },
  (app) => {
    // Rollback: remove os registros adicionados
    for (const slug of ['sofia', 'lembrete_reuniao', 'confirmacao_agendamento', 'boas_vindas_onboarding']) {
      try {
        const r = app.findFirstRecordByFilter('agentes_config', `slug = '${slug}'`)
        app.dao().deleteRecord(r)
      } catch (_) {}
    }
  },
)
