import { useState, useRef } from 'react'
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import pb from '@/lib/pocketbase/client'
import { useCRM } from '@/hooks/use-crm'
import { toast } from '@/hooks/use-toast'

function parseCSV(text: string): Record<string, string>[] {
  text = text.replace(/^\uFEFF/, '')

  const firstLine = text.split('\n')[0] || ''
  const delimiter =
    (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let val = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      val += '"'
      i++ // skip escaped quote
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      row.push(val)
      val = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++ // skip windows newline
      }
      row.push(val)
      if (row.some((r) => r.trim() !== '')) {
        rows.push(row)
      }
      row = []
      val = ''
    } else {
      val += char
    }
  }

  if (val || row.length > 0) {
    row.push(val)
    if (row.some((r) => r.trim() !== '')) {
      rows.push(row)
    }
  }

  if (rows.length < 2) return []

  const headers = rows[0].map((h) => h.trim().toLowerCase())
  console.log('Detected CSV headers:', headers)

  const data: Record<string, string>[] = []

  for (let i = 1; i < rows.length; i++) {
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j] !== undefined ? rows[i][j] : ''
    }
    data.push(obj)
  }

  return data
}

const findBusinessNameKey = (row: Record<string, string>) => {
  const keys = Object.keys(row)
  if (keys.includes('business_name')) return 'business_name'
  if (keys.includes('business name')) return 'business name'
  if (keys.includes('nome')) return 'nome'
  return keys.find((k) => k.includes('business') || k.includes('name'))
}

const standardizeRow = (row: Record<string, string>) => {
  const keys = Object.keys(row)
  const bNameKey = findBusinessNameKey(row)
  const phoneKey = keys.find(
    (k) => k === 'phone' || k === 'telefone' || k === 'phone number' || k.includes('phone'),
  )
  const categoryKey = keys.find((k) => k === 'category' || k === 'categoria')
  const addressKey = keys.find(
    (k) => k === 'address' || k === 'endereço' || k === 'endereco' || k === 'full_address',
  )
  const websiteKey = keys.find((k) => k === 'website' || k === 'site')
  const ratingKey = keys.find((k) => k === 'rating' || k === 'avaliação' || k === 'avaliacao')
  const reviewsKey = keys.find((k) => k === 'reviews' || k === 'avaliações' || k === 'avaliacoes')
  const mapsUrlKey = keys.find(
    (k) => k === 'google_maps_url' || k === 'maps_url' || k === 'url' || k.includes('maps'),
  )

  return {
    business_name: bNameKey ? row[bNameKey] : '',
    phone: phoneKey ? row[phoneKey] : '',
    category: categoryKey ? row[categoryKey] : '',
    address: addressKey ? row[addressKey] : '',
    website: websiteKey ? row[websiteKey] : '',
    rating: ratingKey ? row[ratingKey] : '',
    reviews: reviewsKey ? row[reviewsKey] : '',
    google_maps_url: mapsUrlKey ? row[mapsUrlKey] : '',
  }
}

const normalizePhone = (phone: string) => {
  if (!phone) return ''
  let numbers = phone.replace(/\D/g, '')
  if (numbers.length === 13 && numbers.startsWith('55')) {
    numbers = numbers.substring(2)
  }
  return numbers
}

