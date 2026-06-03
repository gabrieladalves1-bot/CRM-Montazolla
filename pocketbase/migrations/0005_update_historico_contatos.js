migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('historico_contatos')
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
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('historico_contatos')
    col.fields.add(
      new SelectField({
        name: 'tipo_contato',
        values: ['Ligação', 'WhatsApp', 'Reunião', 'Email'],
        required: false,
      }),
    )
    app.save(col)
  },
)
