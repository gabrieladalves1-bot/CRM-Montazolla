import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useCRM } from '@/hooks/use-crm'
import { SOURCES } from '@/types/crm'

export function FilterModal() {
  const { searchQuery, setSearchQuery, selectedSources, toggleSource, clearFilters } = useCRM()

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <Filter className="h-4 w-4" />
              <span className="sr-only">Filtrar</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Filtrar</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filtros do Kanban</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Busca</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Buscar cliente ou empresa..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Fonte de Contato</Label>
            <div className="grid gap-2">
              {SOURCES.map((source) => (
                <div key={source.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`source-${source.id}`}
                    checked={selectedSources.includes(source.id)}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                  <Label
                    htmlFor={`source-${source.id}`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {source.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between w-full sm:justify-between">
          <Button variant="ghost" onClick={clearFilters}>
            Limpar Filtros
          </Button>
          <DialogClose asChild>
            <Button type="button">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