export function ImportLeadsModal() {
  const { loadData } = useCRM()
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [rawRows, setRawRows] = useState<any[]>([])
  const [preview, setPreview] = useState<any[]>([])
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState({ imported: 0, skipped: 0, errors: 0, names: [] as string[] })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setRawRows([])
    setPreview([])
    setStatus('idle')
    setProgress(0)
    setErrorMsg('')
    setStats({ imported: 0, skipped: 0, errors: 0, names: [] })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && status === 'importing') return // Prevent close while importing
    setOpen(isOpen)
    if (!isOpen) {
      setTimeout(resetState, 300)
    }
  }

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Por favor, selecione um arquivo .csv válido.')
      setStatus('error')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setErrorMsg('O arquivo CSV parece estar vazio ou sem dados.')
        setStatus('error')
        return
      }

      const bNameKey = findBusinessNameKey(parsed[0])

      if (!bNameKey) {
        setErrorMsg('CSV inválido. Certifique-se de exportar do Maps2Sheets.')
        setStatus('error')
        return
      }

      const standardized = parsed.map(standardizeRow)

      setRawRows(standardized)
      setPreview(standardized.slice(0, 5))
      setStatus('idle')
      setErrorMsg('')
    }
    reader.readAsText(file)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const startImport = async () => {
    setStatus('importing')
    setProgress(0)
    const userId = pb.authStore.record?.id
    if (!userId) {
      setErrorMsg('Usuário não autenticado.')
      setStatus('error')
      return
    }

    try {
      const existingClients = await pb.collection('clientes').getFullList({ fields: 'telefone' })
      const existingPhones = new Set(existingClients.map((c: any) => c.telefone).filter(Boolean))

      let imported = 0
      let skipped = 0
      let errors = 0
      const names: string[] = []
      const total = rawRows.length

      for (let i = 0; i < total; i++) {
        const row = rawRows[i]

        const businessName = row.business_name?.trim()
        if (!businessName) {
          errors++
          console.log('Skipping row: missing business_name', row)
          continue
        }

        const phone = normalizePhone(row.phone || '')

        if (phone && existingPhones.has(phone)) {
          skipped++
          continue
        }

        try {
          const isInstagram = row.website?.includes('instagram.com')
          const siteUrl = isInstagram ? '' : row.website || ''
          const instaUrl = isInstagram ? row.website : ''

          let avaliacao = null
          if (row.rating) {
            const num = parseFloat(row.rating.replace(',', '.'))
            if (!isNaN(num)) avaliacao = num
          }

          let totalAvaliacoes = null
          if (row.reviews) {
            const num = parseInt(row.reviews, 10)
            if (!isNaN(num)) totalAvaliacoes = num
          }

          await pb.collection('clientes').create({
            user_id: userId,
            nome: businessName,
            empresa: businessName,
            telefone: phone,
            endereco: row.address || '',
            site: siteUrl,
            instagram_link: instaUrl,
            categoria: row.category || '',
            maps_url: row.google_maps_url || '',
            avaliacao: avaliacao,
            total_avaliacoes: totalAvaliacoes,
            estagio_pipeline: 'Prospecção',
            fonte_contato: 'Prospecção',
            data_contato: new Date().toISOString(),
          })

          if (phone) existingPhones.add(phone)
          imported++
          names.push(businessName)
        } catch (err) {
          errors++
          console.error('Error importing row:', row, err)
        }

        if (i % 3 === 0 || i === total - 1) {
          setProgress(Math.round(((i + 1) / total) * 100))
          await new Promise((r) => setTimeout(r, 0)) // Yield to unblock UI
        }
      }

      setStats({ imported, skipped, errors, names })
      setStatus('success')
      loadData()

      toast({
        title: 'Importação concluída',
        description: `${imported} leads importados, ${errors} erros, ${skipped} duplicatas.`,
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro desconhecido ao realizar a importação.')
      setStatus('error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white text-slate-900 border-slate-200 hover:bg-slate-100 shrink-0"
            >
              <UploadCloud className="h-4 w-4" />
              <span className="sr-only">Importar Leads</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Importar Leads</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Importar Leads do Maps2Sheets
          </DialogTitle>
          <DialogDescription>
            Faça o upload do arquivo CSV exportado pela extensão Maps2Sheets para adicionar novos
            leads ao seu pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto">
          {status === 'error' && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 border border-red-100">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Falha na importação</h4>
                <p className="text-sm mt-1">{errorMsg}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatus('idle')}
                  className="mt-3 bg-white text-red-700 border-red-200 hover:bg-red-50"
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-300">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Importação Concluída!</h3>
              <p className="text-gray-600 mb-6">
                <strong className="text-gray-900">{stats.imported}</strong> leads importados com
                sucesso.
                <br />
                <span className="text-sm text-gray-500">
                  {stats.errors} erros, {stats.skipped} duplicatas puladas.
                </span>
              </p>
              {stats.names.length > 0 && (
                <div className="w-full max-w-md bg-gray-50 border rounded-lg p-4 text-left">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Alguns leads importados:
                  </p>
                  <ScrollArea className="h-24">
                    <ul className="text-sm text-gray-700 space-y-1">
                      {stats.names.slice(0, 10).map((n, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {n}
                        </li>
                      ))}
                      {stats.names.length > 10 && (
                        <li className="text-gray-400 italic">
                          e mais {stats.names.length - 10}...
                        </li>
                      )}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {status === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Importando leads...</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">
                Isso pode levar alguns instantes. Por favor, não feche esta janela.
              </p>
              <div className="w-full max-w-md space-y-2">
                <Progress value={progress} className="h-2 w-full" />
                <p className="text-xs text-right font-medium text-gray-500">{progress}%</p>
              </div>
            </div>
          )}

          {(status === 'idle' || (status === 'error' && rawRows.length > 0)) && (
            <div className="space-y-6">
              {rawRows.length === 0 ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleFile(e.target.files[0])
                    }}
                  />
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-500">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Arraste um arquivo CSV ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-500">Apenas arquivos .csv são suportados</p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Pré-visualização ({rawRows.length} leads encontrados)
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetState}
                      className="h-8 text-xs text-gray-500"
                    >
                      <X className="h-3 w-3 mr-1" /> Remover arquivo
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[200px]">Nome do Negócio</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead className="hidden md:table-cell">Categoria</TableHead>
                          <TableHead className="hidden sm:table-cell">Endereço</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium truncate max-w-[200px]">
                              {row.business_name || '-'}
                            </TableCell>
                            <TableCell>{row.phone || '-'}</TableCell>
                            <TableCell className="hidden md:table-cell text-gray-500 truncate max-w-[150px]">
                              {row.category || '-'}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-gray-500 truncate max-w-[200px]">
                              {row.address || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {rawRows.length > 5 && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                      Exibindo apenas os primeiros 5 registros.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t bg-gray-50/50 flex justify-end gap-3">
          {status === 'success' ? (
            <Button onClick={() => handleOpenChange(false)}>Fechar</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={status === 'importing'}
              >
                Cancelar
              </Button>
              <Button
                onClick={startImport}
                disabled={rawRows.length === 0 || status === 'importing' || status === 'error'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Importar para o Banco
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
