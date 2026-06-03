const ANTONIO_FOLLOWUP_PROMPT = `Você é o Antônio, consultor de vendas da Montazolla. Seu objetivo é fazer follow-up com leads que receberam um link de agendamento mas ainda não agendaram.

REGRAS DE FORMATAÇÃO WHATSAPP:
Use SEMPRE e APENAS asterisco simples para negrito. Nunca use **.

Envie uma mensagem curta, educada e natural perguntando se o cliente conseguiu acessar o link de agendamento ou se tem alguma dúvida. Seja conciso — no máximo 2 linhas.`

function callClaudeFollowUp(clienteId, telefone) {
  const ANTHROPIC_API_KEY = $secrets.get('ANTHROPIC_API_KEY')
  if (!ANTHROPIC_API_KEY) {
    return 'Oi! Vi que te enviei o link para agendamento. Conseguiu acessar? Se tiver alguma dúvida ou dificuldade, me avise!'
  }

  // Get last few messages for context
  let historyRecords = []
  try {
    historyRecords = $app.findRecordsByFilter(
      'historico_contatos',
      `cliente_id = '${clienteId}' && tipo_contato = 'WhatsApp'`,
      '-created',
      10,
      0,
    )
    historyRecords = historyRecords.reverse()
  } catch (e) {}

  const rawMessages = []
  for (const record of historyRecords) {
    const desc = record.getString('descricao')
    if (desc.startsWith('Recebido: ')) {
      const text = desc.slice('Recebido: '.length).replace(/ \[ID:[^\]]*\]$/, '').trim()
      if (text) rawMessages.push({ role: 'user', content: text })
    } else if (desc.startsWith('Enviado (IA): ') || desc.startsWith('Enviado: ')) {
      const text = desc.startsWith('Enviado (IA): ')
        ? desc.slice('Enviado (IA): '.length).trim()
        : desc.slice('Enviado: '.length).trim()
      if (text) rawMessages.push({ role: 'assistant', content: text })
    }
  }

  // Add follow-up trigger as system instruction
  rawMessages.push({
    role: 'user',
    content:
      'SYSTEM: O usuário recebeu o link de agendamento há mais de 30 minutos mas ainda não agendou. Envie uma mensagem curta e educada de follow-up perguntando se ele conseguiu acessar o link ou se tem alguma dúvida.',
  })

  const messages = []
  for (const msg of rawMessages) {
    if (messages.length === 0) {
      messages.push({ role: msg.role, content: msg.content })
    } else if (messages[messages.length - 1].role === msg.role) {
      messages[messages.length - 1].content += '\n' + msg.content
    } else {
      messages.push({ role: msg.role, content: msg.content })
    }
  }
  while (messages.length > 0 && messages[0].role !== 'user') {
    messages.shift()
  }
  if (messages.length === 0) {
    return 'Oi! Vi que te enviei o link para agendamento. Conseguiu acessar? Se tiver alguma dúvida, me avise!'
  }

  try {
    const response = $http.send({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: ANTONIO_FOLLOWUP_PROMPT,
        messages: messages,
      }),
      timeout: 20,
    })

    if (response.statusCode === 200) {
      return response.json.content[0].text
    }
  } catch (e) {
    $app.logger().error('Claude follow-up error', 'error', e.message)
  }

  return 'Oi! Vi que te enviei o link para agendamento. Conseguiu acessar? Se tiver alguma dúvida ou dificuldade, me avise!'
}

cronAdd('follow_up_antonio', '*/15 * * * *', () => {
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60000).toISOString().replace('T', ' ')

    const records = $app.findRecordsByFilter(
      'historico_contatos',
      "tipo_contato = 'WhatsApp' && descricao ~ 'crm.montazolla.com/agendar' && created < {:time}",
      '-created',
      100,
      0,
      { time: thirtyMinsAgo },
    )

    const processedClients = {}

    for (const record of records) {
      const clienteId = record.getString('cliente_id')
      if (processedClients[clienteId]) continue
      processedClients[clienteId] = true

      try {
        const cliente = $app.findRecordById('clientes', clienteId)
        const estagio = cliente.getString('estagio_pipeline')

        if (
          [
            'Reunião Agendada',
            'Reunião Realizada',
            'Proposta Enviada',
            'Contrato Assinado',
            'Onboarding',
          ].includes(estagio)
        ) {
          continue
        }

        const recentes = $app.findRecordsByFilter(
          'historico_contatos',
          "cliente_id = {:clienteId} && created > {:time} && tipo_contato = 'WhatsApp'",
          '-created',
          1,
          0,
          { clienteId: clienteId, time: record.getString('created') },
        )

        if (recentes.length > 0) continue

        const telefone = cliente.getString('telefone')
        if (!telefone) continue

        const msgText = callClaudeFollowUp(clienteId, telefone)

        const instanceId = $secrets.get('WA_INSTANCE_ID')
        const token = $secrets.get('WA_TOKEN')
        if (instanceId && token) {
          const res = $http.send({
            url: 'https://api.z-api.io/instances/' + instanceId + '/token/' + token + '/send-text',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: telefone, message: msgText }),
            timeout: 15,
          })

          if (res.statusCode === 200) {
            const historicoCol = $app.findCollectionByNameOrId('historico_contatos')
            const hist = new Record(historicoCol)
            hist.set('cliente_id', clienteId)
            hist.set('tipo_contato', 'WhatsApp')
            hist.set('descricao', 'Enviado (IA): ' + msgText)
            hist.set('data_contato', new Date().toISOString())
            $app.save(hist)
          } else {
            $app.logger().error('Z-API falhou no cron follow-up', 'status', res.statusCode)
          }
        }
      } catch (err) {
        $app
          .logger()
          .error('Erro no processamento do follow-up', 'clienteId', clienteId, 'error', String(err))
      }
    }
  } catch (err) {
    $app.logger().error('Erro geral no cron follow_up_antonio', 'error', String(err))
  }
})
