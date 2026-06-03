routerAdd(
  'POST',
  '/backend/v1/zapi-send',
  (e) => {
    const body = e.requestInfo().body || {}
    const clienteId = body.cliente_id
    const text = body.message

    if (!clienteId || !text) {
      return e.badRequestError('cliente_id and message are required')
    }

    let cliente
    try {
      cliente = $app.findRecordById('clientes', clienteId)
    } catch (_) {
      return e.notFoundError('Cliente not found')
    }

    const rawPhone = cliente.getString('telefone')
    if (!rawPhone) {
      return e.badRequestError('O cliente selecionado não possui um número de telefone cadastrado.')
    }

    let phone = rawPhone.replace(/\D/g, '')

    // Add Brazilian country code (55) automatically if missing
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone
    }

    const instanceId = $secrets.get('WA_INSTANCE_ID') || '3F410457AB25812690089A7EE4F1867E'
    const token = $secrets.get('WA_TOKEN') || '556AE67289E74FD28A396530'
    const clientToken =
      $secrets.get('ZAPI_CLIENT_TOKEN') ||
      $secrets.get('WA_CLIENT_TOKEN') ||
      'F6e10c7524601499e9a6591ecf0c56ca1S'

    let res
    try {
      res = $http.send({
        url: `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': clientToken,
        },
        body: JSON.stringify({ phone: phone, message: text }),
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('ZAPI Transport error', 'error', err.message)
      return e.badRequestError('Falha de conexão com a Z-API. Verifique o status da integração.')
    }

    if (res.statusCode >= 300) {
      let rawBody = ''
      try {
        if (res.body) {
          rawBody = new TextDecoder().decode(res.body)
        }
      } catch (_) {}

      $app
        .logger()
        .error(
          'ZAPI Error Response',
          'status',
          res.statusCode,
          'body',
          rawBody || JSON.stringify(res.json || {}),
          'headers',
          JSON.stringify(res.headers || {}),
        )

      let errMsg =
        'Falha ao enviar mensagem pelo WhatsApp. Verifique o status da instância Z-API ou o formato do telefone do cliente.'
      if (res.json) {
        errMsg = res.json.error || res.json.message || res.json.title || errMsg
      } else if (rawBody) {
        try {
          const parsed = JSON.parse(rawBody)
          errMsg = parsed.error || parsed.message || parsed.title || rawBody
        } catch (_) {
          errMsg = rawBody
        }
      }

      return e.badRequestError(errMsg)
    }

    const histCol = $app.findCollectionByNameOrId('historico_contatos')
    const outgoingMsg = new Record(histCol)
    outgoingMsg.set('cliente_id', cliente.id)
    outgoingMsg.set('tipo_contato', 'WhatsApp')
    outgoingMsg.set('descricao', `Enviado: ${text}`)
    outgoingMsg.set('data_contato', new Date().toISOString())
    $app.save(outgoingMsg)

    return e.json(200, { status: 'sent' })
  },
  $apis.requireAuth(),
)
