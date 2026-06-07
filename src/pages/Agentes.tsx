import { useEffect, useState } from 'react'
import { Bot, Save, Power, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'

interface AgentConfig {
  id: string
  slug: string
  nome: string
  system_prompt: string
  ativo: boolean
}

export default function Agentes() {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('agentes_config')
      .getFullList<AgentConfig>({ sort: 'slug' })
      .then(setAgents)
      .catch(() => toast({ title: 'Erro ao carregar agentes', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  const updateField = (id: string, field: keyof AgentConfig, value: any) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const save = async (agent: AgentConfig) => {
    setSaving(agent.id)
    try {
      await pb.collection('agentes_config').update(agent.id, {
        system_prompt: agent.system_prompt,
        ativo: agent.ativo,
      })
      toast({ title: `${agent.nome} salvo com sucesso!` })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Carregando agentes...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Agentes de IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o comportamento dos agentes que respondem automaticamente no WhatsApp.
          Para desativar um agente em um lead específico, altere o campo "Agente Ativo" no
          cadastro do cliente.
        </p>
      </div>

      {agents.map((agent) => (
        <div key={agent.id} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  agent.slug === 'antonio' ? 'bg-blue-600' : 'bg-purple-600'
                }`}
              >
                {agent.nome[0]}
              </div>
              <div>
                <h2 className="font-semibold text-base">{agent.nome}</h2>
                <p className="text-xs text-muted-foreground">
                  {agent.slug === 'antonio'
                    ? 'Responde a leads que entram em contato via WhatsApp'
                    : 'Prospecção ativa — enviado para leads que foram abordados'}
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
              <Label className="text-sm">{agent.ativo ? 'Ativo' : 'Desativado'}</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">System Prompt</Label>
            <p className="text-xs text-muted-foreground">
              Instrução base que define a personalidade, regras e fluxo do agente.
            </p>
            <Textarea
              value={agent.system_prompt}
              onChange={(e) => updateField(agent.id, 'system_prompt', e.target.value)}
              rows={16}
              className="font-mono text-xs resize-y"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => save(agent)}
              disabled={saving === agent.id}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving === agent.id ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
