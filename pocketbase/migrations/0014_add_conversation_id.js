migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    if (!col.fields.getByName('conversation_id')) {
      col.fields.add(new TextField({ name: 'conversation_id' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')
    if (col.fields.getByName('conversation_id')) {
      col.fields.removeByName('conversation_id')
      app.save(col)
    }
  },
)
