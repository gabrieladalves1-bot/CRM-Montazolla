migrate(
  (db) => {
    const dao = new Dao(db)
    const reunioes = new Collection({
      name: 'reunioes',
      type: 'base',
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: 'user_id = @request.auth.id',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id',
      schema: [
        new SchemaField({ name: 'cliente_id', type: 'relation', required: true, options: { collectionId: dao.findCollectionByNameOrId('clientes').id, cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'data_hora', type: 'date', required: true }),
        new SchemaField({ name: 'duracao_minutos', type: 'number', required: true }),
        new SchemaField({ name: 'descricao', type: 'text' }),
        new SchemaField({ name: 'link_reuniao', type: 'url', required: true }),
        new SchemaField({ name: 'status', type: 'select', required: true, options: { values: ['agendada', 'realizada', 'cancelada'], maxSelect: 1 } }),
        new SchemaField({ name: 'google_event_id', type: 'text' }),
        new SchemaField({ name: 'lembrete_1h', type: 'bool' }),
      ],
      indexes: [
        'CREATE INDEX idx_reunioes_cliente ON reunioes (cliente_id)',
        'CREATE INDEX idx_reunioes_user ON reunioes (user_id)',
      ],
    })
    dao.saveCollection(reunioes)
  },
  (db) => {
    const dao = new Dao(db)
    try { dao.deleteCollection(dao.findCollectionByNameOrId('reunioes')) } catch (_) {}
  },
)
