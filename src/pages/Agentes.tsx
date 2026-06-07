import { useEffect, useState } from 'react'
import { Bot, Save, Power, PowerOff, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'

interface AgentConfig {
  id: string
  slug: string
  nome: string
  system_prompt: string
  template_mensagem: string
  ativo: boolean
  tipo: 'agente' | 'automacao'
}

const AGENT_COLORS: Record<string, string> = {
  antonio: 'bg-blue-600',
  alexandre: 'bg-purple-600',
  sofia: 'bg-rose-600',
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  antonio: 'Atende leads que entram em contato via WhatsApp',
  alexandre: 'Prospecção ativa — enviado para leads abordados',
  sofia: 'Gera propostas comerciais personalizadas com IA',
}

const AUTOMACAO_DESCRIPTIONS: Record<string, string> = {
  lembrete_reuniao: 'Enviado automaticamente 1h antes de cada reunião',
  confirmacao_agendamento: 'Enviado quando o lead agenda pelo link público',
  boas_vindas_onboarding: 'Enviado quando o lead move para Onboarding',
}

const TEMPLATE_VARS = ['{{nome}}', '{{empresa}}', '{{data_hora}}', '{{link_reuniao}}']

export default function Agentes() {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('agentes_config')
      .getFullList<AgentConfig>({ sort: 'tipo,slug' })
      .then(setAgents)
      .catch(() => toast({ title: 'Erro ao carregar agentes', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  const updateField = (id: string, field: keyof AgentConfig, value: any) =>
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))

  const save = async (agent: AgentConfig) => {
    setSaving(agent.id)
    try {
      const data =
        agent.tipo === 'agente'
          ? { system_prompt: agent.system_prompt, ativo: agent.ativo }
          : { template_mensagem: agent.template_mensagem, ativo: agent.ativo }
      await pb.collection('agentes_config').update(agent.id, data)
      toast({ title: `${agent.nome} salvo!` })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  const aiAgents = agents.filter((a) => a.tipo === 'agente')
  const automacoes = agents.filter((a) => a.tipo === 'automacao')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      {/* Agentes de IA */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-5 w-5" />
          <h1 className="text-xl font-bold tracking-tight">Agentes de IA</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Respondem automaticamente via WhatsApp usando Claude. Edite o system prompt para
          personalizar o comportamento.
        </p>

        <div className="space-y-6">
          {aiAgents.map((agent) => (
            <div key={agent.id} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${AGENT_COLORS[agent.slug] || 'bg-slate-600'}`}
                  >
                    {agent.nome[0]}
                  </div>
                  <div>
                    <h2 className="font-semibold">{agent.nome}</h2>
                    <p className="text-xs text-muted-foreground">
                      {AGENT_DESCRIPTIONS[agent.slug] || ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {agent.ativo ? (
                    <Power className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <PowerOff className="h-4 w-4 text-red-500" />
                  )}
                  <Switch
                    checked={agent.ativo}
                    onCheckedChange={(v) => updateField(agent.id, 'ativo', v)}
                  />
                  <Label className="text-sm w-16">{agent.ativo ? 'Ativo' : 'Inativo'}</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">System Prompt</Label>
                <p className="text-xs text-muted-foreground">
                  Define a personalidade, regras e fluxo do agente.
                </p>
                <Textarea
                  value={agent.system_prompt || ''}
                  onChange={(e) => updateField(agent.id, 'system_prompt', e.target.value)}
                  rows={14}
                  className="font-mono text-xs resize-y"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => save(agent)} disabled={saving === agent.id} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving === agent.id ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Automações Gratuitas */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h1 className="text-xl font-bold tracking-tight">Automações</h1>
          <Badge variant="secondary" className="text-xs">Sem custo de IA</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Mensagens automáticas com templates fixos — sem consumo de tokens.
          Use <code className="bg-muted px-1 rounded text-xs">{'{{variavel}}'}</code> para personalizar.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {TEMPLATE_VARS.map((v) => (
            <code key={v} className="bg-muted text-xs px-2 py-1 rounded border border-border">
              {v}
            </code>
          ))}
        </div>

        <div className="space-y-6">
          {automacoes.map((auto) => (
            <div key={auto.id} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{auto.nome}</h2>
                    <p className="text-xs text-muted-foreground">
                      {AUTOMACAO_DESCRIPTIONS[auto.slug] || ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {auto.ativo ? (
                    <Power className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <PowerOff className="h-4 w-4 text-red-500" />
                  )}
                  <Switch
                    checked={auto.ativo}
                    onCheckedChange={(v) => updateField(auto.id, 'ativo', v)}
                  />
                  <Label className="text-sm w-16">{auto.ativo ? 'Ativa' : 'Inativa'}</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Mensagem</Label>
                <Textarea
                  value={auto.template_mensagem || ''}
                  onChange={(e) => updateField(auto.id, 'template_mensagem', e.target.value)}
                  rows={6}
                  placeholder="Digite a mensagem aqui. Use {{nome}}, {{empresa}}, {{data_hora}}, {{link_reuniao}}"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => save(auto)} disabled={saving === auto.id} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving === auto.id ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
