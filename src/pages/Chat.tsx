import { useState, useEffect, useRef, useMemo } from 'react'
import { useCRM } from '@/hooks/use-crm'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, User, Bot, UserRound, MessageCircle } from 'lucide-react'
import { Lead } from '@/types/crm'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function Chat() {
  const { leads, loadData } = useCRM()
  const { toast } = useToast()
  const [selectedClient, setSelectedClient] = useState<Lead | null>(null)
  const [messagesByClient, setMessagesByClient] = useState<Record<string, any[]>>({})
  const [inputMsg, setInputMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const chatLeads = useMemo(() => leads.filter((l) => l.telefone), [leads])

  const loadAllMessages = async () => {
    try {
      const records = await pb.collection('historico_contatos').getFullList({
        filter: "tipo_contato = 'WhatsApp'",
        sort: '+created',
      })
      const grouped: Record<string, any[]> = {}
      records.forEach((r) => {
        if (!grouped[r.cliente_id]) grouped[r.cliente_id] = []
        grouped[r.cliente_id].push(r)
      })
      setMessagesByClient(grouped)
    } catch (error) {
      console.error('Failed to load messages', error)
    }
  }

  useEffect(() => {
    loadAllMessages()
  }, [])

  useRealtime('historico_contatos', (e) => {
    if (e.record.tipo_contato !== 'WhatsApp') return

    setMessagesByClient((prev) => {
      const clientId = e.record.cliente_id
      const clientMsgs = prev[clientId] || []

      if (e.action === 'create' || e.action === 'update') {
        const existingIdx = clientMsgs.findIndex((m) => m.id === e.record.id)
        const newMsgs = [...clientMsgs]

        if (existingIdx >= 0) {
          newMsgs[existingIdx] = e.record
        } else {
          newMsgs.push(e.record)
          newMsgs.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
        }
        return { ...prev, [clientId]: newMsgs }
      } else if (e.action === 'delete') {
        return { ...prev, [clientId]: clientMsgs.filter((m) => m.id !== e.record.id) }
      }
      return prev
    })
  })

  useRealtime('clientes', () => {
    loadData()
  })

  const sortedLeads = useMemo(() => {
    return [...chatLeads].sort((a, b) => {
      const aMsgs = messagesByClient[a.id] || []
      const bMsgs = messagesByClient[b.id] || []

      const aLast = aMsgs.length > 0 ? new Date(aMsgs[aMsgs.length - 1].created).getTime() : 0
      const bLast = bMsgs.length > 0 ? new Date(bMsgs[bMsgs.length - 1].created).getTime() : 0

      return bLast - aLast
    })
  }, [chatLeads, messagesByClient])

  const selectedMessages = selectedClient ? messagesByClient[selectedClient.id] || [] : []

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedClient?.id, selectedMessages.length])

  const updateLeadStage = async (stage: string) => {
    if (!selectedClient) return
    try {
      await pb.collection('clientes').update(selectedClient.id, { estagio_pipeline: stage })
      toast({ title: `Estágio atualizado para ${stage}` })
      setSelectedClient((prev) => (prev ? { ...prev, estagio_pipeline: stage } : prev))
    } catch (error) {
      toast({ title: 'Erro ao atualizar estágio', variant: 'destructive' })
    }
  }

  const generateProposal = () => {
    if (!selectedClient) return
    toast({
      title: 'Proposta Gerada',
      description: `A proposta para ${selectedClient.nome} foi gerada com sucesso e está pronta para envio.`,
    })
  }

  const updateAgenteAtivo = async (agente: string) => {
    if (!selectedClient) return
    try {
      await pb.collection('clientes').update(selectedClient.id, { agente_ativo: agente })
      setSelectedClient((prev) => (prev ? { ...prev, agente_ativo: agente as any } : prev))
      toast({ title: 'Agente atualizado', description: `Conversa atribuída para: ${agente}` })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o agente.',
        variant: 'destructive',
      })
    }
  }

  const handleSend = async () => {
    if (!inputMsg.trim() || !selectedClient) return
    setSending(true)
    try {
      await pb.send('/backend/v1/zapi-send', {
        method: 'POST',
        body: JSON.stringify({
          cliente_id: selectedClient.id,
          message: inputMsg,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      setInputMsg('')
      toast({
        title: 'Mensagem enviada',
        description: 'A mensagem foi enviada com sucesso.',
      })
    } catch (error) {
      console.error('Failed to send message:', error)

      let errorDescription = 'Ocorreu um erro inesperado ao tentar enviar a mensagem.'

      if (error instanceof ClientResponseError) {
        errorDescription = error.response?.message || error.message || getErrorMessage(error)
      } else {
        errorDescription = getErrorMessage(error)
      }

      toast({
        variant: 'destructive',
        title: 'Erro de Envio',
        description: errorDescription,
      })
    } finally {
      setSending(false)
    }
  }

  const isIncoming = (desc: string) => desc.startsWith('Recebido:')
  const isAi = (desc: string) => desc.startsWith('Enviado (IA):')

  const cleanDesc = (desc: string) => {
    let d = desc
    if (isIncoming(d)) d = d.replace('Recebido: ', '')
    if (isAi(d)) d = d.replace('Enviado (IA): ', '')
    if (d.startsWith('Enviado: ') && !isAi(desc)) d = d.replace('Enviado: ', '')
    d = d.replace(/ \[ID:.*\]$/, '')
    return d
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] gap-4 p-4">
      <div className="flex flex-1 gap-4 overflow-hidden">
        <Card className="w-80 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b font-semibold bg-muted/30">Conversas</div>
          <ScrollArea className="flex-1">
            {sortedLeads.map((lead) => {
              const leadMsgs = messagesByClient[lead.id] || []
              const lastMsg = leadMsgs.length > 0 ? leadMsgs[leadMsgs.length - 1] : null

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedClient(lead)}
                  className={cn(
                    'p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3',
                    selectedClient?.id === lead.id && 'bg-muted',
                  )}
                >
                  <Avatar>
                    <AvatarFallback>{lead.nome.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden w-full">
                    <div className="flex justify-between items-center w-full">
                      <span className="font-medium truncate text-sm">{lead.nome}</span>
                      {lastMsg && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {format(new Date(lastMsg.created), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      {lastMsg ? cleanDesc(lastMsg.descricao) : lead.telefone}
                    </span>
                  </div>
                </div>
              )
            })}
            {sortedLeads.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nenhum cliente com telefone cadastrado.
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {selectedClient ? (
            <>
              <div className="p-4 border-b flex items-center gap-3 bg-muted/30">
                <Avatar>
                  <AvatarFallback>{selectedClient.nome.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedClient.nome}</h3>
                  <p className="text-xs text-muted-foreground">{selectedClient.telefone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Agente:</span>
                  <Select
                    value={selectedClient.agente_ativo || 'Antônio'}
                    onValueChange={updateAgenteAtivo}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Antônio">Antônio</SelectItem>
                      <SelectItem value="Alexandre">Alexandre (Vendas)</SelectItem>
                      <SelectItem value="Manual">Desativado (Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                  {selectedMessages.map((msg) => {
                    const incoming = isIncoming(msg.descricao)
                    const ai = isAi(msg.descricao)
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2 max-w-[80%]',
                          incoming ? 'self-start' : 'self-end flex-row-reverse',
                        )}
                      >
                        <Avatar className="h-8 w-8 mt-auto">
                          {incoming ? (
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <UserRound className="h-4 w-4" />
                            </AvatarFallback>
                          ) : ai ? (
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          ) : (
                            <AvatarFallback className="bg-green-100 text-green-700">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div
                          className={cn(
                            'p-3 rounded-lg text-sm',
                            incoming
                              ? 'bg-muted'
                              : ai
                                ? 'bg-blue-600 text-white'
                                : 'bg-primary text-primary-foreground',
                          )}
                        >
                          <p className="whitespace-pre-wrap">{cleanDesc(msg.descricao)}</p>
                          <span
                            className={cn(
                              'text-[10px] mt-1 block opacity-70',
                              incoming ? 'text-right' : 'text-left',
                            )}
                          >
                            {format(new Date(msg.data_contato || msg.created), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {selectedMessages.length === 0 && (
                    <div className="text-center text-muted-foreground my-8">
                      Nenhuma mensagem enviada ou recebida.
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              <div className="px-4 py-3 border-t bg-muted/10 flex gap-2 overflow-x-auto shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLeadStage('Qualificado')}
                  className="shrink-0 text-xs h-8"
                >
                  Qualificar Lead
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateProposal}
                  className="shrink-0 text-xs h-8"
                >
                  Gerar Proposta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLeadStage('Onboarding')}
                  className="shrink-0 text-xs h-8"
                >
                  Mover para Onboarding
                </Button>
              </div>
              <div className="p-4 border-t flex gap-2 bg-background">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={!inputMsg.trim() || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
              <MessageCircle className="h-12 w-12 opacity-20" />
              <p>Selecione uma conversa para iniciar</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
