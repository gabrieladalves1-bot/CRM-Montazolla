migrate(
  (app) => {
    const col = app.dao().findCollectionByNameOrId('clientes')
    if (!col.fields.getByName('conversation_id')) {
      col.fields.add(new TextField({ name: 'conversation_id' }))
      app.dao().saveCollection(col)
    }
  },
  (app) => {
    const col = app.dao().findCollectionByNameOrId('clientes')
    if (col.fields.getByName('conversation_id')) {
      col.fields.removeByName('conversation_id')
      app.dao().saveCollection(col)
    }
  },
)
