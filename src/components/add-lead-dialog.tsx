import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus,
  CalendarIcon,
  Phone,
  Mail,
  Instagram,
  Link as LinkIcon,
  Building2,
  User,
  DollarSign,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCRM } from '@/hooks/use-crm'
import { SOURCES, STAGES, SourceId, StageId } from '@/types/crm'
import { cn } from '@/lib/utils'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

const formSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  empresa: z.string().min(2, 'A empresa deve ter no mínimo 2 caracteres'),
  telefone: z
    .string()
    .min(1, 'O telefone é obrigatório')
    .regex(/^[\d\s\-+()]+$/, 'Formato inválido'),
  email: z.string().min(1, 'O e-mail é obrigatório').email('E-mail inválido'),
  instagram_usuario: z.string().optional(),
  instagram_link: z
    .string()
    .optional()
    .refine((v) => !v || z.string().url().safeParse(v).success, 'URL inválida'),
  fonte_contato: z.enum(['Indicação', 'Prospecção', 'Mídia Paga', 'Orgânico']),
  estagio_pipeline: z.enum([
    'Prospecção',
    'Sem Resposta',
    'Qualificado',
    'Reunião Agendada',
    'Reunião Realizada',
    'Proposta Enviada',
    'Contrato Assinado',
    'Onboarding',
  ]),
  valor_proposta: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Number(v)), 'Deve ser número')
    .transform((v) => (v ? Number(v) : undefined)),
  data_fechamento: z.date().optional(),
  data_contato: z.date({ required_error: 'A data de contato é obrigatória' }),
  notes: z.string().optional(),
})

export function AddLeadDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { addLead } = useCRM()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      empresa: '',
      telefone: '',
      email: '',
      instagram_usuario: '',
      instagram_link: '',
      fonte_contato: 'Prospecção',
      estagio_pipeline: 'Prospecção',
      valor_proposta: '',
      notes: '',
      data_contato: new Date(),
    },
  })

  const resetForm = () => {
    form.reset({
      nome: '',
      empresa: '',
      telefone: '',
      email: '',
      instagram_usuario: '',
      instagram_link: '',
      fonte_contato: 'Prospecção',
      estagio_pipeline: 'Prospecção',
      valor_proposta: '',
      notes: '',
      data_contato: new Date(),
    })
    setErrorMsg(null)
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      await addLead({
        ...values,
        telefone: values.telefone.replace(/\D/g, ''),
        fonte_contato: values.fonte_contato as SourceId,
        estagio_pipeline: values.estagio_pipeline as StageId,
        data_fechamento: values.data_fechamento?.toISOString(),
        data_contato: values.data_contato.toISOString(),
      })
      setOpen(false)
      resetForm()
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.telefone) {
        form.setError('telefone', { message: fieldErrors.telefone })
      } else {
        setErrorMsg('Erro ao salvar no banco de dados. Verifique os dados e tente novamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetForm()
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Adicionar Cliente</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Adicionar Cliente</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="p-0 overflow-hidden sm:max-w-[700px] border-none shadow-2xl animate-fade-in-up">
        <DialogHeader className="bg-gradient-to-r from-blue-900 to-blue-500 p-6 pb-8">
          <DialogTitle className="text-white text-2xl font-bold">
            Adicionar Novo Cliente
          </DialogTitle>
          <DialogDescription className="text-blue-100 text-base mt-1">
            Preencha os detalhes abaixo para adicionar um lead ao pipeline.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 pt-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {errorMsg && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-md flex items-center justify-between border border-red-100">
                    <span className="text-sm font-medium">{errorMsg}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.handleSubmit(onSubmit)()}
                      className="border-red-200 text-red-600 hover:bg-red-100 h-8"
                    >
                      Tentar novamente
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700">
                          <User className="w-4 h-4 text-blue-500" />
                          Nome do Contato
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Maria Silva"
                            className="focus-visible:ring-blue-500 border-slate-200"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          Empresa
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Tech Solutions"
                            className="focus-visible:ring-blue-500 border-slate-200"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700">
                          <Phone className="w-4 h-4 text-blue-500" />
                          Telefone
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(00) 00000-0000"
                            className="focus-visible:ring-blue-500 border-slate-200"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700">
                          <Mail className="w-4 h-4 text-blue-500" />
                          E-mail
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="contato@empresa.com"
                            className="focus-visible:ring-blue-500 border-slate-200"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagram_usuario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700">
                          <Instagram className="w-4 h-4 text-pink-500" />
                          Instagram (Usuário)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="@usuario"
                            className="focus-visible:ring-blue-500 border-slate-200"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagram_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700">
                          <LinkIcon className="w-4 h-4 text-blue-500" />
                          Instagram (Link)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://instagram.com/usuario"
                            className="focus-visible:ring-blue-500 border-slate-200"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fonte_contato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Fonte</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="focus-visible:ring-blue-500 border-slate-200">
                              <SelectValue placeholder="Selecione a fonte" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SOURCES.map((source) => (
                              <SelectItem key={source.id} value={source.id}>
                                {source.label}
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
                    name="estagio_pipeline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Estágio Inicial</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="focus-visible:ring-blue-500 border-slate-200">
                              <SelectValue placeholder="Selecione o estágio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STAGES.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.title}
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
                    name="valor_proposta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-700">
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                          Valor da Proposta
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="R$ 0,00"
                            className="focus-visible:ring-blue-500 border-slate-200"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_contato"
                    render={({ field }) => (
                      <FormItem className="flex flex-col mt-2.5">
                        <FormLabel className="text-slate-700 mb-1.5">Data de Contato</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal focus-visible:ring-blue-500 border-slate-200',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: ptBR })
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_fechamento"
                    render={({ field }) => (
                      <FormItem className="flex flex-col mt-2.5">
                        <FormLabel className="text-slate-700 mb-1.5">Data de Fechamento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal focus-visible:ring-blue-500 border-slate-200',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: ptBR })
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Observações Iniciais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes adicionais sobre o cliente..."
                          className="resize-none focus-visible:ring-blue-500 border-slate-200 min-h-[100px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-6 mt-6 border-t border-slate-100 flex-col sm:flex-row gap-3 sm:gap-2">
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto text-slate-600 border-slate-200 hover:bg-slate-50"
                    >
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    {isSubmitting ? 'Criando...' : 'Criar Cliente'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
