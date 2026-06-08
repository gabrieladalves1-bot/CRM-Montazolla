migrate(
  (db) => {
    /* agente_ativo already added to clientes in 0001 */
    try {
      db.newQuery("UPDATE clientes SET agente_ativo = 'Antônio' WHERE agente_ativo IS NULL OR agente_ativo = ''").execute()
    } catch (_) {}
  },
  (db) => {},
)
