// Roda a cada hora.
// Gerencia sequências automáticas de follow-up por estágio:
//   [SM] Sem Resposta  — 3 tentativas em 1, 3 e 7 dias
//   [PR] Pós-Reunião   — 2 mensagens em 2h e 48h após reunião
//   [PP] Pós-Proposta  — 2 mensagens em 2 e 5 dias após proposta

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// ─── helpers ────────────────────────────────────────────────────────────────

function getZApiCreds() {
  return {
    instanceId: $secrets.get('WA_INSTANCE_ID') || '3F410457AB25812690089A7EE4F1867E',
    token: $secrets.get('WA_TOKEN') || '556AE67289E74FD28A396530',
    clientToken:
      $secrets.get('ZAPI_CLIENT_TOKEN') ||
      $secrets.get('WA_CLIENT_TOKEN') ||
      'F6e10c7524601499e9a6591ecf0c56ca1S',
  }
}

function sendAndLog(telefone, message, clienteId, tag) {
  const { instanceId, token, clientToken } = getZApiCreds()
  try {
    const res = $http.send({
      url: `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken },
      body: JSON.stringify({ phone: telefone, message }),
      timeout: 15,
    })
    if (res.statusCode !== 200) return false
  } catch (err) {
    $app.logger().error('ZApi error in sequence', 'tag', tag, 'error', err.message)
    return false
  }

  try {
    const col = $app.findCollectionByNameOrId('historico_contatos')
    const hist = new Record(col)
    hist.set('cliente_id', clienteId)
    hist.set('tipo_contato', 'WhatsApp')
    hist.set('descricao', `Enviado (IA) ${tag}: ${message}`)
    hist.set('data_contato', new Date().toISOString())
    $app.save(hist)
  } catch (err) {
    $app.logger().error('Error saving sequence historico', 'error', err.message)
  }

  return true
}

function genMessage(systemPrompt, userPrompt, fallback) {
  const key = $secrets.get('ANTHROPIC_API_KEY')
  if (!key) return fallback
  try {
    const res = $http.send({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      timeout: 20,
    })
    if (res.statusCode === 200) return res.json.content[0].text
  } catch (err) {
    $app.logger().error('Claude error in sequence', 'error', err.message)
  }
  return fallback
}

// Retorna timestamp do último registro que contenha o trecho em descricao
function getLastHistoricoDate(clienteId, descricaoContem) {
  try {
    const records = $app.findRecordsByFilter(
      'historico_contatos',
      `cliente_id = '${clienteId}' && descricao ~ '${descricaoContem}'`,
      '-created',
      1,
      0,
    )
    if (records.length > 0) {
      return new Date(records[0].getString('created')).getTime()
    }
  } catch (_) {}
  return 0
}

// Retorna timestamp da última mensagem incoming do cliente
function getLastIncomingDate(clienteId) {
  return getLastHistoricoDate(clienteId, 'Recebido:')
}

// Retorna quantas mensagens de uma sequência já foram enviadas
function countSequenceMsgs(clienteId, tag, afterTimestamp) {
  try {
    const afterStr = new Date(afterTimestamp).toISOString().replace('T', ' ')
    const records = $app.findRecordsByFilter(
      'historico_contatos',
      `cliente_id = '${clienteId}' && descricao ~ '${tag}' && created > '${afterStr}'`,
      '-created',
      10,
      0,
    )
    return records.length
  } catch (_) {
    return 0
  }
}

// ─── Sequência A: Sem Resposta ───────────────────────────────────────────────
// Passos: day 1 → day 3 → day 7
// Para se lead responder entre os passos.

function runSemRespostaSequence() {
  const SYSTEM = `Você é o Antônio, consultor de vendas da Montazolla.
Escreva uma mensagem curta de reengajamento para um lead que parou de responder.
Use APENAS asterisco simples para negrito. Seja natural, não pareça robótico. Máximo 2 frases.`

  const STEPS = [
    {
      minAge: DAY,
      maxAge: 3 * DAY,
      prompt: (nome, empresa) =>
        `Lead: ${nome} (${empresa}). Escreva uma mensagem de reengajamento para o passo 1: primeira tentativa após 1 dia sem resposta. Tom: leve, curioso.`,
      fallback: (nome) => `Oi ${nome}! Tudo bem? Ainda tenho interesse em ajudar seu negócio. Tem alguma dúvida que posso esclarecer? 😊`,
    },
    {
      minAge: 3 * DAY,
      maxAge: 7 * DAY,
      prompt: (nome, empresa) =>
        `Lead: ${nome} (${empresa}). Escreva uma mensagem de reengajamento para o passo 2: segunda tentativa após 3 dias. Tom: prestativo, sem pressão.`,
      fallback: (nome) => `Olá ${nome}! Sei que o dia a dia é corrido. Se tiver interesse em criar um site profissional para sua empresa, é só me chamar — o link de agendamento continua disponível! 🙌`,
    },
    {
      minAge: 7 * DAY,
      maxAge: 30 * DAY,
      prompt: (nome, empresa) =>
        `Lead: ${nome} (${empresa}). Escreva a mensagem final de reengajamento (3ª tentativa, 7 dias sem resposta). Tom: simpático, sem pressão, deixando porta aberta.`,
      fallback: (nome) => `Oi ${nome}! Esta é minha última mensagem por enquanto. Se um dia precisar de um site profissional, estarei aqui. Boa sorte no seu negócio! 😊`,
    },
  ]

  try {
    const leads = $app.findRecordsByFilter(
      'clientes',
      `estagio_pipeline = 'Sem Resposta' && telefone != ''`,
      '-created',
      200,
      0,
    )

    for (const lead of leads) {
      try {
        const clienteId = lead.id
        const telefone = lead.getString('telefone')
        if (!telefone) continue

        const lastIncoming = getLastIncomingDate(clienteId)
        if (!lastIncoming) continue

        const now = Date.now()
        const ageMs = now - lastIncoming

        // Verifica se lead respondeu após a última sequência [SM]
        const lastSeqDate = getLastHistoricoDate(clienteId, '[SM]')
        if (lastSeqDate && lastIncoming > lastSeqDate) {
          // Lead respondeu depois da última mensagem de sequência — parar
          continue
        }

        const stepCount = countSequenceMsgs(clienteId, '[SM]', lastIncoming)

        let step = null
        for (let i = 0; i < STEPS.length; i++) {
          if (i === stepCount && ageMs >= STEPS[i].minAge && ageMs < STEPS[i].maxAge) {
            step = STEPS[i]
            break
          }
        }

        if (!step) continue

        // Verifica se já enviou recentemente (evita duplicatas se cron rodar 2x)
        if (lastSeqDate && now - lastSeqDate < 12 * HOUR) continue

        const nome = lead.getString('nome') || 'você'
        const empresa = lead.getString('empresa') || 'sua empresa'

        const message = genMessage(SYSTEM, step.prompt(nome, empresa), step.fallback(nome))
        sendAndLog(telefone, message, clienteId, '[SM]')
        $app.logger().info('SM sequence sent', 'cliente_id', clienteId, 'step', stepCount + 1)
      } catch (err) {
        $app.logger().error('SM sequence error', 'cliente_id', lead.id, 'error', String(err))
      }
    }
  } catch (err) {
    $app.logger().error('SM sequence fatal error', 'error', String(err))
  }
}

// ─── Sequência B: Pós-Reunião ────────────────────────────────────────────────
// Passo 1 (2h após reunião): agradecimento + aviso que vai preparar proposta
// Passo 2 (48h após passo 1): "quando posso apresentar a proposta?"

function runPosReuniaoSequence() {
  const SYSTEM = `Você é o Antônio, consultor de vendas da Montazolla.
O lead acabou de ter uma reunião conosco.
Use APENAS asterisco simples para negrito. Seja caloroso e profissional. Máximo 3 frases.`

  try {
    const leads = $app.findRecordsByFilter(
      'clientes',
      `estagio_pipeline = 'Reunião Realizada' && telefone != ''`,
      '-created',
      200,
      0,
    )

    for (const lead of leads) {
      try {
        const clienteId = lead.id
        const telefone = lead.getString('telefone')
        if (!telefone) continue

        // Data de referência: quando a reunião foi marcada como realizada
        const reuniaoRealizadaDate = getLastHistoricoDate(clienteId, '[STAGE:reuniao_realizada]')
        const stageEntryDate = reuniaoRealizadaDate || new Date(lead.getString('updated')).getTime()

        const now = Date.now()
        const ageMs = now - stageEntryDate

        // Sequência começa 2h após a reunião ser marcada como realizada
        if (ageMs < 2 * HOUR) continue

        // Verifica se lead respondeu após a última [PR]
        const lastSeqDate = getLastHistoricoDate(clienteId, '[PR]')
        const lastIncoming = getLastIncomingDate(clienteId)
        if (lastSeqDate && lastIncoming > lastSeqDate) continue

        const stepCount = countSequenceMsgs(clienteId, '[PR]', stageEntryDate)
        const nome = lead.getString('nome') || 'você'
        const empresa = lead.getString('empresa') || 'sua empresa'

        let message = null

        if (stepCount === 0) {
          message = genMessage(
            SYSTEM,
            `Lead: ${nome} (${empresa}). Acabou de ter a reunião. Escreva agradecimento caloroso e avise que vai preparar a proposta personalizada.`,
            `Obrigado pela conversa, ${nome}! Foi um prazer conhecer mais sobre ${empresa}. Vou preparar uma proposta personalizada e entro em contato em breve. 🙏`,
          )
        } else if (stepCount === 1 && ageMs >= 2 * HOUR + 48 * HOUR) {
          if (lastSeqDate && now - lastSeqDate < 12 * HOUR) continue
          message = genMessage(
            SYSTEM,
            `Lead: ${nome} (${empresa}). Follow-up 48h após reunião. Proposta já foi preparada. Pergunte quando pode apresentar.`,
            `Oi ${nome}! Finalizei a proposta para ${empresa}. Quando seria um bom momento para te apresentar os detalhes? 😊`,
          )
        }

        if (!message) continue

        sendAndLog(telefone, message, clienteId, '[PR]')
        $app.logger().info('PR sequence sent', 'cliente_id', clienteId, 'step', stepCount + 1)
      } catch (err) {
        $app.logger().error('PR sequence error', 'cliente_id', lead.id, 'error', String(err))
      }
    }
  } catch (err) {
    $app.logger().error('PR sequence fatal error', 'error', String(err))
  }
}

// ─── Sequência C: Pós-Proposta ───────────────────────────────────────────────
// Passo 1 (48h sem resposta): "conseguiu ver a proposta?"
// Passo 2 (5 dias): "última mensagem sobre a proposta"

function runPosPropostaSequence() {
  const SYSTEM = `Você é o Antônio, consultor de vendas da Montazolla.
A proposta já foi enviada ao lead.
Use APENAS asterisco simples para negrito. Seja direto e simpático. Máximo 2 frases.`

  try {
    const leads = $app.findRecordsByFilter(
      'clientes',
      `estagio_pipeline = 'Proposta Enviada' && telefone != ''`,
      '-created',
      200,
      0,
    )

    for (const lead of leads) {
      try {
        const clienteId = lead.id
        const telefone = lead.getString('telefone')
        if (!telefone) continue

        const stageEntryDate = new Date(lead.getString('updated')).getTime()
        const now = Date.now()
        const ageMs = now - stageEntryDate

        if (ageMs < 48 * HOUR) continue

        const lastSeqDate = getLastHistoricoDate(clienteId, '[PP]')
        const lastIncoming = getLastIncomingDate(clienteId)
        if (lastSeqDate && lastIncoming > lastSeqDate) continue

        const stepCount = countSequenceMsgs(clienteId, '[PP]', stageEntryDate)
        const nome = lead.getString('nome') || 'você'

        let message = null

        if (stepCount === 0) {
          message = genMessage(
            SYSTEM,
            `Lead: ${nome}. Follow-up pós-proposta — 48h sem resposta. Pergunte se conseguiu analisar a proposta.`,
            `Oi ${nome}! Queria saber se conseguiu analisar a proposta. Fico à disposição para esclarecer qualquer dúvida! 😊`,
          )
        } else if (stepCount === 1 && ageMs >= 5 * DAY) {
          if (lastSeqDate && now - lastSeqDate < 12 * HOUR) continue
          message = genMessage(
            SYSTEM,
            `Lead: ${nome}. Segunda e última mensagem pós-proposta — 5 dias sem resposta. Deixe a porta aberta.`,
            `Oi ${nome}! Sei que está ocupado. Só queria deixar que a proposta continua disponível — qualquer dúvida, é só chamar! 🙌`,
          )
        }

        if (!message) continue

        sendAndLog(telefone, message, clienteId, '[PP]')
        $app.logger().info('PP sequence sent', 'cliente_id', clienteId, 'step', stepCount + 1)
      } catch (err) {
        $app.logger().error('PP sequence error', 'cliente_id', lead.id, 'error', String(err))
      }
    }
  } catch (err) {
    $app.logger().error('PP sequence fatal error', 'error', String(err))
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

cronAdd('followup_sequences', '0 * * * *', () => {
  $app.logger().info('Starting followup sequences...')
  runSemRespostaSequence()
  runPosReuniaoSequence()
  runPosPropostaSequence()
  $app.logger().info('Followup sequences done.')
})
