migrate(
  (app) => {
    // Normalize all existing phone numbers first
    const clients = $app.findRecordsByFilter('clientes', "telefone != ''", '', 0, 0)
    for (const client of clients) {
      const raw = client.getString('telefone')
      const cleaned = raw.replace(/\D/g, '')
      if (raw !== cleaned) {
        client.set('telefone', cleaned)
        $app.dao().saveRecord(client)
      }
    }

    // Deduplicate by phone and user_id
    const allClients = $app.findRecordsByFilter('clientes', "telefone != ''", 'created', 0, 0)

    const keepMap = {} // { "user_id_phone": clientRecord }

    for (const client of allClients) {
      const key = client.getString('user_id') + '_' + client.getString('telefone')
      if (!keepMap[key]) {
        keepMap[key] = client
      } else {
        const keeper = keepMap[key]

        // Move history
        const history = $app.findRecordsByFilter(
          'historico_contatos',
          `cliente_id = '${client.id}'`,
          '',
          0,
          0,
        )
        for (const h of history) {
          h.set('cliente_id', keeper.id)
          $app.dao().saveRecord(h)
        }

        // Move notes
        const notes = $app.findRecordsByFilter(
          'anotacoes_cliente',
          `cliente_id = '${client.id}'`,
          '',
          0,
          0,
        )
        for (const n of notes) {
          n.set('cliente_id', keeper.id)
          $app.dao().saveRecord(n)
        }

        // Move meetings
        const meetings = $app.findRecordsByFilter(
          'reunioes',
          `cliente_id = '${client.id}'`,
          '',
          0,
          0,
        )
        for (const m of meetings) {
          m.set('cliente_id', keeper.id)
          $app.dao().saveRecord(m)
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

        $app.dao().saveRecord(keeper)
        $app.dao().deleteRecord(client)
      }
    }
  },
  (app) => {
    // Can't automatically reverse deduplication
  },
)
