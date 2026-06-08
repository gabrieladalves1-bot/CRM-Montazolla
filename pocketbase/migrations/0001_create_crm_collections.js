migrate(
  (db) => {
    const dao = new Dao(db)
    const users = dao.findCollectionByNameOrId('_pb_users_auth_')

    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id',
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'empresa', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'instagram_usuario', type: 'text' },
        { name: 'instagram_link', type: 'url' },
        {
          name: 'fonte_contato',
          type: 'select',
          values: ['Indicação', 'Prospecção', 'Mídia Paga', 'Orgânico'],
          maxSelect: 1,
        },
        {
          name: 'estagio_pipeline',
          type: 'select',
          values: [
            'Prospecção',
            'Sem Resposta',
            'Qualificado',
            'Reunião Agendada',
            'Reunião Realizada',
            'Proposta Enviada',
            'Contrato Assinado',
            'Onboarding',
          ],
          maxSelect: 1,
        },
        { name: 'valor_proposta', type: 'number' },
        { name: 'data_fechamento', type: 'date' },
        { name: 'data_contato', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clientes_user_id ON clientes (user_id)',
        'CREATE INDEX idx_clientes_estagio ON clientes (estagio_pipeline)',
        'CREATE INDEX idx_clientes_nome ON clientes (nome)',
      ],
    })
    dao.saveCollection(clientes)

    const anotacoes = new Collection({
      name: 'anotacoes_cliente',
      type: 'base',
      listRule: 'cliente_id.user_id = @request.auth.id',
      viewRule: 'cliente_id.user_id = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: 'cliente_id.user_id = @request.auth.id',
      deleteRule: 'cliente_id.user_id = @request.auth.id',
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'conteudo', type: 'editor', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_anotacoes_cliente_id ON anotacoes_cliente (cliente_id)'],
    })
    dao.saveCollection(anotacoes)

    const historico = new Collection({
      name: 'historico_contatos',
      type: 'base',
      listRule: 'cliente_id.user_id = @request.auth.id',
      viewRule: 'cliente_id.user_id = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: 'cliente_id.user_id = @request.auth.id',
      deleteRule: 'cliente_id.user_id = @request.auth.id',
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_contato',
          type: 'select',
          values: ['Ligação', 'WhatsApp', 'Reunião', 'Email'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'data_contato', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_historico_cliente_id ON historico_contatos (cliente_id)'],
    })
    dao.saveCollection(historico)
  },
  (db) => {
    const dao = new Dao(db)
    try {
      dao.deleteCollection(dao.findCollectionByNameOrId('historico_contatos'))
    } catch (_) {}
    try {
      dao.deleteCollection(dao.findCollectionByNameOrId('anotacoes_cliente'))
    } catch (_) {}
    try {
      dao.deleteCollection(dao.findCollectionByNameOrId('clientes'))
    } catch (_) {}
  },
)
