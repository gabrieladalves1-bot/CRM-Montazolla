import { useState, useEffect, useRef } from 'react'
import {
  CheckSquare,
  Building2,
  Calendar,
  Mail,
  Phone,
  Clock,
  Instagram,
  DollarSign,
  Share2,
  BarChart,
  Trash2,
  Send,
  CalendarPlus,
  Video,
  Copy,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Lead, SOURCES, STAGES } from '@/types/crm'
import { getAnotacoes, getHistorico } from '@/services/crm'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ToastAction } from '@/components/ui/toast'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { scheduleMeeting } from '@/services/crm'

interface LeadDetailsDialogProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadDetailsDialog({ lead, open, onOpenChange }: LeadDetailsDialogProps) {
  const [anotacoes, setAnotacoes] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [formData, setFormData] = useState<Partial<Lead & { checklist?: Record<string, boolean> }>>(
    {},
  )
  const [isScheduling, setIsScheduling] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncError, setSyncError] = useState('')
  const syncAttemptedRef = useRef(false)

  const [meetingForm, setMeetingForm] = useState({
    date: '',
    time: '',
    duration: 60,
    description: '',
    link: '',
    reminder: true,
  })

  const triggerSync = async () => {
    setSyncStatus('syncing')
    try {
      await pb.send('/backend/v1/sync-google-calendar', { method: 'POST' })
      setSyncStatus('success')
      toast({ title: 'Sincronização concluída!' })
      if (lead) {
        const h = await getHistorico(lead.id)
        setHistorico(h)
      }
      setTimeout(() => setSyncStatus('idle'), 3000)
    } catch (err: any) {
      setSyncStatus('error')
      const msg = err?.response?.message || err?.message || ''
      if (msg.includes('Reconecte')) {
        setSyncError('Reconecte ao Google Calendar')
      } else {
        setSyncError('Falha ao sincronizar. Tente novamente.')
      }
    }
  }

  const generateMeetLink = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    const randomStr = (length: number) =>
      Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
    return `https://meet.google.com/${randomStr(3)}-${randomStr(4)}-${randomStr(3)}`
  }

  useEffect(() => {
    if (open && lead) {
      setIsLoading(true)
      if (!syncAttemptedRef.current) {
        triggerSync()
        syncAttemptedRef.current = true
      }
      setFormData({
        email: lead.email,
        telefone: lead.telefone,
        instagram_usuario: lead.instagram_usuario,
        valor_proposta: lead.valor_proposta,
        data_contato: lead.data_contato,
        fonte_contato: lead.fonte_contato,
        estagio_pipeline: lead.estagio_pipeline,
        endereco: lead.endereco,
        categoria: lead.categoria,
        site: lead.site,
        checklist: (lead as any).checklist || {},
      })
      setMeetingForm({
        date: '',
        time: '',
        duration: 60,
        description: '',
        link: generateMeetLink(),
        reminder: true,
      })
      Promise.all([getAnotacoes(lead.id), getHistorico(lead.id)])
        .then(([a, h]) => {
          setAnotacoes(a)
          setHistorico(h)
        })
        .finally(() => setIsLoading(false))
    } else if (!open) {
      syncAttemptedRef.current = false
      setSyncStatus('idle')
    }
  }, [open, lead])

  if (!lead) return null

  const stage = STAGES.find((s) => s.id === (formData.estagio_pipeline || lead.estagio_pipeline))

  const handleSave = async () => {
    try {
      await pb.collection('clientes').update(lead.id, formData)
      toast({ title: 'Cliente atualizado com sucesso!' })
      onOpenChange(false)
    } catch (e) {
      toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      await pb.collection('clientes').delete(lead.id)
      toast({ title: 'Cliente excluído com sucesso!' })
      onOpenChange(false)
    } catch (e) {
      toast({ title: 'Erro ao excluir cliente', variant: 'destructive' })
    }
  }

  const handleScheduleMeeting = async () => {
    if (!meetingForm.date || !meetingForm.time) {
      toast({ title: 'Preencha a data e horário da reunião.', variant: 'destructive' })
      return
    }
    setIsScheduling(true)
    try {
      const data_hora = new Date(`${meetingForm.date}T${meetingForm.time}:00`).toISOString()
      await scheduleMeeting({
        cliente_id: lead.id,
        data_hora,
        duracao_minutos: meetingForm.duration,
        descricao: meetingForm.description,
        link_reuniao: meetingForm.link,
        lembrete_1h: meetingForm.reminder,
      })
      toast({ title: 'Reunião agendada com sucesso!' })
      const h = await getHistorico(lead.id)
      setHistorico(h)
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Falha ao agendar. Tente novamente.',
        description: err?.response?.data?.google?.message || err.message,
        variant: 'destructive',
        action: (
          <ToastAction altText="Tentar novamente" onClick={handleScheduleMeeting}>
            Tentar novamente
          </ToastAction>
        ),
      })
    } finally {
      setIsScheduling(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      const record = await pb.collection('anotacoes_cliente').create({
        cliente_id: lead.id,
        conteudo: newNote,
      })
      setAnotacoes([record, ...anotacoes])
      setNewNote('')
      toast({ title: 'Anotação adicionada com sucesso!' })
    } catch (e) {
      toast({ title: 'Erro ao adicionar anotação', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-xl">
        <DialogHeader className="p-6 shrink-0 bg-gradient-to-r from-blue-900 to-blue-500 text-white">
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <DialogTitle className="text-2xl font-bold text-white">{lead.nome}</DialogTitle>
              <DialogDescription className="text-blue-100 flex items-center gap-2 mt-1.5 text-sm font-medium">
                <Building2 className="h-4 w-4" />
                {lead.empresa}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="font-semibold whitespace-nowrap bg-white/10 text-white border-white/20 backdrop-blur-sm px-3 py-1 text-xs"
            >
              {stage?.title}
            </Badge>
          </div>
        </DialogHeader>

        {syncStatus === 'syncing' && (
          <div className="bg-blue-50/80 border-b border-blue-100 p-2.5 flex items-center justify-center text-sm text-blue-600 gap-2 shrink-0 shadow-sm z-10 relative">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sincronizando com Google Calendar...
          </div>
        )}
        {syncStatus === 'error' && (
          <div className="bg-red-50/80 border-b border-red-100 p-2.5 flex flex-col sm:flex-row items-center justify-between text-sm text-red-600 px-6 shrink-0 shadow-sm z-10 relative gap-2 sm:gap-0">
            <span className="flex items-center gap-2 font-medium text-center sm:text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {syncError}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSync}
              className="h-7 text-xs border-red-200 hover:bg-red-50 text-red-700 bg-white w-full sm:w-auto"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        <Tabs
          defaultValue="details"
          className="w-full flex flex-col flex-1 overflow-hidden bg-white relative"
        >
          <div className="px-6 border-b border-gray-100">
            <TabsList className="bg-transparent h-auto p-0 w-full justify-start gap-8">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-4 px-1 transition-all text-sm font-semibold text-gray-500"
              >
                Detalhes do Cliente
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-4 px-1 transition-all text-sm font-semibold text-gray-500"
              >
                Anotações
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-4 px-1 transition-all text-sm font-semibold text-gray-500"
              >
                Histórico
              </TabsTrigger>
              <TabsTrigger
                value="meeting"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-4 px-1 transition-all text-sm font-semibold text-gray-500"
              >
                Agendar Reunião
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6 bg-gray-50/30">
            <TabsContent
              value="details"
              className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <Mail className="w-3.5 h-3.5" /> E-mail
                  </Label>
                  <Input
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <Phone className="w-3.5 h-3.5" /> Telefone
                  </Label>
                  <Input
                    value={formData.telefone || ''}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <Instagram className="w-3.5 h-3.5" /> Instagram
                  </Label>
                  <Input
                    value={formData.instagram_usuario || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, instagram_usuario: e.target.value })
                    }
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <DollarSign className="w-3.5 h-3.5" /> Valor da Proposta
                  </Label>
                  <Input
                    type="number"
                    value={formData.valor_proposta || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, valor_proposta: Number(e.target.value) })
                    }
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <Calendar className="w-3.5 h-3.5" /> Data de Contato
                  </Label>
                  <Input
                    type="date"
                    value={formData.data_contato ? formData.data_contato.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, data_contato: e.target.value })}
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    Endereço
                  </Label>
                  <Input
                    value={formData.endereco || ''}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    Categoria
                  </Label>
                  <Input
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <Share2 className="w-3.5 h-3.5" /> Fonte de Contato
                  </Label>
                  <Select
                    value={formData.fonte_contato}
                    onValueChange={(v) => setFormData({ ...formData, fonte_contato: v })}
                  >
                    <SelectTrigger className="h-11 px-4 bg-white border-gray-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-lg shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <BarChart className="w-3.5 h-3.5" /> Estágio no Pipeline
                  </Label>
                  <Select
                    value={formData.estagio_pipeline}
                    onValueChange={(v) => setFormData({ ...formData, estagio_pipeline: v })}
                  >
                    <SelectTrigger className="h-11 px-4 bg-white border-gray-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-lg shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.estagio_pipeline === 'Onboarding' && (
                <div className="mt-8 p-6 bg-blue-50/50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-blue-500" />
                    Checklist de Onboarding
                  </h3>
                  <div className="space-y-3">
                    {['Briefing', 'Design', 'Dev', 'Entrega'].map((task) => {
                      const isChecked = formData.checklist?.[task] || false
                      return (
                        <div
                          key={task}
                          className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-blue-50 shadow-sm transition-colors hover:border-blue-200"
                        >
                          <Checkbox
                            id={`task-${task}`}
                            checked={isChecked}
                            onCheckedChange={(c) => {
                              const newChecklist = { ...(formData.checklist || {}), [task]: !!c }
                              setFormData({ ...formData, checklist: newChecklist })
                            }}
                            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          />
                          <Label
                            htmlFor={`task-${task}`}
                            className="font-medium cursor-pointer flex-1 text-gray-700"
                          >
                            {task}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-6 mt-8 border-t border-gray-200 gap-4">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white rounded-lg h-10 px-5 font-medium transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Cliente
                </Button>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 sm:flex-none text-gray-600 border-gray-300 hover:bg-gray-100 rounded-lg h-10 px-5 transition-colors"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 sm:flex-none bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-10 px-6 font-medium shadow-md shadow-blue-500/20 transition-all"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="notes"
              className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all overflow-hidden">
                <Textarea
                  placeholder="Adicione uma nova anotação sobre o cliente..."
                  className="min-h-[200px] border-0 focus-visible:ring-0 resize-y shadow-none p-5 text-base rounded-none bg-transparent"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="flex justify-end p-3 border-t border-gray-100 bg-gray-50/80">
                  <Button
                    onClick={handleAddNote}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 gap-2 shadow-sm font-medium"
                  >
                    <Send className="w-4 h-4" /> Salvar Anotação
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 ml-1">Anotações Anteriores</h3>
                {isLoading ? (
                  <div className="bg-white border border-gray-100 rounded-xl p-5 h-24 animate-pulse shadow-sm" />
                ) : anotacoes.length > 0 ? (
                  anotacoes.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 text-sm text-gray-600 [&>p]:mb-2 last:[&>p]:mb-0 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: a.conteudo }}
                    />
                  ))
                ) : (
                  <div className="bg-transparent border border-dashed border-gray-200 rounded-xl p-8 text-sm text-gray-400 text-center font-medium">
                    Nenhuma anotação registrada para este cliente ainda.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="history"
              className="m-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {isLoading ? (
                <div className="bg-white border border-gray-100 rounded-xl p-5 h-24 animate-pulse shadow-sm" />
              ) : historico.length > 0 ? (
                <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-8 py-2">
                  {historico.map((h) => (
                    <div key={h.id} className="relative text-sm flex flex-col gap-2">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white" />
                      <div className="flex items-center justify-between text-gray-500 mb-1">
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          {h.tipo_contato}
                        </span>
                        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-md">
                          {new Date(h.data_contato).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 text-gray-600 leading-relaxed">
                        {h.descricao}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-transparent border border-dashed border-gray-200 rounded-xl p-8 text-sm text-gray-400 text-center font-medium mt-4">
                  Nenhum histórico registrado.
                </div>
              )}
            </TabsContent>
            <TabsContent
              value="meeting"
              className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <CalendarPlus className="w-3.5 h-3.5" /> Data da Reunião
                  </Label>
                  <Input
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    disabled={isScheduling}
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <Clock className="w-3.5 h-3.5" /> Horário
                  </Label>
                  <Input
                    type="time"
                    value={meetingForm.time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                    disabled={isScheduling}
                    className="h-11 px-4 bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <Clock className="w-3.5 h-3.5" /> Duração
                  </Label>
                  <Select
                    disabled={isScheduling}
                    value={meetingForm.duration.toString()}
                    onValueChange={(v) => setMeetingForm({ ...meetingForm, duration: Number(v) })}
                  >
                    <SelectTrigger className="h-11 px-4 bg-white border-gray-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-lg shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">1.5 horas</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    <Video className="w-3.5 h-3.5" /> Link de Reunião
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={meetingForm.link}
                      disabled={isScheduling}
                      className="h-11 px-4 bg-gray-50 border-gray-200 text-gray-500 focus-visible:ring-0 focus-visible:border-gray-200 transition-all rounded-lg shadow-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isScheduling}
                      onClick={() => {
                        navigator.clipboard.writeText(meetingForm.link)
                        toast({ title: 'Link copiado!' })
                      }}
                      className="h-11 w-11 shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider ml-1">
                    Descrição / Notas
                  </Label>
                  <Textarea
                    placeholder="Pauta da reunião, detalhes importantes..."
                    value={meetingForm.description}
                    onChange={(e) =>
                      setMeetingForm({ ...meetingForm, description: e.target.value })
                    }
                    disabled={isScheduling}
                    className="min-h-[100px] resize-y bg-white border-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 flex items-center pt-2">
                  <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 py-3 px-4 rounded-lg w-full">
                    <Checkbox
                      id="reminder"
                      disabled={isScheduling}
                      checked={meetingForm.reminder}
                      onCheckedChange={(c) => setMeetingForm({ ...meetingForm, reminder: !!c })}
                    />
                    <Label
                      htmlFor="reminder"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Criar lembrete 1h antes no Google Calendar
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 mt-8 border-t border-gray-200 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isScheduling}
                  onClick={() => onOpenChange(false)}
                  className="text-gray-600 border-gray-300 hover:bg-gray-100 rounded-lg h-10 px-5 transition-colors"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleScheduleMeeting}
                  disabled={isScheduling}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-10 px-6 font-medium shadow-md shadow-blue-500/20 transition-all gap-2"
                >
                  {isScheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Agendando reunião...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4" /> Agendar Reunião
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
