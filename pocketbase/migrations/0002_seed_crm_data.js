migrate(
  (db) => {
    const dao = new Dao(db)
    const users = dao.findCollectionByNameOrId('_pb_users_auth_')
    let user
    try {
      user = dao.findAuthRecordByEmail('_pb_users_auth_', 'gabriel.adalves1@gmail.com')
    } catch (_) {
      user = new Record(users)
      user.setEmail('gabriel.adalves1@gmail.com')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Admin')
      user.set('username', 'gabriel')
      dao.saveRecord(user)
    }

    const clientes = dao.findCollectionByNameOrId('clientes')
    const seedClients = [
      {
        nome: 'Ana Silva',
        empresa: 'Loja de Roupas',
        fonte_contato: 'Prospecção',
        estagio_pipeline: 'Prospecção',
        telefone: '(11) 99999-1111',
        email: 'ana@loja.com',
      },
      {
        nome: 'Carlos Oliveira',
        empresa: 'Padaria',
        fonte_contato: 'Orgânico',
        estagio_pipeline: 'Prospecção',
        telefone: '(11) 99999-2222',
        email: 'carlos@padaria.com',
      },
      {
        nome: 'Mariana Santos',
        empresa: 'Salão',
        fonte_contato: 'Indicação',
        estagio_pipeline: 'Prospecção',
        telefone: '(11) 99999-3333',
        email: 'mariana@salao.com',
      },
    ]

    let anaRecord = null

    for (const c of seedClients) {
      try {
        const existing = dao.findFirstRecordByFilter(
          'clientes',
          "nome = '" + c.nome + "' && user_id = '" + user.id + "'",
        )
        if (c.nome === 'Ana Silva') anaRecord = existing
      } catch (_) {
        const record = new Record(clientes)
        record.set('user_id', user.id)
        record.set('nome', c.nome)
        record.set('empresa', c.empresa)
        record.set('fonte_contato', c.fonte_contato)
        record.set('estagio_pipeline', c.estagio_pipeline)
        record.set('telefone', c.telefone)
        record.set('email', c.email)
        record.set('data_contato', new Date().toISOString())
        dao.saveRecord(record)
        if (c.nome === 'Ana Silva') anaRecord = record
      }
    }

    if (anaRecord) {
      const historico = dao.findCollectionByNameOrId('historico_contatos')
      try {
        dao.findFirstRecordByFilter('historico_contatos', "cliente_id = '" + anaRecord.id + "'")
      } catch (_) {
        const hRecord = new Record(historico)
        hRecord.set('cliente_id', anaRecord.id)
        hRecord.set('tipo_contato', 'WhatsApp')
        hRecord.set('descricao', 'Primeiro contato realizado para apresentar nossos serviços.')
        hRecord.set('data_contato', new Date().toISOString())
        dao.saveRecord(hRecord)
      }

      const anotacoes = dao.findCollectionByNameOrId('anotacoes_cliente')
      try {
        dao.findFirstRecordByFilter('anotacoes_cliente', "cliente_id = '" + anaRecord.id + "'")
      } catch (_) {
        const aRecord = new Record(anotacoes)
        aRecord.set('cliente_id', anaRecord.id)
        aRecord.set(
          'conteudo',
          '<p>Cliente tem muito interesse nos serviços. Sugeriu retorno na próxima semana.</p>',
        )
        dao.saveRecord(aRecord)
      }
    }
  },
  (db) => {
    const dao = new Dao(db)
    try {
      const user = dao.findAuthRecordByEmail('_pb_users_auth_', 'gabriel.adalves1@gmail.com')
      dao.deleteRecord(user)
    } catch (_) {}
  },
)
