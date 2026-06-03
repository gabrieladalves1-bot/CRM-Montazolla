import { STAGES } from '@/types/crm'
import { KanbanColumn } from '@/components/kanban-column'
import { useCRM } from '@/hooks/use-crm'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { FilterModal } from '@/components/filter-modal'
import { GoogleCalendarIntegration } from '@/components/google-calendar-integration'
import { ImportLeadsModal } from '@/components/import-leads-modal'
import { AddLeadDialog } from '@/components/add-lead-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Link as LinkIcon } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const Index = () => {
  const { isLoading, error, loadData } = useCRM()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
        <p className="text-destructive font-medium max-w-md">{error}</p>
        <Button onClick={loadData} variant="outline">
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b bg-background shrink-0 gap-4">
        <div className="w-full sm:w-auto text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight">Funil</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e acompanhe o status dos seus leads
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <AddLeadDialog />
          <ImportLeadsModal />
          <GoogleCalendarIntegration />
          <FilterModal />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-white text-slate-900 border-slate-200 hover:bg-slate-100 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/agendar`)
                  toast({
                    title: 'Link copiado!',
                    description: 'O link de agendamento foi copiado para a área de transferência.',
                  })
                }}
              >
                <LinkIcon className="h-4 w-4" />
                <span className="sr-only">Link de Agendamento</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Link de Agendamento</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden p-6 gap-6 bg-muted/30 items-stretch">
        {isLoading
          ? // Loading Skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col h-full w-[320px] max-h-full shrink-0 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="p-3 flex flex-col gap-3">
                  {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
                    <Skeleton key={j} className="h-[180px] w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ))
          : // Kanban Columns
            STAGES.map((stage) => <KanbanColumn key={stage.id} stage={stage} />)}
      </div>
    </div>
  )
}

export default Index
