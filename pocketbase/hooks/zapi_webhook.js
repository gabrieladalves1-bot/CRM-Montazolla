const ANTONIO_PROMPT = `Você é o Antônio, consultor de vendas especializado da Montazolla, focado em fechar projetos de criação de sites via WhatsApp. Seu tom deve ser altamente persuasivo e direto ao ponto, sem nenhuma enrolação ou informações desnecessárias.

REGRAS DE FORMATAÇÃO WHATSAPP (MUITO IMPORTANTE):
Use SEMPRE e APENAS asterisco simples para negrito (exemplo: *texto*). É ESTRITAMENTE PROIBIDO usar duplo asterisco (como **texto**), pois isso não funciona no WhatsApp. Nunca use **.

TRATAMENTO DE ÁUDIO:
Se o usuário enviar a mensagem '[Mensagem de Áudio]', responda educadamente explicando que você não consegue ouvir áudios no momento e peça para ele digitar a dúvida ou informação em texto.

PITCH DE VENDAS:
Se o cliente perguntar como funciona o serviço, pedir mais informações ou quiser saber detalhes antes de uma reunião, dê uma explicação muito breve, direta e persuasiva: "A criação de um site profissional gera profissionalismo, autoridade e credibilidade imediatas para o seu negócio." Em seguida, direcione-o de volta para a próxima etapa do fluxo de vendas.

FLUXO DE VENDAS EM 3 ETAPAS:
Siga estritamente este fluxo de forma natural, avançando apenas quando o cliente responder à etapa atual:
Etapa 1 - Engajamento inicial: Cumprimente o cliente e entenda o interesse inicial de forma breve.
Etapa 2 - Qualificação: Peça ao cliente APENAS uma breve descrição do seu negócio (o que a empresa faz).
Etapa 3 - Agendamento: Assim que o cliente fornecer a descrição do negócio (após a etapa 2), informe que você vai enviar um link para agendar uma reunião de 30 minutos e forneça exatamente esta URL: https://app.montazolla.com/agendar`

const ALEXANDRE_PROMPT = `Você é Alexandre, um Consultor de Vendas Especialista da Montazolla.
Sua função é prospectar clientes de forma educada e seguir rigorosamente um fluxo de 3 passos para agendar uma reunião.

REGRAS DE FORMATAÇÃO WHATSAPP:
Use SEMPRE e APENAS asterisco simples para negrito (exemplo: *texto*). Nunca use **.

REGRAS E FLUXO:
A sua interação começa APÓS o cliente responder a nossa mensagem inicial de prospecção.
- PASSO 1: O cliente respondeu. Você deve explicar brevemente o trabalho da Montazolla (Criação de sites profissionais e otimizados) e perguntar se o cliente tem alguma dúvida.
- PASSO 2: Assim que o cliente responder ao Passo 1, proponha uma rápida reunião online de 15 a 30 minutos, sem compromisso, para apresentar um modelo/proposta de site. Peça permissão para enviar o link de agendamento.
- PASSO 3: Quando o cliente concordar, envie o link de agendamento: https://app.montazolla.com/agendar e lembre-o de comparecer.

Durante a conversa, identifique o NOME do cliente e a EMPRESA/Nicho de atuação e mencione-os naturalmente nas respostas.

Tom de voz: Profissional, prestativo, persuasivo, mas não insistente. Seja conciso.`

function getAgentPrompt(agenteAtivo) {
  const slug = agenteAtivo === 'Alexandre' ? 'alexandre' : 'antonio'
  try {
    const record = $app.findFirstRecordByFilter('agentes_config', `slug = '${slug}' && ativo = true`)
    const prompt = record.getString('system_prompt')
    if (prompt) return prompt
  } catch (_) {}
  return agenteAtivo === 'Alexandre' ? ALEXANDRE_PROMPT : ANTONIO_PROMPT
}

function isAgentGloballyActive(agenteAtivo) {
  const slug = agenteAtivo === 'Alexandre' ? 'alexandre' : 'antonio'
  try {
    $app.findFirstRecordByFilter('agentes_config', `slug = '${slug}' && ativo = true`)
    return true
  } catch (_) {
    return false
  }
}

