migrate(
  (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('historico_contatos')
    col.fields.add(
      new SelectField({
        name: 'tipo_contato',
        values: [
          'Ligação',
          'WhatsApp',
          'Reunião',
          'Email',
          'Reunião Sincronizada',
          'Reunião Agendada',
        ],
        required: false,
      }),
    )
    dao.saveCollection(col)
  },
  (db) => {
    const dao = new Dao(db)
    const col = dao.findCollectionByNameOrId('historico_contatos')
    col.fields.add(
      new SelectField({
        name: 'tipo_contato',
        values: ['Ligação', 'WhatsApp', 'Reunião', 'Email'],
        required: false,
      }),
    )
    dao.saveCollection(col)
  },
)
