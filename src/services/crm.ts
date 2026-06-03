import pb from '@/lib/pocketbase/client'
import { Lead } from '@/types/crm'

export const getClientes = async (): Promise<Lead[]> => {
  return pb.collection('clientes').getFullList<Lead>({ sort: '-created' })
}

export const createCliente = async (data: Partial<Lead> & { notes?: string }): Promise<Lead> => {
  const { notes, ...clienteData } = data

  if (clienteData.telefone) {
    clienteData.telefone = clienteData.telefone.replace(/\D/g, '')
  }

  const cliente = await pb.collection('clientes').create<Lead>({
    data_contato: new Date().toISOString(),
    ...clienteData,
    user_id: pb.authStore.record?.id,
  })

  if (notes) {
    await pb.collection('anotacoes_cliente').create({
      cliente_id: cliente.id,
      conteudo: `<p>${notes}</p>`,
    })
  }

  return cliente
}

export const updateCliente = async (id: string, data: Partial<Lead>): Promise<Lead> => {
  if (data.telefone) {
    data.telefone = data.telefone.replace(/\D/g, '')
  }
  return pb.collection('clientes').update<Lead>(id, data)
}

export const moveCliente = async (id: string, estagio_pipeline: string): Promise<Lead> => {
  return pb.collection('clientes').update<Lead>(id, { estagio_pipeline })
}

export const deleteCliente = async (id: string): Promise<void> => {
  await pb.collection('clientes').delete(id)
}

export const getAnotacoes = async (cliente_id: string) => {
  return pb.collection('anotacoes_cliente').getFullList({
    filter: `cliente_id = "${cliente_id}"`,
    sort: '-created',
  })
}

export const getHistorico = async (cliente_id: string) => {
  return pb.collection('historico_contatos').getFullList({
    filter: `cliente_id = "${cliente_id}"`,
    sort: '-created',
  })
}

export const scheduleMeeting = async (data: {
  cliente_id: string
  data_hora: string
  duracao_minutos: number
  descricao: string
  link_reuniao?: string
  lembrete_1h: boolean
}) => {
  return pb.send('/backend/v1/meetings', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
}
