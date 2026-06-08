/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('clientes')
    if (!col.fields.getByName('checklist')) {
      col.fields.add(new JSONField({ name: 'checklist' }))
      dao.saveCollection(col)
    }
    // Agent update removed — agents use Claude API via pocketbase/hooks/zapi_webhook.js
  },
  (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('clientes')
    if (col.fields.getByName('checklist')) {
      col.fields.removeByName('checklist')
      dao.saveCollection(col)
    }
  },
)
