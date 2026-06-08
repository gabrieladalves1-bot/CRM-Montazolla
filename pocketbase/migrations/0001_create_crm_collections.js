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
      schema: [
        new SchemaField({ name: 'user_id', type: 'relation', required: true, options: { collectionId: users.id, cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'nome', type: 'text', required: true }),
        new SchemaField({ name: 'empresa', type: 'text', required: true }),
        new SchemaField({ name: 'telefone', type: 'text' }),
        new SchemaField({ name: 'email', type: 'email' }),
        new SchemaField({ name: 'instagram_usuario', type: 'text' }),
        new SchemaField({ name: 'instagram_link', type: 'url' }),
        new SchemaField({ name: 'fonte_contato', type: 'select', options: { values: ['Indicação', 'Prospecção', 'Mídia Paga', 'Orgânico'], maxSelect: 1 } }),
        new SchemaField({ name: 'estagio_pipeline', type: 'select', options: { values: ['Prospecção', 'Sem Resposta', 'Qualificado', 'Reunião Agendada', 'Reunião Realizada', 'Proposta Enviada', 'Contrato Assinado', 'Onboarding'], maxSelect: 1 } }),
        new SchemaField({ name: 'valor_proposta', type: 'number' }),
        new SchemaField({ name: 'data_fechamento', type: 'date' }),
        new SchemaField({ name: 'data_contato', type: 'date', required: true }),
        new SchemaField({ name: 'endereco', type: 'text' }),
        new SchemaField({ name: 'site', type: 'url' }),
        new SchemaField({ name: 'categoria', type: 'text' }),
        new SchemaField({ name: 'maps_url', type: 'url' }),
        new SchemaField({ name: 'avaliacao', type: 'number' }),
        new SchemaField({ name: 'total_avaliacoes', type: 'number' }),
        new SchemaField({ name: 'conversation_id', type: 'text' }),
        new SchemaField({ name: 'checklist', type: 'json' }),
        new SchemaField({ name: 'agente_ativo', type: 'select', options: { values: ['Antônio', 'Alexandre', 'Manual'], maxSelect: 1 } }),
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
      schema: [
        new SchemaField({ name: 'cliente_id', type: 'relation', required: true, options: { collectionId: clientes.id, cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'conteudo', type: 'editor', required: true }),
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
      schema: [
        new SchemaField({ name: 'cliente_id', type: 'relation', required: true, options: { collectionId: clientes.id, cascadeDelete: true, maxSelect: 1 } }),
        new SchemaField({ name: 'tipo_contato', type: 'select', options: { values: ['Ligação', 'WhatsApp', 'Reunião', 'Email', 'Reunião Sincronizada', 'Reunião Agendada'], maxSelect: 1 } }),
        new SchemaField({ name: 'descricao', type: 'text', required: true }),
        new SchemaField({ name: 'data_contato', type: 'date', required: true }),
      ],
      indexes: ['CREATE INDEX idx_historico_cliente_id ON historico_contatos (cliente_id)'],
    })
    dao.saveCollection(historico)
  },
  (db) => {
    const dao = new Dao(db)
    try { dao.deleteCollection(dao.findCollectionByNameOrId('historico_contatos')) } catch (_) {}
    try { dao.deleteCollection(dao.findCollectionByNameOrId('anotacoes_cliente')) } catch (_) {}
    try { dao.deleteCollection(dao.findCollectionByNameOrId('clientes')) } catch (_) {}
  },
)
