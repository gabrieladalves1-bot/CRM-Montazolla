// Use console.log (pure JS, no PocketBase globals needed)
console.log('[HOOK TEST A] _test_route.js IS executing')
console.log('[HOOK TEST B] $app defined:', typeof $app !== 'undefined')
console.log('[HOOK TEST C] routerAdd defined:', typeof routerAdd !== 'undefined')
console.log('[HOOK TEST D] cronAdd defined:', typeof cronAdd !== 'undefined')

if (typeof routerAdd !== 'undefined') {
  routerAdd('GET', '/backend/v1/ping', (c) => {
    return c.json(200, { ok: true, hooks: 'loaded' })
  })
  console.log('[HOOK TEST E] routerAdd called OK')
}
