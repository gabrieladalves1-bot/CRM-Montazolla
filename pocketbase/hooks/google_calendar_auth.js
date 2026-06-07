routerAdd(
  'POST',
  '/backend/v1/google-calendar-auth',
  (e) => {
    const body = e.requestInfo().body
    const code = body.code
    const redirectUri = body.redirectUri

    if (!code || !redirectUri) {
      return e.badRequestError('Missing code or redirectUri')
    }

    const clientId = $os.getenv('GOOGLE_CALENDAR_CLIENT_ID')
    const clientSecret = $os.getenv('GOOGLE_CALENDAR_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      return e.internalServerError('Google API credentials not configured')
    }

    const res = $http.send({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&grant_type=authorization_code`,
      timeout: 15,
    })

    if (res.statusCode !== 200) {
      $app
        .logger()
        .error(
          'Google Auth Error',
          'status',
          res.statusCode,
          'body',
          JSON.stringify(res.json || {}),
        )
      return e.badRequestError('Failed to exchange code for tokens')
    }

    const data = res.json
    const accessToken = data.access_token
    const refreshToken = data.refresh_token
    const expiresIn = data.expires_in

    if (!accessToken) {
      return e.badRequestError('No access token returned')
    }

    const userId = e.auth && e.auth.id
    if (!userId) {
      return e.unauthorizedError('Authentication required')
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    let tokenRecord
    try {
      tokenRecord = $app.findFirstRecordByData('google_calendar_tokens', 'user_id', userId)
    } catch (_) {
      const collection = $app.findCollectionByNameOrId('google_calendar_tokens')
      tokenRecord = new Record(collection)
      tokenRecord.set('user_id', userId)
    }

    tokenRecord.set('access_token', accessToken)
    if (refreshToken) {
      tokenRecord.set('refresh_token', refreshToken)
    }
    tokenRecord.set('expires_at', expiresAt)

    $app.save(tokenRecord)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
