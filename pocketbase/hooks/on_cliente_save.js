onRecordValidate((e) => {
  const phone = e.record.getString('telefone')
  if (phone) {
    const cleaned = phone.replace(/\D/g, '')
    e.record.set('telefone', cleaned)

    const existing = $app.findRecordsByFilter(
      'clientes',
      `telefone = '{:phone}' && user_id = '{:user}' && id != '{:id}'`,
      '',
      1,
      0,
      { phone: cleaned, user: e.record.getString('user_id'), id: e.record.id || 'new' },
    )
    if (existing.length > 0) {
      throw new BadRequestError('Dados inválidos', {
        telefone: new ValidationError(
          'validation_not_unique',
          'Já existe um cliente com este número de telefone.',
        ),
      })
    }
  }
  return e.next()
}, 'clientes')
