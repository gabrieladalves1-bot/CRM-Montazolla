// Automações gratuitas (sem IA). Roda a cada 15 minutos.
// Gerencia: lembrete de reunião (1h antes) + boas-vindas ao onboarding.

function getTemplate(slug) {
  try {
    const record = $app.findFirstRecordByFilter(
      'agentes_config',
      `slug = '${slug}' && ativo = true && tipo = 'automacao'`,
    )
    return record.getString('template_mensagem')
  } catch (_) {
    return null
  }
}

function applyTemplate(template, vars) {
  return template
    .replace(/\{\{nome\}\}/g, vars.nome || '')
    .replace(/\{\{empresa\}\}/g, vars.empresa || '')
    .replace(/\{\{data_hora\}\}/g, vars.data_hora || '')
    .replace(/\{\{link_reuniao\}\}/g, vars.link_reuniao || '')
}

function formatDateBR(isoString) {
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function sendWhatsApp(telefone, message) {
  const instanceId = $os.getenv('WA_INSTANCE_ID') || '3F410457AB25812690089A7EE4F1867E'
  const token = $os.getenv('WA_TOKEN') || '556AE67289E74FD28A396530'
  const clientToken =
    $os.getenv('ZAPI_CLIENT_TOKEN') ||
    $os.getenv('WA_CLIENT_TOKEN') ||
    'F6e10c7524601499e9a6591ecf0c56ca1S'

  try {
    const res = $http.send({
      url: `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken },
      body: JSON.stringify({ phone: telefone, message }),
      timeout: 15,
    })
    return res.statusCode === 200
  } catch (err) {
    $app.logger().error('ZApi error in automacao', 'error', err.message)
    return false
  }
}

function logHistorico(clienteId, descricao, tipo) {
  try {
    const col = $app.findCollectionByNameOrId('historico_contatos')
    const hist = new Record(col)
    hist.set('cliente_id', clienteId)
    hist.set('tipo_contato', tipo || 'WhatsApp')
    hist.set('descricao', descricao)
    hist.set('data_contato', new Date().toISOString())
    $app.save(hist)
  } catch (_) {}
}

// ─── Lembrete de Reunião (1h antes) ─────────────────────────────────────────
function runLembreteReuniao() {
  const template = getTemplate('lembrete_reuniao')
  if (!template) return

  const now = Date.now()
  const from = new Date(now + 45 * 60 * 1000).toISOString().replace('T', ' ')
  const to = new Date(now + 75 * 60 * 1000).toISOString().replace('T', ' ')

  try {
    const meetings = $app.findRecordsByFilter(
      'reunioes',
      `status = 'agendada' && data_hora >= {:from} && data_hora <= {:to}`,
      '+data_hora',
      50,
      0,
      { from, to },
    )

    for (const meeting of meetings) {
      try {
        const clienteId = meeting.getString('cliente_id')

        // Verifica se já enviou o lembrete
        const jaEnviou = $app.findRecordsByFilter(
          'historico_contatos',
          `cliente_id = '${clienteId}' && descricao ~ '[LEMBRETE]'`,
          '-created',
          1,
          0,
        )
        if (jaEnviou.length > 0) continue

        const cliente = $app.findRecordById('clientes', clienteId)
        const telefone = cliente.getString('telefone')
        if (!telefone) continue

        const mensagem = applyTemplate(template, {
          nome: cliente.getString('nome'),
          empresa: cliente.getString('empresa'),
          data_hora: formatDateBR(meeting.getString('data_hora')),
          link_reuniao: meeting.getString('link_reuniao') || '',
        })

        if (sendWhatsApp(telefone, mensagem)) {
          logHistorico(clienteId, `[LEMBRETE] ${mensagem}`, 'WhatsApp')
          $app.logger().info('Lembrete enviado', 'cliente_id', clienteId)
        }
      } catch (err) {
        $app.logger().error('Erro no lembrete', 'meeting_id', meeting.id, 'error', String(err))
      }
    }
  } catch (err) {
    $app.logger().error('Erro no cron lembrete_reuniao', 'error', String(err))
  }
}

// ─── Boas-vindas ao Onboarding ───────────────────────────────────────────────
function runBoasVindasOnboarding() {
  const template = getTemplate('boas_vindas_onboarding')
  if (!template) return

  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace('T', ' ')

  try {
    const leads = $app.findRecordsByFilter(
      'clientes',
      `estagio_pipeline = 'Onboarding' && telefone != '' && updated >= {:time}`,
      '-updated',
      50,
      0,
      { time: thirtyMinsAgo },
    )

    for (const lead of leads) {
      try {
        const clienteId = lead.id

        // Verifica se já enviou boas-vindas
        const jaEnviou = $app.findRecordsByFilter(
          'historico_contatos',
          `cliente_id = '${clienteId}' && descricao ~ '[ONBOARDING_BOAS_VINDAS]'`,
          '-created',
          1,
          0,
        )
        if (jaEnviou.length > 0) continue

        const telefone = lead.getString('telefone')
        const mensagem = applyTemplate(template, {
          nome: lead.getString('nome'),
          empresa: lead.getString('empresa'),
          data_hora: '',
          link_reuniao: '',
        })

        if (sendWhatsApp(telefone, mensagem)) {
          logHistorico(clienteId, `[ONBOARDING_BOAS_VINDAS] ${mensagem}`, 'WhatsApp')
          $app.logger().info('Boas-vindas onboarding enviado', 'cliente_id', clienteId)
        }
      } catch (err) {
        $app.logger().error('Erro no boas-vindas', 'cliente_id', lead.id, 'error', String(err))
      }
    }
  } catch (err) {
    $app.logger().error('Erro no cron boas_vindas_onboarding', 'error', String(err))
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────
cronAdd('automacoes_gratuitas', '*/15 * * * *', () => {
  runLembreteReuniao()
  runBoasVindasOnboarding()
})
