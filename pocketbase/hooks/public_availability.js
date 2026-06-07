routerAdd('GET', '/backend/v1/availability/{userId}', (e) => {
  try {
    let userId = e.request.pathValue('userId')
    if (!userId || userId === 'undefined' || userId === '{userId}') {
      userId = '5n0cy3l52tme5tm'
    }
    const query = e.requestInfo().query || {}
    const dateStr = query.date || e.request.url.query().get('date')

    if (!dateStr) return e.badRequestError('missing params')

    let tokenRecord = null
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

      if (accessToken) {
        hasCalendar = true
      }
    } catch (_) {
      hasCalendar = false
    }

    const tzOffset = '-03:00'
    const timeMin = `${dateStr}T00:00:00${tzOffset}`
    const timeMax = `${dateStr}T23:59:59${tzOffset}`

    let busySlots = []

    if (hasCalendar) {
      const fbRes = $http.send({
        url: 'https://www.googleapis.com/calendar/v3/freeBusy',
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin: new Date(timeMin).toISOString(),
          timeMax: new Date(timeMax).toISOString(),
          items: [{ id: 'primary' }],
        }),
      })

      if (fbRes.statusCode === 200) {
        const cals = fbRes.json.calendars || {}
        const primary = cals['primary'] || {}
        busySlots = primary.busy || []
      }
    }

    const minIso = new Date(timeMin).toISOString().replace('T', ' ')
    const maxIso = new Date(timeMax).toISOString().replace('T', ' ')

    const localReunioes = $app.findRecordsByFilter(
      'reunioes',
      `user_id = '${userId}' && status != 'cancelada' && data_hora >= '${minIso}' && data_hora <= '${maxIso}'`,
      '',
      100,
      0,
    )

    localReunioes.forEach((r) => {
      const start = new Date(r.getString('data_hora'))
      const end = new Date(start.getTime() + r.getInt('duracao_minutos') * 60000)
      busySlots.push({ start: start.toISOString(), end: end.toISOString() })
    })

    const slots = []
    const nowMs = Date.now()

    for (let h = 9; h < 18; h++) {
      for (let m of [0, 30]) {
        const mm = m === 0 ? '00' : '30'
        const hh = h < 10 ? `0${h}` : `${h}`
        const slotStartStr = `${dateStr}T${hh}:${mm}:00${tzOffset}`
        const slotStart = new Date(slotStartStr)
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000)

        if (slotStart.getTime() < nowMs + 3600000) continue

        let conflict = false
        for (const b of busySlots) {
          const bStart = new Date(b.start).getTime()
          const bEnd = new Date(b.end).getTime()
          if (slotStart.getTime() < bEnd && slotEnd.getTime() > bStart) {
            conflict = true
            break
          }
        }

        if (!conflict) {
          slots.push(slotStartStr)
        }
      }
    }

    return e.json(200, { slots })
  } catch (err) {
    $app.logger().error('availability error', 'err', err.message)
    return e.json(500, { error: err.message })
  }
})
