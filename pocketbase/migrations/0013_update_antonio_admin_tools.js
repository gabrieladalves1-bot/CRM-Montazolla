/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.deleteTools(app, 'antonio', [
      'clientes',
      'reunioes',
      'historico_contatos',
      'anotacoes_cliente',
    ])
    $ai.agents.putTools(app, 'antonio', [
      {
        collection: 'clientes',
        perms: { list: true, read: true, create: true, update: true },
        actAs: 'admin',
        scopeFilter: 'user_id = @request.auth.id',
      },
      {
        collection: 'reunioes',
        perms: { list: true, read: true, create: true, update: true },
        actAs: 'admin',
        scopeFilter: 'user_id = @request.auth.id',
      },
      {
        collection: 'historico_contatos',
        perms: { list: true, read: true, create: true, update: true },
        actAs: 'admin',
        scopeFilter: 'cliente_id.user_id = @request.auth.id',
      },
      {
        collection: 'anotacoes_cliente',
        perms: { list: true, read: true, create: true, update: true },
        actAs: 'admin',
        scopeFilter: 'cliente_id.user_id = @request.auth.id',
      },
    ])
  },
  (app) => {
    $ai.agents.deleteTools(app, 'antonio', [
      'clientes',
      'reunioes',
      'historico_contatos',
      'anotacoes_cliente',
    ])
    $ai.agents.putTools(app, 'antonio', [
      {
        collection: 'clientes',
        perms: { list: true, read: true, create: true, update: true },
        actAs: 'user',
      },
      {
        collection: 'reunioes',
        perms: { list: true, read: true, create: true, update: true },
        actAs: 'user',
      },
      {
        collection: 'historico_contatos',
        perms: { list: true, read: true, create: true, update: true },
        actAs: 'user',
      },
      {
        collection: 'anotacoes_cliente',
        perms: { list: true, read: true, create: true, update: true },
        actAs: 'user',
      },
    ])
  },
)
