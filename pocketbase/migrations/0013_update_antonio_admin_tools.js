/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    // Agent tools update removed — agents use Claude API via pocketbase/hooks/zapi_webhook.js
  },
  (db) => {
    const dao = new Dao(db)},
)
