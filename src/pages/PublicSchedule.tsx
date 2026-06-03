import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { format, isWeekend, startOfToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Video, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export default function PublicSchedule() {
  const [userId] = useState<string>('5n0cy3l52tme5tm')
  // view states: date, time, form
  const [view, setView] = useState<'date' | 'time' | 'form'>('date')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>(undefined)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    empresa: '',
    instagram_usuario: '',
    telefone: '',
    assunto: '',
  })

  useEffect(() => {
    if (!selectedDate || !userId) {
      setAvailableSlots([])
      setSelectedSlot(undefined)
      return
    }

    const fetchSlots = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      setLoadingSlots(true)
      setSelectedSlot(undefined)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/availability/${userId}?date=${dateStr}`,
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        setAvailableSlots(data.slots || [])
      } catch (err) {
        toast.error('Erro ao carregar horários. Tente novamente.')
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedDate, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return toast.error('Selecione um horário')
    setSubmitting(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/book/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          data_hora: selectedSlot,
        }),
      })
      if (!res.ok) {
        throw new Error('Erro ao agendar')
      }
      setSuccess(true)
    } catch (err) {
      toast.error('Erro ao agendar. O horário pode não estar mais disponível.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="h-[100dvh] md:min-h-screen md:h-auto bg-white md:bg-slate-50 text-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white md:rounded-2xl md:shadow-lg p-6 md:p-8 text-center flex flex-col items-center justify-center h-full md:h-auto">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
          <p className="text-slate-600 mb-8">
            Sua reunião foi agendada! O link da reunião está garantido e nosso consultor entrará em
            contato.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full h-12 text-lg md:text-sm md:h-10"
          >
            Agendar nova reunião
          </Button>
        </div>
      </div>
    )
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  const handleTimeSelect = (slot: string) => {
    setSelectedSlot(slot)
  }

  return (
    <div className="h-[100dvh] md:h-auto md:min-h-screen bg-white md:bg-slate-50 text-gray-900 flex flex-col md:items-center md:py-12 md:px-4 sm:px-6">
      <div className="w-full h-full md:h-auto max-w-4xl bg-white md:rounded-2xl md:shadow-xl overflow-hidden flex flex-col md:flex-row md:min-h-[600px]">
        {/* Sidebar */}
        <div className="md:w-1/3 bg-slate-900 text-white p-4 pb-4 md:p-8 flex flex-col shrink-0">
          <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">Reunião de Alinhamento</h2>
          <p className="text-slate-300 flex-1 hidden md:block text-sm md:text-base">
            Selecione o melhor dia e horário para conversarmos sobre o seu projeto e como podemos
            ajudar.
          </p>
          <div className="mt-2 md:mt-8 flex md:flex-col items-center md:items-start gap-4 md:gap-4 md:space-y-0 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              <span>30 Minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              <span>Google Meet</span>
            </div>
          </div>
          {selectedSlot && view === 'form' && (
            <div className="md:pt-4 md:mt-4 md:border-t md:border-slate-700 hidden md:block">
              <p className="text-sm font-medium text-emerald-400">Horário Selecionado</p>
              <p className="mt-1 md:text-lg">
                {format(parseISO(selectedSlot), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-8 flex flex-col overflow-hidden relative">
          {view !== 'form' ? (
            <div className="flex flex-col md:flex-row gap-0 md:gap-8 h-full">
              {/* Date Section */}
              <div
                className={cn(
                  'flex-1 flex flex-col h-full overflow-hidden',
                  view === 'date' ? 'flex' : 'hidden md:flex',
                )}
              >
                <h3 className="text-lg font-semibold mb-2 md:mb-4 shrink-0 text-center md:text-left">
                  Selecione uma data
                </h3>
                <div className="flex-1 overflow-y-auto min-h-0 flex justify-center md:justify-start items-start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => isWeekend(date) || date < startOfToday()}
                    locale={ptBR}
                    className="border-0 md:border rounded-lg md:p-3 w-full max-w-[340px] md:max-w-none shadow-sm md:shadow-none"
                  />
                </div>
                {/* Mobile Continue Date */}
                {selectedDate && (
                  <div className="md:hidden mt-auto pt-4 shrink-0">
                    <Button className="w-full h-12 text-lg" onClick={() => setView('time')}>
                      Continuar
                    </Button>
                  </div>
                )}
              </div>

              {/* Time Section */}
              <div
                className={cn(
                  'w-full md:w-48 flex flex-col h-full overflow-hidden',
                  view === 'time' ? 'flex' : 'hidden md:flex',
                  !selectedDate && 'md:hidden',
                )}
              >
                <div className="md:hidden mb-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView('date')}
                    className="-ml-3 h-10"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Voltar
                  </Button>
                </div>
                <h3 className="text-lg font-semibold mb-2 md:mb-4 shrink-0 text-center md:text-left">
                  {selectedDate ? format(selectedDate, 'EEEE, dd/MM', { locale: ptBR }) : ''}
                </h3>
                <ScrollArea className="flex-1 min-h-0 -mx-2 px-2 md:mx-0 md:px-0">
                  <div className="pr-4 md:pr-4">
                    {loadingSlots ? (
                      <div className="space-y-3 md:space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-12 md:h-10 bg-slate-100 animate-pulse rounded-md"
                          ></div>
                        ))}
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">
                        Nenhum horário disponível nesta data.
                      </p>
                    ) : (
                      <div className="space-y-3 md:space-y-2 pb-4 md:pb-0">
                        {availableSlots.map((slot) => {
                          const timeStr = format(parseISO(slot), 'HH:mm')
                          const isSelected = selectedSlot === slot
                          return (
                            <Button
                              key={slot}
                              variant={isSelected ? 'default' : 'outline'}
                              className={cn(
                                'w-full justify-center text-base md:text-sm',
                                isSelected ? 'h-12 md:h-10' : 'h-12 md:h-10',
                              )}
                              onClick={() => handleTimeSelect(slot)}
                            >
                              {timeStr}
                            </Button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
                {/* Mobile Continue Time */}
                {selectedSlot && (
                  <div className="mt-4 md:mt-6 pt-4 border-t shrink-0">
                    <Button
                      className="w-full h-12 text-lg md:h-10 md:text-sm"
                      onClick={() => setView('form')}
                    >
                      Continuar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('time')}
                className="w-fit mb-1 md:mb-6 shrink-0 -ml-2 md:-ml-3 h-8 md:h-10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Voltar aos horários</span>
                <span className="md:hidden">Voltar</span>
              </Button>
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-6 shrink-0">
                Seus detalhes
              </h3>

              {/* Selected Slot summary on mobile inside form view */}
              {selectedSlot && (
                <div className="md:hidden bg-slate-50 p-2 rounded-lg mb-3 border border-slate-100 shrink-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                      Horário
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {format(parseISO(selectedSlot), "dd/MM 'às' HH:mm")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView('time')}
                    className="text-primary p-0 h-auto text-xs"
                  >
                    Alterar
                  </Button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 md:mx-0 md:px-0">
                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 pb-2 md:pb-0">
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="nome" className="text-xs md:text-sm">
                      Nome completo
                    </Label>
                    <Input
                      id="nome"
                      required
                      className="h-10 md:h-10 text-sm"
                      value={form.nome}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="empresa" className="text-xs md:text-sm">
                      Empresa (opcional)
                    </Label>
                    <Input
                      id="empresa"
                      className="h-10 md:h-10 text-sm"
                      value={form.empresa}
                      onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="instagram_usuario" className="text-xs md:text-sm">
                        Instagram (ex: @usuario)
                      </Label>
                      <Input
                        id="instagram_usuario"
                        required
                        className="h-10 md:h-10 text-sm"
                        value={form.instagram_usuario}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, instagram_usuario: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="telefone" className="text-xs md:text-sm">
                        Telefone / WhatsApp
                      </Label>
                      <Input
                        id="telefone"
                        required
                        className="h-10 md:h-10 text-sm"
                        value={form.telefone}
                        onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="assunto" className="text-xs md:text-sm">
                      Assunto da reunião
                    </Label>
                    <Textarea
                      id="assunto"
                      required
                      rows={1}
                      className="resize-none min-h-[60px] md:min-h-[80px] text-sm"
                      value={form.assunto}
                      onChange={(e) => setForm((f) => ({ ...f, assunto: e.target.value }))}
                      placeholder="Sobre o que vamos conversar?"
                    />
                  </div>
                  <div className="pt-1 md:pt-6 pb-2">
                    <Button
                      type="submit"
                      className="w-full h-10 md:h-12 text-sm md:text-sm font-medium"
                      disabled={submitting}
                    >
                      {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
