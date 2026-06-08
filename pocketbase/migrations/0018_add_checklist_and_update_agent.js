/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = $app.dao().findCollectionByNameOrId('clientes')
    if (!col.fields.getByName('checklist')) {
      col.fields.add(new JSONField({ name: 'checklist' }))
      $app.dao().saveCollection(col)
    }
    // Agent update removed — agents use Claude API via pocketbase/hooks/zapi_webhook.js
  },
  (app) => {
    const col = $app.dao().findCollectionByNameOrId('clientes')
    if (col.fields.getByName('checklist')) {
      col.fields.removeByName('checklist')
      $app.dao().saveCollection(col)
    }
  },
)
