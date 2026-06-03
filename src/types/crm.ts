export type StageId =
  | 'Prospecção'
  | 'Sem Resposta'
  | 'Qualificado'
  | 'Reunião Agendada'
  | 'Reunião Realizada'
  | 'Proposta Enviada'
  | 'Contrato Assinado'
  | 'Onboarding'

export type SourceId = 'Indicação' | 'Prospecção' | 'Mídia Paga' | 'Orgânico'

export interface Stage {
  id: StageId
  title: string
  color: string
}

export interface Source {
  id: SourceId
  label: string
  colorClass: string
}

export interface Lead {
  id: string
  user_id: string
  nome: string
  empresa: string
  telefone?: string
  email?: string
  instagram_usuario?: string
  instagram_link?: string
  fonte_contato: SourceId
  estagio_pipeline: StageId
  valor_proposta?: number
  data_fechamento?: string
  data_contato: string
  endereco?: string
  site?: string
  categoria?: string
  maps_url?: string
  avaliacao?: number
  total_avaliacoes?: number
  agente_ativo?: 'Antônio' | 'Alexandre' | 'Manual'
  created: string
  updated: string
}

export const STAGES: Stage[] = [
  { id: 'Prospecção', title: 'Prospecção', color: 'bg-slate-500' },
  { id: 'Sem Resposta', title: 'Sem Resposta', color: 'bg-red-500' },
  { id: 'Qualificado', title: 'Qualificado', color: 'bg-amber-500' },
  { id: 'Reunião Agendada', title: 'Reunião Agendada', color: 'bg-blue-500' },
  { id: 'Reunião Realizada', title: 'Reunião Realizada', color: 'bg-indigo-500' },
  { id: 'Proposta Enviada', title: 'Proposta Enviada', color: 'bg-purple-500' },
  { id: 'Contrato Assinado', title: 'Contrato Assinado', color: 'bg-emerald-500' },
  { id: 'Onboarding', title: 'Onboarding', color: 'bg-teal-500' },
]

export const SOURCES: Source[] = [
  {
    id: 'Indicação',
    label: 'Indicação',
    colorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    id: 'Prospecção',
    label: 'Prospecção',
    colorClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  },
  {
    id: 'Mídia Paga',
    label: 'Mídia Paga',
    colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    id: 'Orgânico',
    label: 'Orgânico',
    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
]
