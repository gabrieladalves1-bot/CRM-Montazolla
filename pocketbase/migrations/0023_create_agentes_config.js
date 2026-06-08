migrate(
  (db) => {
    const dao = new Dao(db)
    try {
      dao.findCollectionByNameOrId('agentes_config')
      return
    } catch (_) {}

    const col = new Collection({
      type: 'base',
      name: 'agentes_config',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      schema: [
        new SchemaField({ name: 'slug', type: 'text', required: true }),
        new SchemaField({ name: 'nome', type: 'text', required: true }),
        new SchemaField({ name: 'system_prompt', type: 'text' }),
        new SchemaField({ name: 'ativo', type: 'bool' }),
        new SchemaField({ name: 'tipo', type: 'select', options: { values: ['agente', 'automacao'], maxSelect: 1 } }),
        new SchemaField({ name: 'template_mensagem', type: 'text' }),
      ],
    })
    dao.saveCollection(col)

    const antonio = new Record(col)
    antonio.set('slug', 'antonio')
    antonio.set('nome', 'Antonio')
    antonio.set('ativo', true)
    antonio.set('tipo', 'agente')
    antonio.set('system_prompt', 'Voce e o Antonio, consultor de vendas da Montazolla. Fluxo 3 etapas: 1) Engajamento 2) Qualificacao: peca descricao do negocio 3) Agendamento: envie https://app.montazolla.com/agendar')
    dao.saveRecord(antonio)

    const alexandre = new Record(col)
    alexandre.set('slug', 'alexandre')
    alexandre.set('nome', 'Alexandre')
    alexandre.set('ativo', true)
    alexandre.set('tipo', 'agente')
    alexandre.set('system_prompt', 'Voce e Alexandre, Consultor de Vendas da Montazolla. Prospecte em 3 passos: 1) Explique a Montazolla 2) Proponha reuniao 3) Envie https://app.montazolla.com/agendar')
    dao.saveRecord(alexandre)
  },
  (db) => {
    const dao = new Dao(db)
    try { dao.deleteCollection(dao.findCollectionByNameOrId('agentes_config')) } catch (_) {}
  },
)