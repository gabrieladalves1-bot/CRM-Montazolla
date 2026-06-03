import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Lead, SourceId, StageId } from '@/types/crm'
import { toast } from '@/hooks/use-toast'
import { getClientes, createCliente, updateCliente, moveCliente, deleteCliente } from '@/services/crm'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

interface CRMContextType {
  leads: Lead[]
  isLoading: boolean
  error: string | null
  loadData: () => Promise<void>
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedSources: SourceId[]
  toggleSource: (source: SourceId) => void
  clearFilters: () => void
  addLead: (lead: Partial<Lead> & { notes?: string }) => Promise<void>
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>
  moveLead: (id: string, newStage: StageId) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  filteredLeads: Lead[]
}

const CRMContext = createContext<CRMContextType | undefined>(undefined)

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSources, setSelectedSources] = useState<SourceId[]>([])

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await getClientes()
      setLeads(data)
    } catch (err: any) {
      if (err?.isAbort) return // ignore aborted requests
      setError('Erro ao conectar ao banco de dados. Verifique sua conexão e tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime(
    'clientes',
    () => {
      loadData()
    },
    isAuthenticated,
  )

  const toggleSource = useCallback((source: SourceId) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    )
  }, [])

  const addLead = useCallback(async (leadData: Partial<Lead> & { notes?: string }) => {
    try {
      await createCliente(leadData)
      toast({
        title: 'Sucesso',
        description: 'Cliente criado com sucesso',
      })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o cliente. Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
      throw err
    }
  }, [])

  const updateLead = useCallback(async (id: string, data: Partial<Lead>) => {
    try {
      await updateCliente(id, data)
      toast({
        title: 'Cliente atualizado',
        description: `As informações foram salvas com sucesso.`,
      })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o cliente.',
        variant: 'destructive',
      })
      throw err
    }
  }, [])

  const moveLead = useCallback(
    async (id: string, newStage: StageId) => {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estagio_pipeline: newStage } : l)))
      try {
        await moveCliente(id, newStage)
      } catch (err) {
        toast({
          title: 'Erro',
          description: 'Não foi possível mover o cliente.',
          variant: 'destructive',
        })
        loadData()
      }
    },
    [loadData],
  )

  const deleteLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    try {
      await deleteCliente(id)
      toast({ title: 'Cliente excluído' })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o cliente.',
        variant: 'destructive',
      })
      loadData()
    }
  }, [loadData])

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.empresa?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSource =
      selectedSources.length === 0 || selectedSources.includes(lead.fonte_contato)
    return matchesSearch && matchesSource
  })

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedSources([])
  }, [])

  const value = {
    leads,
    isLoading,
    error,
    loadData,
    searchQuery,
    setSearchQuery,
    selectedSources,
    toggleSource,
    clearFilters,
    addLead,
    updateLead,
    moveLead,
    deleteLead,
    filteredLeads,
  }

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>
}

export function useCRM() {
  const context = useContext(CRMContext)
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider')
  }
  return context
}
