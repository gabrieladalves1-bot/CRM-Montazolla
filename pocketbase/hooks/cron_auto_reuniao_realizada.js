// Roda a cada 30 minutos.
// Encontra reuniões que já passaram e move o lead para "Reunião Realizada" automaticamente.
cronAdd('auto_reuniao_realizada', '*/30 * * * *', () => {
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace('T', ' ')

    const meetings = $app.findRecordsByFilter(
      'reunioes',
      `status = 'agendada' && data_hora < {:time}`,
      '+data_hora',
      100,
      0,
      { time: thirtyMinsAgo },
    )

    for (const meeting of meetings) {
      try {
        const clienteId = meeting.getString('cliente_id')
        const cliente = $app.findRecordById('clientes', clienteId)
        const estagio = cliente.getString('estagio_pipeline')

        // Só avança se ainda estiver em "Reunião Agendada"
        if (estagio !== 'Reunião Agendada') {
          meeting.set('status', 'realizada')
          $app.saveNoValidate(meeting)
          continue
        }

        $app.runInTransaction((txApp) => {
          meeting.set('status', 'realizada')
          txApp.saveNoValidate(meeting)

          cliente.set('estagio_pipeline', 'Reunião Realizada')
          txApp.save(cliente)

          const historicoCol = txApp.findCollectionByNameOrId('historico_contatos')
          const hist = new Record(historicoCol)
          hist.set('cliente_id', clienteId)
          hist.set('tipo_contato', 'Reunião Sincronizada')
          hist.set('descricao', '[STAGE:reuniao_realizada] Reunião marcada como realizada automaticamente.')
          hist.set('data_contato', new Date().toISOString())
          txApp.save(hist)
        })

        $app.logger().info('Auto: Reunião Realizada', 'cliente_id', clienteId)
      } catch (err) {
        $app
          .logger()
          .error('Erro ao processar reunião', 'meeting_id', meeting.id, 'error', String(err))
      }
    }
  } catch (err) {
    $app.logger().error('Erro no cron auto_reuniao_realizada', 'error', String(err))
  }
})
