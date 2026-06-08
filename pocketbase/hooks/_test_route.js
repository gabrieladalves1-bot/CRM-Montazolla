// Test A: Does the file even load? (should appear in Railway logs immediately)
try {
  $app.logger().warn('[HOOK TEST] _test_route.js is being EXECUTED by JSVM')
} catch (_) {}

// Test B: routerAdd
try {
  routerAdd('GET', '/backend/v1/ping', (c) => {
    return c.json(200, { ok: true, hooks: 'loaded' })
  })
  $app.logger().warn('[HOOK TEST] routerAdd for /backend/v1/ping called OK')
} catch (err) {
  try { $app.logger().error('[HOOK TEST] routerAdd FAILED: ' + String(err)) } catch (_) {}
}

// Test C: cron fires after 1 min — proves hooks loaded if visible in logs
try {
  cronAdd('_test_hook_alive', '* * * * *', () => {
    $app.logger().warn('[HOOK TEST] CRON FIRED - hooks are definitely loaded!')
  })
  $app.logger().warn('[HOOK TEST] cronAdd called OK')
} catch (err) {
  try { $app.logger().error('[HOOK TEST] cronAdd FAILED: ' + String(err)) } catch (_) {}
}
