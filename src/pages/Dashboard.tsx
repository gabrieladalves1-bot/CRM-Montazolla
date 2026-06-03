import { useMemo } from 'react'
import { useCRM } from '@/hooks/use-crm'
import { STAGES } from '@/types/crm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Calendar as CalendarIcon, Target } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
  const { leads, isLoading, error } = useCRM()

  const funnelData = useMemo(() => {
    if (!leads.length) return []
    const totalLeads = leads.length

    return STAGES.map((stage) => {
      const count = leads.filter((l) => l.estagio_pipeline === stage.id).length
      const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0

      return {
        id: stage.id,
        title: stage.title,
        count,
        percentage,
      }
    })
  }, [leads])

  const totalLeads = leads.length

  // Stats calculations
  const wonLeads = leads.filter(
    (l) => l.estagio_pipeline === 'Contrato Assinado' || l.estagio_pipeline === 'Onboarding',
  ).length
  const wonRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-destructive">{error}</div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto bg-muted/20">
      <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard de Vendas</h1>
          <p className="text-muted-foreground">Métricas de conversão e overview do pipeline</p>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12" /> : totalLeads}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Empresas Atendidas</CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  new Set(leads.map((l) => l.empresa)).size
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Fechamentos</CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12" /> : wonLeads}
              </div>
              <p className="text-xs text-muted-foreground">Contratos ou Onboarding</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12" /> : `${wonRate}%`}
              </div>
              <p className="text-xs text-muted-foreground">Prospecção → Fechamento</p>
            </CardContent>
          </Card>
        </div>

        {/* 3D Funnel Chart */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Funil de Vendas 3D</CardTitle>
            <CardDescription>Distribuição de clientes em cada etapa do pipeline</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-12">
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full max-w-md mx-auto" />
                ))}
              </div>
            ) : funnelData.length > 0 ? (
              <div className="w-full max-w-2xl mx-auto relative">
                <svg
                  viewBox="0 0 600 500"
                  className="w-full h-auto drop-shadow-xl overflow-visible"
                >
                  <defs>
                    <linearGradient id="body-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="25%" stopColor="#60a5fa" />
                      <stop offset="75%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                    <linearGradient id="top-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.1" />
                    </filter>
                  </defs>

                  {funnelData.map((stage, i) => {
                    const N = STAGES.length
                    const FUNNEL_CENTER_X = 200
                    const W_MAX = 280
                    const W_MIN = 80
                    const H_TOTAL = 420
                    const GAP = 6
                    const H_SEG = (H_TOTAL - GAP * (N - 1)) / N
                    const RY = 14

                    const yTop = 20 + i * (H_SEG + GAP)
                    const yBot = yTop + H_SEG
                    const getW = (y: number) => W_MAX - ((W_MAX - W_MIN) * (y - 20)) / H_TOTAL
                    const wTop = getW(yTop)
                    const wBot = getW(yBot)

                    const pathD = `
                      M ${FUNNEL_CENTER_X - wTop / 2} ${yTop}
                      A ${wTop / 2} ${RY} 0 0 0 ${FUNNEL_CENTER_X + wTop / 2} ${yTop}
                      L ${FUNNEL_CENTER_X + wBot / 2} ${yBot}
                      A ${wBot / 2} ${RY} 0 0 1 ${FUNNEL_CENTER_X - wBot / 2} ${yBot}
                      Z
                    `

                    const centerY = yTop + H_SEG / 2

                    return (
                      <g
                        key={stage.id}
                        className="group transition-all duration-300 hover:-translate-y-1 cursor-default"
                      >
                        {/* Body */}
                        <path
                          d={pathD}
                          fill="url(#body-gradient)"
                          stroke="#1e3a8a"
                          strokeWidth="1"
                          filter="url(#shadow)"
                          className="opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        {/* Top Ellipse */}
                        <ellipse
                          cx={FUNNEL_CENTER_X}
                          cy={yTop}
                          rx={wTop / 2}
                          ry={RY}
                          fill="url(#top-gradient)"
                          stroke="#60a5fa"
                          strokeWidth="1"
                          className="opacity-90 group-hover:opacity-100 transition-opacity"
                        />

                        {/* Connecting Line */}
                        <polyline
                          points={`${FUNNEL_CENTER_X + wTop / 2 + 5},${centerY} 370,${centerY}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          className="text-muted-foreground/50"
                        />
                        {/* Label Group */}
                        <text
                          x="380"
                          y={centerY - 4}
                          fill="currentColor"
                          fontSize="15"
                          fontWeight="600"
                          className="text-foreground"
                        >
                          {stage.title}
                        </text>
                        <text
                          x="380"
                          y={centerY + 18}
                          fill="currentColor"
                          fontSize="15"
                          fontWeight="600"
                          className="text-foreground"
                        >
                          {stage.count} leads ({stage.percentage}%)
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Target className="w-12 h-12 mb-4 opacity-20" />
                <p>Nenhum dado encontrado no funil.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
