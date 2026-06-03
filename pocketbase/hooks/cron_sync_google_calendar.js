cronAdd('sync_google_calendar', '*/15 * * * *', () => {
  let tokens = []
  try {
    tokens = $app.findRecordsByFilter('google_calendar_tokens', '1=1', '', 1000, 0)
  } catch (_) {
    return
  }

  const clientId = $secrets.get('GOOGLE_CALENDAR_CLIENT_ID')
  const clientSecret = $secrets.get('GOOGLE_CALENDAR_CLIENT_SECRET')

  for (const tokenRecord of tokens) {
    const userId = tokenRecord.getString('user_id')
    try {
      let accessToken = tokenRecord.getString('access_token')
      const expiresAt = new Date(tokenRecord.getString('expires_at'))
      const refreshToken = tokenRecord.getString('refresh_token')

      if (expiresAt.getTime() - Date.now() < 300000) {
        if (!refreshToken) continue
        const res = $http.send({
          url: 'https://oauth2.googleapis.com/token',
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`,
          timeout: 15,
        })
        if (res.statusCode !== 200) continue
        accessToken = res.json.access_token
        tokenRecord.set('access_token', accessToken)
        tokenRecord.set(
          'expires_at',
          new Date(Date.now() + res.json.expires_in * 1000).toISOString(),
        )
        $app.save(tokenRecord)
      }

      const date = new Date()
      date.setDate(date.getDate() - 30)
      const timeMin = date.toISOString()
      const eventsRes = $http.send({
        url: `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&maxResults=2500`,
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 15,
      })

      if (eventsRes.statusCode !== 200) continue

      const events = eventsRes.json.items || []

      $app.runInTransaction((txApp) => {
        for (const event of events) {
          const googleEventId = event.id
          if (!googleEventId) continue

          const start = event.start?.dateTime || event.start?.date
          const end = event.end?.dateTime || event.end?.date
          if (!start) continue

          const startDt = new Date(start)
          const endDt = new Date(end || start)
          const duration = Math.round((endDt.getTime() - startDt.getTime()) / 60000)

          const link = event.hangoutLink || event.htmlLink || ''
          const descricao = event.description || event.summary || ''

          let status = 'agendada'
          if (event.status === 'cancelled') {
            status = 'cancelada'
          } else if (startDt.getTime() < Date.now()) {
            status = 'realizada'
          }

          let reuniao
          try {
            reuniao = txApp.findFirstRecordByFilter(
              'reunioes',
              'google_event_id = {:id} && user_id = {:uid}',
              { id: googleEventId, uid: userId },
            )
          } catch (_) {}

          if (reuniao) {
            reuniao.set('status', status)
            reuniao.set('descricao', descricao)
            reuniao.set('data_hora', startDt.toISOString())
            reuniao.set('duracao_minutos', duration)
            reuniao.set('link_reuniao', link)
            txApp.save(reuniao)
          } else {
            const attendees = event.attendees || []
            let clienteId = null
            for (const att of attendees) {
              if (att.email) {
                try {
                  const cli = txApp.findFirstRecordByFilter(
                    'clientes',
                    'email = {:email} && user_id = {:uid}',
                    { email: att.email, uid: userId },
                  )
                  clienteId = cli.id
                  break
                } catch (_) {}
              }
            }

            if (clienteId) {
              const reunioesCol = txApp.findCollectionByNameOrId('reunioes')
              const newReuniao = new Record(reunioesCol)
              newReuniao.set('cliente_id', clienteId)
              newReuniao.set('user_id', userId)
              newReuniao.set('data_hora', startDt.toISOString())
              newReuniao.set('duracao_minutos', duration)
              newReuniao.set('descricao', descricao)
              newReuniao.set('link_reuniao', link)
              newReuniao.set('status', status)
              newReuniao.set('google_event_id', googleEventId)
              txApp.save(newReuniao)

              const histCol = txApp.findCollectionByNameOrId('historico_contatos')
              const hist = new Record(histCol)
              hist.set('cliente_id', clienteId)
              hist.set('tipo_contato', 'Reunião Sincronizada')

              const year = startDt.getFullYear()
              const month = String(startDt.getMonth() + 1).padStart(2, '0')
              const day = String(startDt.getDate()).padStart(2, '0')
              const dateStr = `${day}/${month}/${year}`

              const hours = String(startDt.getHours()).padStart(2, '0')
              const minutes = String(startDt.getMinutes()).padStart(2, '0')
              const timeStr = `${hours}:${minutes}`

              hist.set(
                'descricao',
                `Data: ${dateStr}\nHora: ${timeStr}\nLink: ${link || 'Sem link'}\n\n${descricao}`,
              )
              hist.set('data_contato', startDt.toISOString())
              txApp.save(hist)
            }
          }
        }
      })
    } catch (err) {
      $app.logger().error('Cron sync error', 'userId', userId, 'error', err.message)
    }
  }
})
