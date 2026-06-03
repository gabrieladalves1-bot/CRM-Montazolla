onRecordAfterDeleteSuccess((e) => {
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

    $http.send({
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events/' + eventId,
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    })
  } catch (err) {
    $app
      .logger()
      .error('Failed to delete Google Calendar event', 'id', record.id, 'err', err.message)
  }
  return e.next()
}, 'reunioes')