function callClaudeAgent(agenteAtivo, clienteId, currentMessage) {
  const ANTHROPIC_API_KEY = $os.getenv('ANTHROPIC_API_KEY')
  if (!ANTHROPIC_API_KEY) {
    $app.logger().error('ANTHROPIC_API_KEY not configured as Railway env var')
    return 'Olá! No momento estou passando por uma atualização. Por favor, tente novamente em alguns instantes.'
  }

  // Build conversation history from historico_contatos
  let historyRecords = []
  try {
    historyRecords = $app.findRecordsByFilter(
      'historico_contatos',
      `cliente_id = '${clienteId}' && tipo_contato = 'WhatsApp'`,
      '+created',
      40,
      0,
    )
  } catch (e) {
    $app.logger().error('Error fetching history for Claude', 'error', e.message)
  }

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

  rawMessages.push({ role: 'user', content: currentMessage })

  // Merge consecutive same-role messages (Claude requires alternating roles)
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
    messages.push({ role: 'user', content: currentMessage })
  }

  const systemPrompt = getAgentPrompt(agenteAtivo)

  let response
  try {
    response = $http.send({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
      timeout: 30,
    })
  } catch (err) {
    throw new Error('Claude API connection error: ' + err.message)
  }

  if (response.statusCode !== 200) {
    const errBody = response.json ? JSON.stringify(response.json) : ''
    throw new Error('Claude API error ' + response.statusCode + ': ' + errBody)
  }

  return response.json.content[0].text
}

