import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const [status, setStatus] = useState('Conectando ao Google Calendar...')
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    if (error) {
      toast({ title: 'Erro de Autorização', description: error, variant: 'destructive' })
      navigate('/')
      return
    }

    if (!code) {
      navigate('/')
      return
    }

    const exchangeCode = async () => {
      try {
        const redirectUri = window.location.origin + '/callback'
        await pb.send('/backend/v1/google-calendar-auth', {
          method: 'POST',
          body: JSON.stringify({ code, redirectUri }),
          headers: { 'Content-Type': 'application/json' },
        })
        toast({ title: 'Sucesso', description: 'Google Calendar conectado com sucesso! ✓' })
        navigate('/')
      } catch (err: any) {
        console.error(err)
        setStatus('Falha ao conectar. Tente novamente.')
      }
    }

    exchangeCode()
  }, [code, error, navigate])

  if (status === 'Falha ao conectar. Tente novamente.') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center space-y-4 bg-background">
        <p className="text-destructive font-medium text-lg">{status}</p>
        <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center space-y-4 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium text-lg">{status}</p>
    </div>
  )
}
