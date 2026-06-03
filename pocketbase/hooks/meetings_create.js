routerAdd(
  'POST',
  '/backend/v1/meetings',
  (e) => {
    const body = e.requestInfo().body
    if (!body.cliente_id || !body.data_hora || !body.duracao_minutos) {
      return e.badRequestError('Dados inválidos.', { geral: 'Dados obrigatórios faltando.' })
    }

    let tokenRecord = null
    try {
      tokenRecord = $app.findFirstRecordByData('google_calendar_tokens', 'user_id', e.auth.id)
    } catch (_) {
      return e.badRequestError('Google Calendar não conectado.', {
        google: 'Conecte sua conta do Google Calendar primeiro na área de configurações.',
      })
    }

    let accessToken = tokenRecord.getString('access_token')
    const expiresAt = tokenRecord.getDateTime('expires_at')

    if (new Date() >= expiresAt.time()) {
      const refreshToken = tokenRecord.getString('refresh_token')
      if (!refreshToken) {
        return e.badRequestError('Token expirado e sem refresh token.', {
          google: 'Sua sessão com o Google expirou. Conecte sua conta novamente.',
        })
      }
      const clientId = $secrets.get('GOOGLE_CALENDAR_CLIENT_ID')
      const clientSecret = $secrets.get('GOOGLE_CALENDAR_CLIENT_SECRET')

      const res = $http.send({
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`,
        timeout: 15,
      })

      if (res.statusCode === 200 && res.json.access_token) {
        accessToken = res.json.access_token
        tokenRecord.set('access_token', accessToken)
        const newExpires = new Date(Date.now() + res.json.expires_in * 1000)
        tokenRecord.set('expires_at', newExpires.toISOString())
        $app.saveNoValidate(tokenRecord)
      } else {
        return e.badRequestError('Falha ao atualizar token do Google.', {
          google: 'Não foi possível renovar a conexão com o Google. Conecte novamente.',
        })
      }
    }

    const cliente = $app.findRecordById('clientes', body.cliente_id)

    const startDate = new Date(body.data_hora)
    const endDate = new Date(startDate.getTime() + body.duracao_minutos * 60000)

    const requestId = $security.randomString(10)
    const eventPayload = {
      summary: `Reunião: ${cliente.getString('nome')}`,
      description: body.descricao || '',
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: body.lembrete_1h ? [{ method: 'popup', minutes: 60 }] : [],
      },
    }

    const gRes = $http.send({
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
      timeout: 15,
    })

    let googleEventId = ''
    let meetLink = body.link_reuniao || ''
    if (gRes.statusCode === 200 && gRes.json.id) {
      googleEventId = gRes.json.id
      if (gRes.json.hangoutLink) {
        meetLink = gRes.json.hangoutLink
      }
    } else {
      $app
        .logger()
        .error(
          'Falha ao criar evento no Google Calendar',
          'status',
          gRes.statusCode,
          'body',
          JSON.stringify(gRes.json),
        )
      return e.badRequestError('Falha ao agendar no Google Calendar.', {
        google: 'Ocorreu um erro ao registrar no Google Calendar. Tente novamente mais tarde.',
      })
    }

    let reuniao
    let historico

    $app.runInTransaction((txApp) => {
      const reunioesCol = txApp.findCollectionByNameOrId('reunioes')
      reuniao = new Record(reunioesCol)
      reuniao.set('cliente_id', body.cliente_id)
      reuniao.set('user_id', e.auth.id)
      reuniao.set('data_hora', startDate.toISOString())
      reuniao.set('duracao_minutos', body.duracao_minutos)
      reuniao.set('descricao', body.descricao || '')
      reuniao.set('link_reuniao', meetLink)
      reuniao.set('status', 'agendada')
      reuniao.set('google_event_id', googleEventId)
      reuniao.set('lembrete_1h', body.lembrete_1h)
      txApp.save(reuniao)

      const clienteRec = txApp.findRecordById('clientes', body.cliente_id)
      clienteRec.set('estagio_pipeline', 'Reunião Agendada')
      txApp.save(clienteRec)

      const historicoCol = txApp.findCollectionByNameOrId('historico_contatos')
      historico = new Record(historicoCol)
      historico.set('cliente_id', body.cliente_id)
      historico.set('tipo_contato', 'Reunião')

      const day = String(startDate.getDate()).padStart(2, '0')
      const month = String(startDate.getMonth() + 1).padStart(2, '0')
      const year = startDate.getFullYear()
      const hours = String(startDate.getHours()).padStart(2, '0')
      const minutes = String(startDate.getMinutes()).padStart(2, '0')

      historico.set(
        'descricao',
        `Reunião Agendada para ${day}/${month}/${year} às ${hours}:${minutes} (${body.duracao_minutos}min).\nLink: ${meetLink}`,
      )
      historico.set('data_contato', startDate.toISOString())
      txApp.save(historico)
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
