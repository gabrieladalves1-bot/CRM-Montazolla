import { useState } from 'react'
import { Stage } from '@/types/crm'
import { useCRM } from '@/hooks/use-crm'
import { LeadCard } from './lead-card'
import { cn } from '@/lib/utils'
import { Ghost, Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KanbanColumnProps {
  stage: Stage
}

export function KanbanColumn({ stage }: KanbanColumnProps) {
  const { filteredLeads, moveLead } = useCRM()
  const [isOver, setIsOver] = useState(false)

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(`kanban-collapsed-${stage.id}`)
    return saved === 'true'
  })

  const toggleCollapse = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem(`kanban-collapsed-${stage.id}`, String(nextState))
  }

  const columnLeads = filteredLeads.filter((lead) => lead.estagio_pipeline === stage.id)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isOver) setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const leadId = e.dataTransfer.getData('text/plain')
    if (leadId) {
      await moveLead(leadId, stage.id)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full max-h-full shrink-0 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl overflow-hidden animate-fade-in border transition-all duration-300',
        isCollapsed
          ? 'w-[60px] border-transparent hover:border-border'
          : 'w-[320px] border-transparent hover:border-border',
        isOver && 'border-primary bg-primary/5',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isCollapsed ? (
        <div
          className="flex flex-1 flex-col items-center py-4 gap-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
          onClick={toggleCollapse}
          title={`Expandir ${stage.title}`}
        >
          <div className={cn('w-3 h-3 rounded-full shrink-0', stage.color)} />
          <span className="flex items-center justify-center bg-background border text-muted-foreground text-xs font-semibold h-7 w-7 rounded-full">
            {columnLeads.length}
          </span>
          <div className="flex-1 flex items-start justify-center pt-4">
            <span
              className="font-semibold text-sm whitespace-nowrap rotate-180 text-muted-foreground"
              style={{ writingMode: 'vertical-rl' }}
            >
              {stage.title}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full shrink-0 mt-auto text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="p-3 border-b bg-background/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', stage.color)} />
              <h3 className="font-semibold text-sm">{stage.title}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium h-5 min-w-[20px] px-1.5 rounded-full">
                {columnLeads.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground hover:text-foreground"
                onClick={toggleCollapse}
                title="Minimizar coluna"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[150px]">
            {columnLeads.length > 0 ? (
              columnLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 py-8 opacity-50 border-2 border-dashed rounded-xl pointer-events-none">
                <Ghost className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum cliente neste estágio
                </p>
                <p className="text-xs text-muted-foreground mt-1">Solte um card aqui</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
