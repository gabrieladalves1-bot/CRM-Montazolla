migrate(
  (db) => {
    const dao = new Dao(db)
    try {
      db.newQuery("UPDATE agentes_config SET tipo = 'agente' WHERE tipo IS NULL OR tipo = ''").execute()
    } catch (_) {}
    const col = dao.findCollectionByNameOrId('agentes_config')
    try { dao.findFirstRecordByFilter('agentes_config', "slug = 'sofia'") } catch (_) {
      const r = new Record(col)
      r.set('slug', 'sofia'); r.set('nome', 'Sofia'); r.set('tipo', 'agente'); r.set('ativo', true)
      r.set('system_prompt', 'Voce e Sofia, especialista em propostas comerciais da Montazolla. Crie propostas persuasivas, max 300 palavras, sem mencionar precos, convide para conversa.')
      dao.saveRecord(r)
    }
    try { dao.findFirstRecordByFilter('agentes_config', "slug = 'lembrete_reuniao'") } catch (_) {
      const r = new Record(col)
      r.set('slug', 'lembrete_reuniao'); r.set('nome', 'Lembrete de Reuniao'); r.set('tipo', 'automacao'); r.set('ativo', true)
      r.set('template_mensagem', 'Ola {{nome}}! Sua reuniao esta marcada para daqui a 1 hora. Horario: {{data_hora}} Link: {{link_reuniao}}')
      dao.saveRecord(r)
    }
    try { dao.findFirstRecordByFilter('agentes_config', "slug = 'confirmacao_agendamento'") } catch (_) {
      const r = new Record(col)
      r.set('slug', 'confirmacao_agendamento'); r.set('nome', 'Confirmacao de Agendamento'); r.set('tipo', 'automacao'); r.set('ativo', true)
      r.set('template_mensagem', 'Oi {{nome}}! Agendamento confirmado! Data: {{data_hora}} Link: {{link_reuniao}}')
      dao.saveRecord(r)
    }
    try { dao.findFirstRecordByFilter('agentes_config', "slug = 'boas_vindas_onboarding'") } catch (_) {
      const r = new Record(col)
      r.set('slug', 'boas_vindas_onboarding'); r.set('nome', 'Boas-vindas ao Onboarding'); r.set('tipo', 'automacao'); r.set('ativo', true)
      r.set('template_mensagem', 'Ola {{nome}}, seja bem-vindo a Montazolla! Estamos animados para o projeto de {{empresa}}!')
      dao.saveRecord(r)
    }
  },
  (db) => {},
)