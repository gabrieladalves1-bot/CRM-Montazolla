import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, KanbanSquare, Calendar, FileText, MessageCircle } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const location = useLocation()
  const { setOpen, isMobile } = useSidebar()

  useEffect(() => {
    if (!isMobile) {
      setOpen(false)
    }
  }, [isMobile, setOpen])

  return (
    <Sidebar collapsible="icon" className="md:top-14 md:h-[calc(100svh-3.5rem)]">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/'}>
                  <Link to="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/funil'}>
                  <Link to="/funil">
                    <KanbanSquare className="h-4 w-4" />
                    <span>Funil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/agenda'}>
                  <Link to="/agenda">
                    <Calendar className="h-4 w-4" />
                    <span>Agenda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/documentos'}>
                  <Link to="/documentos">
                    <FileText className="h-4 w-4" />
                    <span>Documentos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/chat'}>
                  <Link to="/chat">
                    <MessageCircle className="h-4 w-4" />
                    <span>Chat (IA)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
