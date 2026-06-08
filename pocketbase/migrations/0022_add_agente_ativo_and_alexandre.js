/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const clientes = app.dao().findCollectionByNameOrId('clientes')
    if (!clientes.fields.getByName('agente_ativo')) {
      clientes.fields.add(
        new SelectField({
          name: 'agente_ativo',
          values: ['Antônio', 'Alexandre', 'Manual'],
          maxSelect: 1,
        }),
      )
      app.dao().saveCollection(clientes)
    }

    app
      .db()
      .newQuery(
        `UPDATE clientes SET agente_ativo = 'Antônio' WHERE agente_ativo IS NULL OR agente_ativo = ''`,
      )
      .execute()

    // Agent definitions removed — agents use Claude API via pocketbase/hooks/zapi_webhook.js
  },
  (app) => {},
)
