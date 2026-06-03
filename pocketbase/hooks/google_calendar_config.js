routerAdd(
  'GET',
  '/backend/v1/google-calendar-config',
  (e) => {
    const clientId = $secrets.get('GOOGLE_CALENDAR_CLIENT_ID')
    return e.json(200, { clientId: clientId || '' })
  },
  $apis.requireAuth(),
)