routerAdd('POST', '/backend/v1/zapi-webhook', (e) => {
  const body = e.requestInfo().body || {}
  $app.logger().info('Z-API Webhook received', 'body', JSON.stringify(body))

  if (body.fromMe || body.isGroup) {
    $app.logger().info('Ignoring fromMe or isGroup message')
    return e.json(200, { status: 'ignored' })
  }

  const rawPhone = body.phone
  let text = typeof body.text === 'string' ? body.text : (body.text && body.text.message)
  const messageId = body.messageId
  const senderName = body.senderName || 'Desconhecido'

  const isAudio = body.audio !== undefined || body.type === 'audio' || body.type === 'ptt'
  if (isAudio && !text) {
    text = '[Mensagem de Áudio]'
  }

  if (!rawPhone || !text) {
    $app.logger().info('Ignoring, missing phone or text')
    return e.json(200, { status: 'ignored, missing data' })
  }

  const phone = rawPhone.replace(/\D/g, '')

  if (phone === '5517991241014') {
    $app.logger().info('Ignoring official agent number')
    return e.json(200, { status: 'ignored, official agent number' })
  }

  // Idempotency check
  if (messageId) {
    const existing = $app.findRecordsByFilter(
      'historico_contatos',
      `descricao ~ '[ID:${messageId}]'`,
      '',
      1,
      0,
    )
    if (existing.length > 0) {
      $app.logger().info('Message already processed', 'messageId', messageId)
      return e.json(200, { status: 'already processed' })
    }
  }

  let ownerId = null
  try {
    const users = $app.findRecordsByFilter('users', "id != ''", 'created', 1, 0)
    if (users.length > 0) ownerId = users[0].id
  } catch (err) {}

  if (!ownerId) {
    $app.logger().error('No users configured')
    return e.json(500, { error: 'No users configured' })
  }

  // Find or create client
  let cliente
  try {
    cliente = $app.findFirstRecordByFilter(
      'clientes',
      `telefone = '${phone}' && user_id = '${ownerId}'`,
    )
    $app.logger().info('Found existing client', 'cliente_id', cliente.id)
  } catch (_) {
    $app.logger().info('Creating new client', 'phone', phone)
    const clientesCol = $app.findCollectionByNameOrId('clientes')
    cliente = new Record(clientesCol)
    cliente.set('telefone', phone)
    cliente.set('nome', senderName !== 'Desconhecido' ? senderName : phone)
    cliente.set('empresa', 'Não informada')
    cliente.set('fonte_contato', 'Orgânico')
    cliente.set('estagio_pipeline', 'Prospecção')
    cliente.set('data_contato', new Date().toISOString())
    cliente.set('user_id', ownerId)
    $app.save(cliente)
  }

  if (!cliente.getString('agente_ativo')) {
    cliente.set('agente_ativo', 'Antônio')
    $app.save(cliente)
  }

  const histCol = $app.findCollectionByNameOrId('historico_contatos')
  const incomingMsg = new Record(histCol)
  incomingMsg.set('cliente_id', cliente.id)
  incomingMsg.set('tipo_contato', 'WhatsApp')
  incomingMsg.set('descricao', `Recebido: ${text}${messageId ? ` [ID:${messageId}]` : ''}`)
  incomingMsg.set('data_contato', new Date().toISOString())
  $app.save(incomingMsg)
  $app.logger().info('Incoming message saved, debouncing...', 'cliente_id', cliente.id)

  // Debounce: 5 second wait
  try {
    $http.send({ url: 'http://198.51.100.1', timeout: 5 })
  } catch (err) {}

  const incomingCreatedStr = incomingMsg.getString('created').replace('T', ' ')
  const newerMsgs = $app.findRecordsByFilter(
    'historico_contatos',
    `cliente_id = '${cliente.id}' && tipo_contato = 'WhatsApp' && created > '${incomingCreatedStr}' && descricao ~ 'Recebido:%'`,
    '',
    1,
    0,
  )
  if (newerMsgs.length > 0) {
    $app.logger().info('Debounce: newer message found, skipping AI.')
    return e.json(200, { status: 'debounced' })
  }

  const agenteAtivo = cliente.getString('agente_ativo') || 'Antônio'
  if (agenteAtivo === 'Manual') {
    $app.logger().info('Agent is Manual, skipping AI.')
    return e.json(200, { status: 'manual mode' })
  }
  if (!isAgentGloballyActive(agenteAtivo)) {
    $app.logger().info('Agent is globally disabled, skipping AI.', 'agent', agenteAtivo)
    return e.json(200, { status: 'agent disabled' })
  }

  // Find date of last AI message to gather all recent incoming messages
  let lastAiMsgDate = ''
  try {
    const lastAiMsgs = $app.findRecordsByFilter(
      'historico_contatos',
      `cliente_id = '${cliente.id}' && tipo_contato = 'WhatsApp' && descricao ~ 'Enviado (IA):%'`,
      '-created',
      1,
      0,
    )
    if (lastAiMsgs.length > 0) {
      lastAiMsgDate = lastAiMsgs[0].getString('created').replace('T', ' ')
    }
  } catch (e) {}

  let recentFilter = `cliente_id = '${cliente.id}' && tipo_contato = 'WhatsApp' && descricao ~ 'Recebido:%'`
  if (lastAiMsgDate) {
    recentFilter += ` && created > '${lastAiMsgDate}'`
  } else {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString().replace('T', ' ')
    recentFilter += ` && created >= '${oneMinuteAgo}'`
  }

  let concatenatedText = text
  try {
    const recentMsgs = $app.findRecordsByFilter(
      'historico_contatos',
      recentFilter,
      '+created',
      20,
      0,
    )
    if (recentMsgs.length > 0) {
      concatenatedText = recentMsgs
        .map((m) => {
          let d = m.getString('descricao').replace('Recebido: ', '')
          d = d.replace(/ \[ID:[^\]]*\]$/, '')
          return d.trim()
        })
        .filter((d) => d.length > 0)
        .join('\n')
    }
  } catch (e) {
    $app.logger().error('Error fetching recent messages', 'error', e.message)
  }

  $app.logger().info('Calling Claude agent...', 'agent', agenteAtivo, 'text', concatenatedText)

  let replyText
  try {
    replyText = callClaudeAgent(agenteAtivo, cliente.id, concatenatedText)
    $app.logger().info('Claude response generated', 'response', replyText)
  } catch (err) {
    $app.logger().error('Claude Agent error', 'error', err.message)
    return e.json(500, { error: 'AI agent failed' })
  }

  const instanceId = $os.getenv('WA_INSTANCE_ID') || '3F410457AB25812690089A7EE4F1867E'
  const token = $os.getenv('WA_TOKEN') || '556AE67289E74FD28A396530'
  const clientToken =
    $os.getenv('ZAPI_CLIENT_TOKEN') ||
    $os.getenv('WA_CLIENT_TOKEN') ||
    'F6e10c7524601499e9a6591ecf0c56ca1S'

  if (instanceId && token) {
    try {
      $app.logger().info('Sending Z-API message', 'phone', rawPhone)
      const res = $http.send({
        url: `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': clientToken,
        },
        body: JSON.stringify({ phone: rawPhone, message: replyText }),
      })
      $app.logger().info('Z-API message delivered', 'statusCode', res.statusCode)
    } catch (err) {
      $app.logger().error('Z-API Send error', 'error', err.message)
    }
  }

  const outgoingMsg = new Record(histCol)
  outgoingMsg.set('cliente_id', cliente.id)
  outgoingMsg.set('tipo_contato', 'WhatsApp')
  outgoingMsg.set('descricao', `Enviado (IA): ${replyText}`)
  outgoingMsg.set('data_contato', new Date().toISOString())
  $app.save(outgoingMsg)
  $app.logger().info('Outgoing message saved')

  return e.json(200, { status: 'processed' })
})
