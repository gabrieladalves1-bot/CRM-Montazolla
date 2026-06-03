import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Lead, SOURCES, STAGES } from '@/types/crm'

const generalSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  empresa: z.string().min(1, 'Empresa é obrigatória'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  instagram_usuario: z.string().optional(),
  instagram_link: z.string().url('URL inválida').optional().or(z.literal('')),
  fonte_contato: z.string().optional(),
  estagio_pipeline: z.string().optional(),
  valor_proposta: z.coerce.number().optional(),
  data_fechamento: z.string().optional(),
  data_contato: z.string().min(1, 'Data de contato é obrigatória'),
  endereco: z.string().optional(),
  site: z.string().url('URL inválida').optional().or(z.literal('')),
  categoria: z.string().optional(),
  maps_url: z.string().url('URL inválida').optional().or(z.literal('')),
})

export type GeneralFormValues = z.infer<typeof generalSchema>

const formatDateForInput = (dateString?: string) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toISOString().split('T')[0]
  } catch {
    return dateString.split(' ')[0]
  }
}

interface GeneralTabProps {
  lead: Lead
  onSave: (data: GeneralFormValues) => void
  onCancel: () => void
}

export function GeneralTab({ lead, onSave, onCancel }: GeneralTabProps) {
  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      nome: lead.nome,
      empresa: lead.empresa,
      telefone: lead.telefone || '',
      email: lead.email || '',
      instagram_usuario: lead.instagram_usuario || '',
      instagram_link: lead.instagram_link || '',
      fonte_contato: lead.fonte_contato || '',
      estagio_pipeline: lead.estagio_pipeline || '',
      valor_proposta: lead.valor_proposta || 0,
      data_fechamento: formatDateForInput(lead.data_fechamento),
      data_contato: formatDateForInput(lead.data_contato),
      endereco: lead.endereco || '',
      site: lead.site || '',
      categoria: lead.categoria || '',
      maps_url: lead.maps_url || '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Empresa</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
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
                <FormLabel>Fonte de Contato</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
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
                <FormLabel>Estágio do Pipeline</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
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
                <FormLabel>Valor da Proposta</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_contato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Contato</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_fechamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Fechamento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <FormLabel>Instagram (Usuário)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="instagram_link"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Instagram (Link)</FormLabel>
                <FormControl>
                  <Input type="url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endereco"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="site"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site</FormLabel>
                <FormControl>
                  <Input type="url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Salvar Alterações</Button>
        </div>
      </form>
    </Form>
  )
}
