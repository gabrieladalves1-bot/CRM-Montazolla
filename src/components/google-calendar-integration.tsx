import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function GoogleCalendarIntegration() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [clientId, setClientId] = useState('')

  const checkStatus = async () => {
    try {
      const records = await pb
        .collection('google_calendar_tokens')
        .getFullList({ requestKey: null })
      setIsConnected(records.length > 0)
    } catch {
      setIsConnected(false)
    }
  }

  const fetchConfig = async () => {
    try {
      const res = await pb.send('/backend/v1/google-calendar-config', { method: 'GET' })
      setClientId(res.clientId)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    if (pb.authStore.isValid) {
      checkStatus()
      fetchConfig()
    }
  }, [])

  useRealtime('google_calendar_tokens', () => {
    checkStatus()
  })

  const handleConnect = () => {
    if (!clientId) {
      toast({
        title: 'Erro',
        description: 'Cliente ID do Google Calendar não configurado.',
        variant: 'destructive',
      })
      return
    }
    setIsLoading(true)
    const redirectUri = window.location.origin + '/callback'
    const scope = 'https://www.googleapis.com/auth/calendar'
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`
    window.location.href = url
  }

  const handleDisconnect = async () => {
    try {
      setIsLoading(true)
      const records = await pb.collection('google_calendar_tokens').getFullList()
      for (const record of records) {
        await pb.collection('google_calendar_tokens').delete(record.id)
      }
      toast({
        title: 'Desconectado',
        description: 'Google Calendar desconectado com sucesso.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao desconectar.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isConnected === null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" disabled>
            <Loader2 className="w-4 h-4 animate-spin" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Verificando Google Calendar...</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (isConnected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDisconnect}
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            <span className="sr-only">Desconectar Google Calendar</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Desconectar Google Calendar</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={handleConnect}
          disabled={isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          <span className="sr-only">Conectar Google Calendar</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Conectar Google Calendar</p>
      </TooltipContent>
    </Tooltip>
  )
}
