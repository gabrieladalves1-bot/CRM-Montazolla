import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Lead } from '@/types/crm'
import { scheduleMeeting } from '@/services/crm'
import { useCRM } from '@/hooks/use-crm'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

interface ScheduleMeetingDialogProps {
  lead?: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  meetingToEdit?: any
}

export function ScheduleMeetingDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
  meetingToEdit,
}: ScheduleMeetingDialogProps) {
  const { leads } = useCRM()
  const [selectedLeadId, setSelectedLeadId] = useState<string>(lead?.id || '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [description, setDescription] = useState('')
  const [reminder, setReminder] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (meetingToEdit) {
        setSelectedLeadId(meetingToEdit.expand?.cliente_id?.id || meetingToEdit.cliente_id || '')
        const dt = new Date(meetingToEdit.data_hora)
        const tzOffset = dt.getTimezoneOffset() * 60000
        const localISOTime = new Date(dt.getTime() - tzOffset).toISOString()
        setDate(localISOTime.split('T')[0])
        setTime(localISOTime.split('T')[1].substring(0, 5))
        setDuration(meetingToEdit.duracao_minutos?.toString() || '60')
        setDescription(meetingToEdit.descricao || '')
        setReminder(meetingToEdit.lembrete_1h ?? true)
      } else {
        setSelectedLeadId(lead?.id || '')
        setDate('')
        setTime('')
        setDuration('60')
        setDescription('')
        setReminder(true)
      }
    }
  }, [open, lead, meetingToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId || !date || !time) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const dataHora = new Date(`${date}T${time}:00`).toISOString()
      if (meetingToEdit) {
        await pb.collection('reunioes').update(meetingToEdit.id, {
          cliente_id: selectedLeadId,
          data_hora: dataHora,
          duracao_minutos: parseInt(duration),
          descricao: description,
          lembrete_1h: reminder,
        })
        toast({ title: 'Sucesso', description: 'Reunião atualizada com sucesso!' })
      } else {
        await scheduleMeeting({
          cliente_id: selectedLeadId,
          data_hora: dataHora,
          duracao_minutos: parseInt(duration),
          descricao: description,
          lembrete_1h: reminder,
        })
        toast({ title: 'Sucesso', description: 'Reunião agendada com sucesso!' })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      const errors = extractFieldErrors(err)
      toast({
        title: 'Erro ao agendar',
        description:
          errors.geral || errors.google || 'Verifique sua conexão com o Google Calendar.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agendar Reunião</DialogTitle>
            <DialogDescription>
              A reunião será agendada e um link do Google Meet será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!lead && (
              <div className="grid gap-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome} ({l.empresa})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Horário *</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Duração (minutos) *</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Duração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1 hora e 30 minutos</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Pauta da reunião..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reminder"
                checked={reminder}
                onCheckedChange={(checked) => setReminder(checked as boolean)}
              />
              <Label htmlFor="reminder" className="font-normal">
                Lembrete 1h antes (Google Calendar)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Agendando...' : 'Agendar Reunião'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
