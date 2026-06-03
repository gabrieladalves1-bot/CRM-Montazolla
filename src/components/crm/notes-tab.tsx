import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Trash2, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { getAnotacao, saveAnotacao, deleteAnotacao } from '@/services/crm'

export function NotesTab({ leadId }: { leadId: string }) {
  const [content, setContent] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [status, setStatus] = useState<'Salvando...' | 'Salvo' | 'Erro' | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const originalContent = useRef('')
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  const loadNote = useCallback(() => {
    let mounted = true
    setIsLoading(true)
    setError(false)
    getAnotacao(leadId)
      .then((res) => {
        if (mounted && res) {
          setContent(res.conteudo)
          originalContent.current = res.conteudo
          setNoteId(res.id)
        }
      })
      .catch(() => {
        if (mounted) setError(true)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [leadId])

  useEffect(() => {
    const cleanup = loadNote()
    return cleanup
  }, [loadNote])

  const handleContentChange = (val: string) => {
    setContent(val)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    setStatus('Salvando...')
    saveTimeout.current = setTimeout(async () => {
      try {
        const saved = await saveAnotacao(leadId, val, noteId || undefined)
        setNoteId(saved.id)
        originalContent.current = val
        setStatus('Salvo')
        setTimeout(() => setStatus(''), 2000)
      } catch {
        setStatus('Erro')
      }
    }, 2000)
  }

  const handleClear = async () => {
    if (confirm('Tem certeza que deseja limpar as anotações?')) {
      if (noteId) {
        setStatus('Salvando...')
        try {
          await deleteAnotacao(noteId)
          setNoteId(null)
        } catch {
          setStatus('Erro')
          return
        }
      }
      setContent('')
      originalContent.current = ''
      setStatus('Salvo')
      setTimeout(() => setStatus(''), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center space-y-4">
        <p className="text-red-500">Erro ao carregar anotações.</p>
        <Button variant="outline" onClick={loadNote}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4 flex flex-col h-[50vh] sm:h-[60vh] pb-12">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          {status === 'Salvando...' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'Salvo' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {status === 'Erro' && <AlertCircle className="h-4 w-4 text-red-500" />}
          {status}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4 mr-2" /> Limpar Anotações
        </Button>
      </div>
      <RichTextEditor
        value={content}
        onChange={handleContentChange}
        placeholder="Adicione anotações sobre este cliente..."
        className="flex-1"
      />
    </div>
  )
}
