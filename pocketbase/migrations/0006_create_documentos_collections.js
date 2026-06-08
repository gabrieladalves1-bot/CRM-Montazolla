migrate(
  (app) => {
    const pastas = new Collection({
      name: 'pastas_documentos',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.dao().saveCollection(pastas)

    const documentos = new Collection({
      name: 'documentos',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'pasta_id',
          type: 'relation',
          required: true,
          collectionId: pastas.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'conteudo', type: 'editor', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.dao().saveCollection(documentos)

    // Seed Data
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'gabriel.adalves1@gmail.com')
      const pastaRecord = new Record(pastas)
      pastaRecord.set('user_id', user.id)
      pastaRecord.set('nome', 'Documentos Gerais')
      app.dao().saveRecord(pastaRecord)
    } catch (_) {}
  },
  (app) => {
    try {
      const docs = app.dao().findCollectionByNameOrId('documentos')
      app.dao().deleteCollection(docs)
    } catch (_) {}
    try {
      const pastas = app.dao().findCollectionByNameOrId('pastas_documentos')
      app.dao().deleteCollection(pastas)
    } catch (_) {}
  },
)
