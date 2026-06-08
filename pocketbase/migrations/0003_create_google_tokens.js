migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = new Collection({
      name: 'google_calendar_tokens',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      schema: [
        new SchemaField({ name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'access_token', type: 'text', required: true }),
        new SchemaField({ name: 'refresh_token', type: 'text' }),
        new SchemaField({ name: 'expires_at', type: 'date', required: true }),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_google_tokens_user ON google_calendar_tokens (user_id)'],
    })
    dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    try { dao.deleteCollection(dao.findCollectionByNameOrId('google_calendar_tokens')) } catch (_) {}
  },
)
