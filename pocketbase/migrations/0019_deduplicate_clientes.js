migrate(
  (db) => {
    const dao = new Dao(db)
    // Normalize all existing phone numbers first
    const clients = dao.findRecordsByFilter('clientes', "telefone != ''", '', 0, 0)
    for (const client of clients) {
      const raw = client.getString('telefone')
      const cleaned = raw.replace(/\D/g, '')
      if (raw !== cleaned) {
        client.set('telefone', cleaned)
        dao.saveRecord(client)
      }
    }

    // Deduplicate by phone and user_id
    const allClients = dao.findRecordsByFilter('clientes', "telefone != ''", 'created', 0, 0)

    const keepMap = {} // { "user_id_phone": clientRecord }

    for (const client of allClients) {
      const key = client.getString('user_id') + '_' + client.getString('telefone')
      if (!keepMap[key]) {
        keepMap[key] = client
      } else {
        const keeper = keepMap[key]

        // Move history
        const history = dao.findRecordsByFilter(
          'historico_contatos',
          `cliente_id = '${client.id}'`,
          '',
          0,
          0,
        )
        for (const h of history) {
          h.set('cliente_id', keeper.id)
          dao.saveRecord(h)
        }

        // Move notes
        const notes = dao.findRecordsByFilter(
          'anotacoes_cliente',
          `cliente_id = '${client.id}'`,
          '',
          0,
          0,
        )
        for (const n of notes) {
          n.set('cliente_id', keeper.id)
          dao.saveRecord(n)
        }

        // Move meetings
        const meetings = dao.findRecordsByFilter(
          'reunioes',
          `cliente_id = '${client.id}'`,
          '',
          0,
          0,
        )
        for (const m of meetings) {
          m.set('cliente_id', keeper.id)
          dao.saveRecord(m)
        }

        // Merge data
        if (!keeper.getString('conversation_id') && client.getString('conversation_id')) {
          keeper.set('conversation_id', client.getString('conversation_id'))
        }
        if (!keeper.getString('email') && client.getString('email')) {
          keeper.set('email', client.getString('email'))
        }
        if (!keeper.getString('instagram_usuario') && client.getString('instagram_usuario')) {
          keeper.set('instagram_usuario', client.getString('instagram_usuario'))
        }

        dao.saveRecord(keeper)
        dao.deleteRecord(client)
      }
    }
  },
  (db) => {
    const dao = new Dao(db)
    // Can't automatically reverse deduplication
  },
)
