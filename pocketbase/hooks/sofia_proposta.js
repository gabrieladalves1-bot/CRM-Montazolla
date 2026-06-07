// Rota POST /backend/v1/gerar-proposta
// Recebe cliente_id, busca dados do lead e gera uma proposta com Claude (Sofia).
routerAdd(
  'POST',
  '/backend/v1/gerar-proposta',
  (e) => {
    const body = e.requestInfo().body || {}
    const clienteId = body.cliente_id

    if (!clienteId) return e.badRequestError('cliente_id obrigatório')

    let cliente
    try {
      cliente = $app.findRecordById('clientes', clienteId)
    } catch (_) {
      return e.notFoundError('Cliente não encontrado')
    }

    const ANTHROPIC_API_KEY = $os.getenv('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      return e.badRequestError('ANTHROPIC_API_KEY não configurada')
    }

    // Lê o prompt da Sofia do banco (com fallback)
    let systemPrompt = `Você é Sofia, especialista em propostas comerciais da Montazolla — agência de criação de sites. Crie uma proposta personalizada, persuasiva e clara. Tom profissional mas acessível. Máximo 300 palavras. Não mencione preços. Use *texto* para negrito (WhatsApp).`
    try {
      const sofiaRecord = $app.findFirstRecordByFilter('agentes_config', "slug = 'sofia' && ativo = true")
      const prompt = sofiaRecord.getString('system_prompt')
      if (prompt) systemPrompt = prompt
    } catch (_) {}

    const nome = cliente.getString('nome') || 'cliente'
    const empresa = cliente.getString('empresa') || 'sua empresa'
    const categoria = cliente.getString('categoria') || ''
    const estagio = cliente.getString('estagio_pipeline') || ''
    const valorProposta = cliente.getFloat('valor_proposta') || 0

    const userPrompt = `Crie uma proposta comercial para:
Nome: ${nome}
Empresa: ${empresa}
Nicho/Categoria: ${categoria || 'não informado'}
Estágio no funil: ${estagio}
${valorProposta > 0 ? `Valor estimado: R$ ${valorProposta.toFixed(2)}` : ''}`

    let response
    try {
      response = $http.send({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('Sofia: Claude API error', 'error', err.message)
      return e.badRequestError('Erro ao conectar com a IA. Tente novamente.')
    }

    if (response.statusCode !== 200) {
      return e.badRequestError('Erro na geração da proposta. Tente novamente.')
    }

    const proposta = response.json.content[0].text

    // Salva no histórico do lead
    try {
      const histCol = $app.findCollectionByNameOrId('historico_contatos')
      const hist = new Record(histCol)
      hist.set('cliente_id', clienteId)
      hist.set('tipo_contato', 'Email')
      hist.set('descricao', `[SOFIA] Proposta gerada:\n${proposta}`)
      hist.set('data_contato', new Date().toISOString())
      $app.save(hist)
    } catch (_) {}

    return e.json(200, { proposta })
  },
  $apis.requireAuth(),
)
