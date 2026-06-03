import { useEffect, useState } from 'react'
import { Building2, Mail, Calendar as CalendarIcon, Video, Loader2, Instagram, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lead } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { LeadDetailsDialog } from './lead-details-dialog'
import { ScheduleMeetingDialog } from './schedule-meeting-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import pb from '@/lib/pocketbase/client'
import { useCRM } from '@/hooks/use-crm'

function MeetingDetailsPopover({ leadId }: { leadId: string }) {
  const [meeting, setMeeting] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open && !meeting) {
      setLoading(true)
      pb.collection('reunioes')
        .getFirstListItem(`cliente_id="${leadId}"`, { sort: '-data_hora' })
        .then((record) => setMeeting(record))
        .catch(() => setMeeting(null))
        .finally(() => setLoading(false))
    }
  }, [open, leadId, meeting])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
          onClick={(e) => e.stopPropagation()}
          title="Ver Reunião"
        >
          <Video className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
        <h4 className="font-medium text-sm mb-2">Detalhes da Reunião</h4>
        {loading ? (
          <div className="flex justify-center p-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : meeting ? (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Data e Hora:</span>
              <p className="font-medium">
                {format(parseISO(meeting.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            {meeting.link_reuniao && (
              <div>
                <span className="text-muted-foreground text-xs">Link do Google Meet:</span>
                <a
                  href={meeting.link_reuniao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline truncate mt-0.5"
                >
                  {meeting.link_reuniao}
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma reunião encontrada.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface LeadCardProps {
  lead: Lead
}

export function LeadCard({ lead }: LeadCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const { deleteLead } = useCRM()

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', lead.id)
    e.dataTransfer.effectAllowed = 'move'
    // Slightly fade the dragged element
    setTimeout(() => {
      ;(e.target as HTMLElement).classList.add('opacity-50')
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    ;(e.target as HTMLElement).classList.remove('opacity-50')
  }

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => setDetailsOpen(true)}
        className="group relative flex items-center justify-between rounded-xl border bg-card p-3 text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing animate-fade-in-up select-none"
      >
        <div className="flex flex-col overflow-hidden mr-2">
          <h4 className="font-medium text-sm truncate">{lead.nome}</h4>
          <div className="flex items-center text-xs text-muted-foreground truncate mt-0.5">
            <Building2 className="mr-1 h-3 w-3 shrink-0" />
            <span className="truncate">{lead.empresa}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {lead.estagio_pipeline === 'Reunião Agendada' && (
            <MeetingDetailsPopover leadId={lead.id} />
          )}
          {lead.telefone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
              asChild
            >
              <a
                href={`https://wa.me/${lead.telefone.startsWith('+') ? '+' + lead.telefone.replace(/\D/g, '') : lead.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Conversar no WhatsApp"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.312-.88-.661-1.474-1.478-1.647-1.776-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.012c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
              </a>
            </Button>
          )}
          {lead.instagram_link || lead.instagram_usuario ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-pink-600 hover:text-pink-700 hover:bg-pink-50 shrink-0"
              asChild
            >
              <a
                href={
                  lead.instagram_link ||
                  `https://instagram.com/${lead.instagram_usuario?.replace('@', '')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                title="Ver Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </Button>
          ) : lead.email ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
              asChild
            >
              <a
                href={`mailto:${lead.email}?subject=${encodeURIComponent(`Contato - ${lead.empresa}`)}`}
                title="Enviar Email"
              >
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              setScheduleOpen(true)
            }}
            title="Agendar Reunião"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0"
                onClick={(e) => e.stopPropagation()}
                title="Excluir cliente"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. <strong>{lead.nome}</strong> e todo o histórico
                  associado serão removidos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteLead(lead.id)}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <LeadDetailsDialog lead={lead} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <ScheduleMeetingDialog lead={lead} open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </>
  )
}
