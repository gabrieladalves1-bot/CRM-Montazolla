migrate(
  (app) => {
    const col = app.dao().findCollectionByNameOrId('clientes')

    if (!col.fields.getByName('endereco')) {
      col.fields.add(new TextField({ name: 'endereco' }))
    }
    if (!col.fields.getByName('site')) {
      col.fields.add(new URLField({ name: 'site' }))
    }
    if (!col.fields.getByName('categoria')) {
      col.fields.add(new TextField({ name: 'categoria' }))
    }
    if (!col.fields.getByName('maps_url')) {
      col.fields.add(new URLField({ name: 'maps_url' }))
    }
    if (!col.fields.getByName('avaliacao')) {
      col.fields.add(new NumberField({ name: 'avaliacao' }))
    }
    if (!col.fields.getByName('total_avaliacoes')) {
      col.fields.add(new NumberField({ name: 'total_avaliacoes', onlyInt: true }))
    }

    app.dao().saveCollection(col)
  },
  (app) => {
    const col = app.dao().findCollectionByNameOrId('clientes')

    col.fields.removeByName('endereco')
    col.fields.removeByName('site')
    col.fields.removeByName('categoria')
    col.fields.removeByName('maps_url')
    col.fields.removeByName('avaliacao')
    col.fields.removeByName('total_avaliacoes')

    app.dao().saveCollection(col)
  },
)
