import { SidebarTrigger } from '@/components/ui/sidebar'
import logo from '@/assets/favicon-fc57d.png'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 border-b bg-[#0b1120] z-50 shrink-0">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-white hover:text-white/80" />
        <div className="flex items-center gap-2">
          <img src={logo} alt="Montazolla" className="h-8 w-8 object-contain" />
        </div>
      </div>
    </header>
  )
}
