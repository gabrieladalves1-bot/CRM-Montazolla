import { useState, useEffect } from 'react'
import {
  Plus,
  FileText,
  MoreVertical,
  Trash2,
  Edit2,
  FileDown,
  FolderPlus,
  Folder,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Pasta {
  id: string
  nome: string
}

interface Documento {
  id: string
  titulo: string
  conteudo: string
  pasta_id: string
  updated: string
}

export default function Documentos() {
  const { user } = useAuth()
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [selectedPastaId, setSelectedPastaId] = useState<string | null>(null)

  const [pastaDialog, setPastaDialog] = useState(false)
  const [pastaNome, setPastaNome] = useState('')
  const [editingPastaId, setEditingPastaId] = useState('')

  const [docDialog, setDocDialog] = useState(false)
  const [currentDoc, setCurrentDoc] = useState<Partial<Documento>>({})
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    if (!user) return
    const p = await pb.collection('pastas_documentos').getFullList<Pasta>({ sort: 'created' })
    setPastas(p)
    const d = await pb.collection('documentos').getFullList<Documento>({ sort: '-updated' })
    setDocumentos(d)
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime('pastas_documentos', () => loadData())
  useRealtime('documentos', () => loadData())

  const handleSavePasta = async () => {
    if (!pastaNome.trim()) return
    try {
      if (editingPastaId) {
        await pb.collection('pastas_documentos').update(editingPastaId, { nome: pastaNome.trim() })
      } else {
        await pb
          .collection('pastas_documentos')
          .create({ nome: pastaNome.trim(), user_id: user.id })
      }
      setPastaDialog(false)
      setPastaNome('')
      setEditingPastaId('')
    } catch (e) {
      toast({ title: 'Erro ao salvar pasta', variant: 'destructive' })
    }
  }

  const handleDeletePasta = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (confirm('Excluir esta pasta e todos os seus documentos permanentemente?')) {
      try {
        await pb.collection('pastas_documentos').delete(id)
        if (selectedPastaId === id) setSelectedPastaId(null)
      } catch (err) {
        toast({ title: 'Erro ao excluir pasta', variant: 'destructive' })
      }
    }
  }

  const handleSaveDoc = async () => {
    if (!currentDoc.titulo?.trim() || !currentDoc.pasta_id) {
      toast({ title: 'Preencha o título', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (currentDoc.id) {
        await pb.collection('documentos').update(currentDoc.id, {
          titulo: currentDoc.titulo.trim(),
          conteudo: currentDoc.conteudo || '',
          pasta_id: currentDoc.pasta_id,
        })
        toast({ title: 'Documento salvo' })
      } else {
        await pb.collection('documentos').create({
          titulo: currentDoc.titulo.trim(),
          conteudo: currentDoc.conteudo || '',
          pasta_id: currentDoc.pasta_id,
          user_id: user.id,
        })
        toast({ title: 'Documento criado' })
      }
      setDocDialog(false)
    } catch (e) {
      toast({ title: 'Erro ao salvar documento', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDoc = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (confirm('Excluir este documento?')) {
      try {
        await pb.collection('documentos').delete(id)
        setDocDialog(false)
      } catch (err) {
        toast({ title: 'Erro ao excluir documento', variant: 'destructive' })
      }
    }
  }

  const handleExportPDF = () => {
    if (!currentDoc.titulo) return
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(`
        <html>
          <head>
            <title>${currentDoc.titulo}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
              h1 { text-align: center; margin-bottom: 30px; font-size: 2em; }
              img { max-width: 100%; height: auto; }
              p { line-height: 1.6; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; }
            </style>
          </head>
          <body>
            <h1>${currentDoc.titulo}</h1>
            ${currentDoc.conteudo || ''}
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.parent.document.body.removeChild(window.frameElement), 1000);
              }
            </script>
          </body>
        </html>
      `)
      doc.close()
    }
  }

  const handleDragStart = (e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData('docId', docId)
  }

  const handleDrop = async (e: React.DragEvent, pastaId: string) => {
    e.preventDefault()
    const docId = e.dataTransfer.getData('docId')
    if (docId) {
      const doc = documentos.find((d) => d.id === docId)
      if (doc && doc.pasta_id !== pastaId) {
        try {
          await pb.collection('documentos').update(docId, { pasta_id: pastaId })
          toast({ title: 'Documento movido com sucesso' })
        } catch (err) {
          toast({ title: 'Erro ao mover documento', variant: 'destructive' })
        }
      }
    }
  }

  const selectedPasta = pastas.find((p) => p.id === selectedPastaId)
  const folderDocs = documentos.filter((d) => d.pasta_id === selectedPastaId)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Documentos</h2>
          <p className="text-muted-foreground">Gerencie seus arquivos e anotações.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPastaNome('')
              setEditingPastaId('')
              setPastaDialog(true)
            }}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Nova Pasta
          </Button>
          <Button
            onClick={() => {
              if (pastas.length === 0)
                return toast({ title: 'Crie uma pasta primeiro', variant: 'destructive' })
              setCurrentDoc({ pasta_id: selectedPastaId || pastas[0].id, titulo: '', conteudo: '' })
              setDocDialog(true)
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Criar Documento
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {!selectedPastaId ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pastas.map((pasta) => (
              <Card
                key={pasta.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, pasta.id)}
                className="cursor-pointer group hover:border-primary/50 transition-all relative overflow-hidden"
                onClick={() => setSelectedPastaId(pasta.id)}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <div className="relative">
                    <Folder className="w-12 h-12 text-blue-500/80 group-hover:text-blue-600 transition-colors" />
                    <div className="absolute -bottom-1 -right-2 bg-background text-xs font-semibold px-1.5 py-0.5 rounded-full border shadow-sm">
                      {documentos.filter((d) => d.pasta_id === pasta.id).length}
                    </div>
                  </div>
                  <span className="font-medium text-sm line-clamp-2">{pasta.nome}</span>
                </CardContent>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingPastaId(pasta.id)
                          setPastaNome(pasta.nome)
                          setPastaDialog(true)
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" /> Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeletePasta(pasta.id, e as any)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
            {pastas.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center">
                <FolderPlus className="w-12 h-12 mb-4 text-slate-300" />
                <p>Nenhuma pasta criada. Crie uma para começar a organizar seus documentos.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPastaId(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar às pastas
              </Button>
              <div className="flex items-center gap-2 text-xl font-semibold">
                <Folder className="w-6 h-6 text-blue-500" />
                {selectedPasta?.nome}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {folderDocs.map((doc) => (
                <Card
                  key={doc.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, doc.id)}
                  className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm group"
                  onClick={() => {
                    setCurrentDoc(doc)
                    setDocDialog(true)
                  }}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                    <CardTitle className="text-sm font-medium leading-tight line-clamp-2 pr-2">
                      {doc.titulo}
                    </CardTitle>
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex items-end justify-between">
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.updated).toLocaleDateString()}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteDoc(doc.id, e as any)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {folderDocs.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center bg-slate-50/50 rounded-xl border border-dashed">
                  <FileText className="w-8 h-8 mb-3 text-slate-300" />
                  <p>Nenhum documento nesta pasta.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={pastaDialog} onOpenChange={setPastaDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPastaId ? 'Renomear Pasta' : 'Nova Pasta'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nome da pasta"
              value={pastaNome}
              onChange={(e) => setPastaNome(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSavePasta()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPastaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePasta}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <div className="flex items-center justify-between p-4 border-b shrink-0 bg-background rounded-t-lg z-10 flex-wrap gap-2">
            <div className="flex-1 flex items-center gap-4 min-w-[200px]">
              <Input
                placeholder="Título do Documento"
                value={currentDoc.titulo || ''}
                onChange={(e) => setCurrentDoc((prev) => ({ ...prev, titulo: e.target.value }))}
                className="max-w-md border-none text-lg font-semibold px-0 focus-visible:ring-0 shadow-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                title="Exportar para PDF"
              >
                <FileDown className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Exportar PDF</span>
              </Button>
              {currentDoc.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDeleteDoc(currentDoc.id!, e as any)}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Excluir</span>
                </Button>
              )}
              <Button size="sm" onClick={handleSaveDoc} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-hidden flex flex-col bg-muted/10">
            <RichTextEditor
              value={currentDoc.conteudo || ''}
              onChange={(val) => setCurrentDoc((prev) => ({ ...prev, conteudo: val }))}
              placeholder="Escreva seu documento aqui..."
              className="flex-1 border shadow-sm"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
