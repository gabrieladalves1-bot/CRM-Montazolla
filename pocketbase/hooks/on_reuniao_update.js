onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const eventId = record.getString('google_event_id')
  if (!eventId) return e.next()

  try {
    const tokenRecord = $app.findFirstRecordByData(
      'google_calendar_tokens',
      'user_id',
      record.getString('user_id'),
    )
    const accessToken = tokenRecord.getString('access_token')

    const startTime = new Date(record.getString('data_hora'))
    const duration = record.getInt('duracao_minutos') || 60
    const endTime = new Date(startTime.getTime() + duration * 60000)

    $http.send({
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events/' + eventId,
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: record.getString('descricao') || '',
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
      }),
    })
  } catch (err) {
    $app
      .logger()
      .error('Failed to update Google Calendar event', 'id', record.id, 'err', err.message)
  }
  return e.next()
}, 'reunioes')
