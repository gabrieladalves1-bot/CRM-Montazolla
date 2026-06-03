import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, RefreshCcw } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getHistorico, createHistorico } from '@/services/crm'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

const historySchema = z.object({
  tipo_contato: z.string().min(1, 'Tipo é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  data_contato: z.string().min(1, 'Data é obrigatória'),
})

type HistoryFormValues = z.infer<typeof historySchema>

export function HistoryTab({ leadId }: { leadId: string }) {
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState(false)
  const { toast } = useToast()

  const form = useForm<HistoryFormValues>({
    resolver: zodResolver(historySchema),
    defaultValues: {
      tipo_contato: '',
      descricao: '',
      data_contato: new Date().toISOString().split('T')[0],
    },
  })

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    setError(false)
    try {
      const data = await getHistorico(leadId)
      setHistory(data)
    } catch {
      setError(true)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [leadId, toast])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const onSubmit = async (data: HistoryFormValues) => {
    try {
      await createHistorico({ cliente_id: leadId, ...data })
      toast({ title: 'Salvo com sucesso' })
      setIsAdding(false)
      form.reset()
      loadHistory()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao salvar contato', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center space-y-4">
        <p className="text-red-500">Erro ao carregar histórico.</p>
        <Button variant="outline" onClick={loadHistory}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4 pb-12">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-sm text-muted-foreground">Histórico de Interações</h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" variant="secondary">
            <Plus className="h-4 w-4 mr-1" /> Adicionar Contato
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-muted/30 p-4 rounded-lg border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_contato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Contato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            'Ligação',
                            'WhatsApp',
                            'Reunião',
                            'Email',
                            'Reunião Agendada',
                            'Reunião Sincronizada',
                          ].map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_contato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Contato</Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      <div className="space-y-3">
        {history.length === 0 && !isAdding ? (
          <div className="bg-muted/50 rounded-lg p-8 text-sm text-muted-foreground text-center">
            Nenhum contato registrado.
          </div>
        ) : (
          history.map((h) => (
            <div key={h.id} className="bg-card border rounded-lg p-4 text-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-semibold text-foreground">{h.tipo_contato}</span>
                <span className="text-xs">
                  {new Date(h.data_contato).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">{h.descricao}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
