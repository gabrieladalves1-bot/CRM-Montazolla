migrate(
  (db) => {
    const dao = new Dao(db)
    const pastas = new Collection({
      name: 'pastas_documentos',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      schema: [
        new SchemaField({ name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'nome', type: 'text', required: true }),
      ],
    })
    dao.saveCollection(pastas)

    const documentos = new Collection({
      name: 'documentos',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      schema: [
        new SchemaField({ name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'pasta_id', type: 'relation', required: true, options: { collectionId: pastas.id, cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'titulo', type: 'text', required: true }),
        new SchemaField({ name: 'conteudo', type: 'editor', required: true }),
      ],
    })
    dao.saveCollection(documentos)
  },
  (db) => {
    const dao = new Dao(db)
    try { dao.deleteCollection(dao.findCollectionByNameOrId('documentos')) } catch (_) {}
    try { dao.deleteCollection(dao.findCollectionByNameOrId('pastas_documentos')) } catch (_) {}
  },
)
