import { Link, useLocation } from 'react-router-dom'
import { Button } from './ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/auth'

/**
 * Public Navbar component for landing, login, and signup pages
 */
export default function PublicNavbar() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Clickable to home */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary overflow-hidden shadow-md">
              <img
                src="/logo.png"
                alt="WorkZen Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-xl font-bold">WorkZen</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/login"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/login') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Login
            </Link>
            {isAuthenticated ? (
              <Button asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="default">
                <Link to="/register">Sign Up</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-4">
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                isActive('/login') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Login
            </Link>
            {isAuthenticated ? (
              <div className="px-4">
                <Button asChild className="w-full">
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="px-4">
                <Button asChild variant="default" className="w-full">
                  <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

