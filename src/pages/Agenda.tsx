import { useState, useEffect, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Video, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScheduleMeetingDialog } from '@/components/schedule-meeting-dialog'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface Reuniao {
  id: string
  data_hora: string
  duracao_minutos: number
  descricao: string
  link_reuniao: string
  status: string
  expand?: {
    cliente_id: {
      nome: string
      empresa: string
    }
  }
}

function MeetingDetails({
  meeting,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  meeting: Reuniao | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onEdit?: (m: Reuniao) => void
  onDelete?: (id: string) => void
}) {
  if (!meeting) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes da Reunião</DialogTitle>
          <DialogDescription>
            {format(new Date(meeting.data_hora), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <span className="font-semibold text-sm text-muted-foreground">Cliente:</span>
            <p>
              {meeting.expand?.cliente_id?.nome} ({meeting.expand?.cliente_id?.empresa})
            </p>
          </div>
          <div>
            <span className="font-semibold text-sm text-muted-foreground">Duração:</span>
            <p>{meeting.duracao_minutos} minutos</p>
          </div>
          {meeting.descricao && (
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Descrição:</span>
              <p className="whitespace-pre-wrap text-sm border p-2 rounded-md bg-muted/50">
                {meeting.descricao}
              </p>
            </div>
          )}
          {meeting.link_reuniao && (
            <Button asChild className="w-full gap-2">
              <a href={meeting.link_reuniao} target="_blank" rel="noopener noreferrer">
                <Video className="w-4 h-4" />
                Acessar Google Meet
              </a>
            </Button>
          )}
          <div className="flex gap-2 pt-2 border-t mt-4">
            <Button variant="outline" className="flex-1" onClick={() => onEdit?.(meeting)}>
              Editar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => onDelete?.(meeting.id)}>
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Agenda() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [reunioes, setReunioes] = useState<Reuniao[]>([])
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Reuniao | null>(null)
  const [meetingToEdit, setMeetingToEdit] = useState<Reuniao | null>(null)
  const { isAuthenticated } = useAuth()

  const loadReunioes = async () => {
    if (!isAuthenticated) return
    try {
      const start = startOfMonth(subMonths(currentMonth, 1))
      const end = endOfMonth(addMonths(currentMonth, 1))

      const records = await pb.collection('reunioes').getFullList<Reuniao>({
        filter: `data_hora >= "${start.toISOString()}" && data_hora <= "${end.toISOString()}"`,
        expand: 'cliente_id',
        sort: 'data_hora',
      })
      setReunioes(records)
    } catch (err) {
      console.error('Failed to load meetings', err)
    }
  }

  useEffect(() => {
    loadReunioes()
  }, [currentMonth, isAuthenticated])

  useRealtime(
    'reunioes',
    () => {
      loadReunioes()
    },
    isAuthenticated,
  )

  const daysInGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const today = () => setCurrentMonth(new Date())

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agenda</h2>
          <p className="text-muted-foreground">Gerencie suas reuniões e compromissos.</p>
        </div>
        <Button onClick={() => setScheduleOpen(true)}>Agendar Reunião</Button>
      </div>

      <Card className="flex-1 min-h-[600px]">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={today}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-xl capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-muted rounded-md overflow-hidden border">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div
                key={day}
                className="bg-card p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {daysInGrid.map((date, i) => {
              const dayMeetings = reunioes.filter((r) => isSameDay(new Date(r.data_hora), date))
              const isCurrentMonth = isSameMonth(date, currentMonth)
              const isToday = isSameDay(date, new Date())

              return (
                <div
                  key={date.toISOString()}
                  className={`bg-card min-h-[120px] p-2 flex flex-col gap-1 transition-colors hover:bg-muted/50 ${
                    !isCurrentMonth ? 'text-muted-foreground bg-muted/20' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      {format(date, 'd')}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 overflow-y-auto flex-1 no-scrollbar">
                    {dayMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        onClick={() => setSelectedMeeting(meeting)}
                        className="cursor-pointer text-xs p-1.5 rounded bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-800/40 border border-blue-200 dark:border-blue-800 transition-colors"
                      >
                        <div className="flex items-center gap-1 font-semibold truncate">
                          <Clock className="w-3 h-3 shrink-0" />
                          {format(new Date(meeting.data_hora), 'HH:mm')}
                        </div>
                        <div className="truncate opacity-90 mt-0.5">
                          {meeting.expand?.cliente_id?.nome}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <ScheduleMeetingDialog
        open={scheduleOpen}
        onOpenChange={(o) => {
          setScheduleOpen(o)
          if (!o) setMeetingToEdit(null)
        }}
        onSuccess={loadReunioes}
        meetingToEdit={meetingToEdit}
      />

      <MeetingDetails
        meeting={selectedMeeting}
        open={!!selectedMeeting}
        onOpenChange={(o) => !o && setSelectedMeeting(null)}
        onEdit={(m) => {
          setMeetingToEdit(m)
          setSelectedMeeting(null)
          setScheduleOpen(true)
        }}
        onDelete={async (id) => {
          if (confirm('Tem certeza que deseja excluir esta reunião?')) {
            try {
              await pb.collection('reunioes').delete(id)
              setSelectedMeeting(null)
              loadReunioes()
            } catch (err) {
              console.error(err)
            }
          }
        }}
      />
    </div>
  )
}
