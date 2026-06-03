import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/Agenda'
import Documentos from './pages/Documentos'
import Chat from './pages/Chat'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { CRMProvider } from './hooks/use-crm'
import { AuthProvider } from './hooks/use-auth'
import GoogleCalendarCallback from './pages/GoogleCalendarCallback'
import PublicSchedule from './pages/PublicSchedule'
import './styles/icon-buttons.css'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <CRMProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/funil" element={<Index />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/chat" element={<Chat />} />
            </Route>
            <Route path="/callback" element={<GoogleCalendarCallback />} />
            <Route path="/agendar" element={<PublicSchedule />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </CRMProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
