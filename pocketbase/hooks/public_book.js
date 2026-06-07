routerAdd('POST', '/backend/v1/book/{userId}', (e) => {
  let userId = e.request.pathValue('userId')
  if (!userId || userId === 'undefined' || userId === '{userId}') {
    userId = '5n0cy3l52tme5tm'
  }
  const body = e.requestInfo().body || {}
  const { nome, empresa, telefone, instagram_usuario, assunto, data_hora } = body

  if (!nome || !telefone || !instagram_usuario || !assunto || !data_hora) {
    return e.badRequestError('Missing required fields')
  }

  const phone = telefone.replace(/\D/g, '')

  let tokenRecord
  let accessToken = ''
  let hasCalendar = false
  try {
    tokenRecord = $app.findFirstRecordByData('google_calendar_tokens', 'user_id', userId)
    accessToken = tokenRecord.getString('access_token')
    const expiresAt = new Date(tokenRecord.getString('expires_at')).getTime()
    const now = Date.now()
    if (now >= expiresAt - 60000) {
      const refreshToken = tokenRecord.getString('refresh_token')
      const clientId = $os.getenv('GOOGLE_CALENDAR_CLIENT_ID')
      const clientSecret = $os.getenv('GOOGLE_CALENDAR_CLIENT_SECRET')
      if (refreshToken && clientId && clientSecret) {
        const res = $http.send({
          url: 'https://oauth2.googleapis.com/token',
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`,
        })
        if (res.statusCode === 200) {
          accessToken = res.json.access_token
          tokenRecord.set('access_token', accessToken)
          tokenRecord.set('expires_at', new Date(now + res.json.expires_in * 1000).toISOString())
          $app.saveNoValidate(tokenRecord)
        }
      }
    }
    hasCalendar = true
  } catch (_) {
    hasCalendar = false
  }

  const slotStart = new Date(data_hora)
  const slotEnd = new Date(slotStart.getTime() + 30 * 60000)

  let meetLink = ''
  let eventId = ''

  if (hasCalendar) {
    const eventBody = {
      summary: `Reunião: ${nome}`,
      description: `Nome: ${nome}\nEmpresa: ${empresa || ''}\nInstagram: ${instagram_usuario}\nTelefone: ${telefone}\nAssunto: ${assunto}`,
      start: { dateTime: slotStart.toISOString() },
      end: { dateTime: slotEnd.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    const evtRes = $http.send({
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    })

    if (evtRes.statusCode === 200 || evtRes.statusCode === 201) {
      meetLink = evtRes.json.hangoutLink || ''
      eventId = evtRes.json.id
    } else {
      $app.logger().error('Failed to create Google Event', 'res', JSON.stringify(evtRes.json || {}))
    }
  }

  let clienteId = ''
  $app.runInTransaction((txApp) => {
    let clienteRecord
    try {
      const records = txApp.findRecordsByFilter(
        'clientes',
        `telefone = '{:telefone}' && user_id = '{:user}'`,
        '',
        1,
        0,
        { telefone: phone, user: userId },
      )
      if (records.length > 0) {
        clienteRecord = records[0]
        clienteRecord.set('estagio_pipeline', 'Reunião Agendada')
        txApp.save(clienteRecord)
      } else {
        throw new Error('not found')
      }
    } catch (_) {
      const clientesCol = txApp.findCollectionByNameOrId('clientes')
      clienteRecord = new Record(clientesCol)
      clienteRecord.set('user_id', userId)
      clienteRecord.set('nome', nome)
      clienteRecord.set('empresa', empresa || nome)
      clienteRecord.set('instagram_usuario', instagram_usuario)
      clienteRecord.set('telefone', phone)
      clienteRecord.set('fonte_contato', 'Prospecção')
      clienteRecord.set('estagio_pipeline', 'Reunião Agendada')
      clienteRecord.set('data_contato', new Date().toISOString())
      txApp.save(clienteRecord)
    }
    clienteId = clienteRecord.id

    const reunioesCol = txApp.findCollectionByNameOrId('reunioes')
    const reuniaoRecord = new Record(reunioesCol)
    reuniaoRecord.set('user_id', userId)
    reuniaoRecord.set('cliente_id', clienteId)
    reuniaoRecord.set('data_hora', slotStart.toISOString())
    reuniaoRecord.set('duracao_minutos', 30)
    reuniaoRecord.set('descricao', assunto)
    reuniaoRecord.set('status', 'agendada')
    reuniaoRecord.set('link_reuniao', meetLink)
    reuniaoRecord.set('google_event_id', eventId)
    txApp.save(reuniaoRecord)
  })

  return e.json(200, { success: true })
})
