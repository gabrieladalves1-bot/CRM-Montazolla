/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    if (!col.fields.getByName('checklist')) {
      col.fields.add(new JSONField({ name: 'checklist' }))
      app.save(col)
    }
    // Agent update removed — agents use Claude API via pocketbase/hooks/zapi_webhook.js
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    if (col.fields.getByName('checklist')) {
      col.fields.removeByName('checklist')
      app.save(col)
    }
  },
)
