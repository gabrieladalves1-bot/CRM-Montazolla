import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'
import { Header } from './header'

export default function Layout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <Header />
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen pt-14 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
