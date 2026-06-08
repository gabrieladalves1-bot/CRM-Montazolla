migrate(
  (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('clientes')
    if (!col.fields.getByName('conversation_id')) {
      col.fields.add(new TextField({ name: 'conversation_id' }))
      dao.saveCollection(col)
    }
  },
  (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('clientes')
    if (col.fields.getByName('conversation_id')) {
      col.fields.removeByName('conversation_id')
      dao.saveCollection(col)
    }
  },
)
