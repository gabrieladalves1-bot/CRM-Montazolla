routerAdd('GET', '/backend/v1/ping', (e) => {
  return e.json(200, { ok: true, hooks: 'loaded' })
})
