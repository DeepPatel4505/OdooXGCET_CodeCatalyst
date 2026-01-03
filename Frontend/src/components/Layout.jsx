import { Outlet } from 'react-router-dom'
import LeftNav from './LeftNav'
import Topbar from './Topbar'

/**
 * Layout component - Main layout wrapper with sidebar and topbar
 */
export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <LeftNav />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 relative" style={{ zIndex: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

