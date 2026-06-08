migrate(
  (app) => {
    const reunioes = new Collection({
      name: 'reunioes',
      type: 'base',
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: 'user_id = @request.auth.id',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id',
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: $app.dao().findCollectionByNameOrId('clientes').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data_hora', type: 'date', required: true },
        { name: 'duracao_minutos', type: 'number', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'link_reuniao', type: 'url', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['agendada', 'realizada', 'cancelada'],
          maxSelect: 1,
        },
        { name: 'google_event_id', type: 'text' },
        { name: 'lembrete_1h', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_reunioes_cliente ON reunioes (cliente_id)',
        'CREATE INDEX idx_reunioes_user ON reunioes (user_id)',
      ],
    })
    $app.dao().saveCollection(reunioes)
  },
  (app) => {
    const reunioes = $app.dao().findCollectionByNameOrId('reunioes')
    $app.dao().deleteCollection(reunioes)
  },
)
