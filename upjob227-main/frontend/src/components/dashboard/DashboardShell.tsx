import React, { useEffect, useRef, useState, useCallback } from 'react'
import { LogOut, Menu, MessageCircle, Send, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import LogoRga from '../../image/LOGO-RGA-B.png'

interface MenuItem {
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
  children?: { label: string; onClick?: () => void }[]
}

export interface ThemeTokens {
  accent: string
  accentSoft: string
  background: string
  surface: string
  surfaceMuted: string
  textPrimary: string
  textMuted: string
  menuFrom: string
  menuTo: string
  menuText: string
  sectionFrom: string
  sectionTo: string
  border: string
  cardShadow: string
  mode: 'light' | 'dark'
}

interface DashboardShellProps {
  title: string
  subtitle: string
  roleLabel: string
  menuItems: MenuItem[]
  bottomMenuItems?: MenuItem[]
  menuDescription?: { title: string; description: string }
  actions?: React.ReactNode
  onLogout?: () => void
  onProfileClick?: () => void
  children: React.ReactNode
  theme?: ThemeTokens
}

type CopilotMessage = {
  id: number
  sender: 'user' | 'assistant'
  text: string
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  title,
  subtitle,
  roleLabel,
  menuItems,
  bottomMenuItems,
  menuDescription,
  actions,
  onLogout,
  onProfileClick,
  children,
  theme,
}) => {
  const [miniChatOpen, setMiniChatOpen] = useState(false)
  const [miniChatMessages, setMiniChatMessages] = useState<CopilotMessage[]>([
    {
      id: 1,
      sender: 'assistant',
      text: 'I am the Copilot who can surface insights from Overview, Campaign, SEO, E-commerce, and CRM in seconds—ask me anything.',
    },
  ])
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [miniChatInput, setMiniChatInput] = useState('')
  const [miniChatTyping, setMiniChatTyping] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const miniChatScrollRef = useRef<HTMLDivElement | null>(null)
  
  // Draggable FAB state
  const [isDragging, setIsDragging] = useState(false)
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const fabRef = useRef<HTMLDivElement>(null)
  const { user, loading } = useCurrentUser()
  const displayName = user?.firstName || user?.email || 'Guest'
  const displayEmail = user?.email || '—'
  const displayTitle = user?.title || '—'
  const displayTeam = user?.team || '—'
  const displayLocation = user?.location || '—'
  const displayLastLogin = user?.lastLogin || '—'

  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null)

  useEffect(() => {
    try {
      const savedAvatar = window.localStorage.getItem('rga_profile_avatar')
      if (savedAvatar) {
        setAvatarOverride(savedAvatar)
      }
    } catch {
      // ignore
    }
  }, [])

  const resolvedAvatarUrl = avatarOverride || user?.avatarUrl || null

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null
      if (!dataUrl) return
      setAvatarOverride(dataUrl)
      try {
        window.localStorage.setItem('rga_profile_avatar', dataUrl)
      } catch {
        // ignore
      }
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (miniChatScrollRef.current) {
      miniChatScrollRef.current.scrollTop = miniChatScrollRef.current.scrollHeight
    }
  }, [miniChatMessages, miniChatTyping])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [mobileMenuOpen])

  // Apply theme tokens to CSS variables so index.css themed classes can react
  useEffect(() => {
    if (!theme) return
    const root = document.documentElement
    root.style.setProperty('--theme-background', theme.background)
    root.style.setProperty('--theme-surface', theme.surface)
    root.style.setProperty('--surface-muted', theme.surfaceMuted)
    root.style.setProperty('--theme-text', theme.textPrimary)
    root.style.setProperty('--theme-muted', theme.textMuted)
    root.style.setProperty('--menu-from', theme.menuFrom)
    root.style.setProperty('--menu-to', theme.menuTo)
    root.style.setProperty('--menu-text', theme.menuText)
    root.style.setProperty('--section-from', theme.sectionFrom)
    root.style.setProperty('--section-to', theme.sectionTo)
    root.style.setProperty('--theme-section-from', theme.sectionFrom)
    root.style.setProperty('--theme-section-to', theme.sectionTo)
    root.style.setProperty('--theme-border', theme.border)
    root.style.setProperty('--theme-card-shadow', theme.cardShadow)
    root.style.setProperty('--accent-color', theme.accent)
  }, [theme])

  // Draggable FAB handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    // Store the mouse position relative to the FAB's current position
    const rect = fabRef.current?.getBoundingClientRect()
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !fabRef.current) return
    
    // Calculate new position based on mouse position and drag offset
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    // Get FAB dimensions for precise boundary calculation
    const fabWidth = 280 // approximate FAB width (button + text)
    const fabHeight = 60 // approximate FAB height
    
    // Calculate viewport boundaries
    const minX = 10 // 10px padding from left
    const minY = 10 // 10px padding from top
    const maxX = window.innerWidth - fabWidth - 10 // 10px padding from right
    const maxY = window.innerHeight - fabHeight - 10 // 10px padding from bottom
    
    // Keep FAB within viewport bounds
    const boundedX = Math.max(minX, Math.min(newX, maxX))
    const boundedY = Math.max(minY, Math.min(newY, maxY))
    
    // Calculate the transform values relative to the original bottom-right position
    const originalRight = 32 // 2rem = 32px
    const originalBottom = 32 // 2rem = 32px
    
    setFabPosition({ 
      x: boundedX - (window.innerWidth - originalRight - fabWidth), 
      y: boundedY - (window.innerHeight - originalBottom - fabHeight)
    })
  }, [dragStart, isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [handleMouseMove, handleMouseUp, isDragging])

  const clearChatHistory = () => {
    setMiniChatMessages([
      {
        id: 1,
        sender: 'assistant',
        text: 'I am the Copilot who can surface insights from Overview, Campaign, SEO, E-commerce, and CRM in seconds—ask me anything.',
      },
    ])
    setMiniChatInput('')
  }

  const buildCopilotResponse = (prompt: string) => {
    const normalized = prompt.toLowerCase()
    if (normalized.includes('overview')) {
      return 'The Overview Dashboard surfaces real-time KPIs, hero cards, and trend charts the leadership team monitors each day.'
    }
    if (normalized.includes('campaign')) {
      return 'Campaign Performance highlights current campaign status, conversion funnels, and the channels driving the strongest ROI.'
    }
    if (normalized.includes('seo') || normalized.includes('web')) {
      return 'SEO & Web Analytics reveals organic performance, traffic sources, and search-driven conversions in detail.'
    }
    if (normalized.includes('commerce') || normalized.includes('product') || normalized.includes('video')) {
      return 'E-commerce Insights combines product video stats, creative cards, revenue trends, and conversion funnels in one view.'
    }
    if (normalized.includes('crm') || normalized.includes('lead')) {
      return 'CRM & Leads surfaces pipeline health, lead quality, and sales activities so you know which stage to focus on next.'
    }
    return 'I can describe any dashboard section or call out KPIs worth watching—drop your question and I will guide you.'
  }

  const handleMiniChatSend = () => {
    const trimmed = miniChatInput.trim()
    if (!trimmed) return
    const userMessage: CopilotMessage = { id: Date.now(), sender: 'user', text: trimmed }
    setMiniChatMessages((prev) => [...prev, userMessage])
    setMiniChatInput('')
    setMiniChatTyping(true)
    setTimeout(() => {
      const reply: CopilotMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: buildCopilotResponse(trimmed),
      }
      setMiniChatMessages((prev) => [...prev, reply])
      setMiniChatTyping(false)
    }, 700)
  }

  const handleMiniChatKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleMiniChatSend()
    }
  }

  const modeClass =
    theme?.mode === 'dark'
      ? 'theme-dark'
      : 'theme-light'

  const isDark = theme?.mode === 'dark'

  const sidebarContent = (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <img
            src={LogoRga}
            alt="RGA Logo"
            className="h-16 w-auto drop-shadow-[0_0_22px_rgba(249,115,22,0.95)]"
          />
        </div>
      </div>

      <div
        className="rounded-2xl p-5 space-y-3 shadow-inner border"
        style={{
          backgroundColor: theme?.menuFrom,
          borderColor: 'var(--menu-text)',
        }}
      >
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--menu-text)' }}>
          Profile
        </p>
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="relative h-12 w-12 rounded-2xl overflow-hidden bg-white/10 cursor-pointer"
            onClick={() => {
              if (onProfileClick) {
                onProfileClick()
              } else {
                avatarInputRef.current?.click()
              }
              setMobileMenuOpen(false)
            }}
            title="Change profile photo"
          >
            {resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-lg font-bold">{displayName.charAt(0)}</div>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </button>
          <div className="flex flex-col justify-center mt-1">
            <p className="text-base font-semibold leading-none mb-2" style={{ color: 'var(--menu-text)' }}>
              {loading ? 'Loading…' : displayName}
            </p>
            <p className="truncate leading-none mt-0.5" style={{ fontSize: '12px', color: 'var(--menu-text)' }}>
              {displayEmail}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col">
        {(() => {
          const renderMenu = (items: MenuItem[]) => (
            <div className="space-y-2">
              {items.map((item) => {
                const hasChildren = !!item.children?.length
                const expanded = hasChildren && openDropdown === item.label
                const handleClick = () => {
                  item.onClick?.()
                  if (hasChildren) {
                    setOpenDropdown((prev) => (prev === item.label ? null : item.label))
                  } else {
                    setOpenDropdown(null)
                    setMobileMenuOpen(false)
                  }
                }
                return (
                  <div key={item.label} className="space-y-2 relative">
                    <button
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-left text-[13px] font-semibold tracking-wide',
                        item.active ? 'border shadow-sm bg-white/90' : 'border border-transparent bg-transparent hover:bg-white/25',
                      )}
                      style={
                        item.active
                          ? {
                              color: 'var(--menu-text)',
                              borderColor: 'var(--menu-text)',
                            }
                          : {
                              color: 'var(--menu-text)',
                              borderColor: 'transparent',
                            }
                      }
                      onClick={handleClick}
                    >
                      <span className="flex items-center gap-3">
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </span>
                      {hasChildren && (
                        <span className="text-sm" style={{ color: 'var(--menu-text)' }}>
                          {expanded ? '-' : '+'}
                        </span>
                      )}
                    </button>
                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-300',
                        expanded ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2',
                      )}
                    >
                      {hasChildren && (
                        <div
                          className="mt-2 rounded-2xl px-5 py-4 space-y-4 border max-h-72 overflow-y-auto pr-2"
                          style={{
                            backgroundColor: theme?.accentSoft ?? 'rgba(255,255,255,0.58)',
                            borderColor: 'var(--menu-text)',
                          }}
                        >
                          {item.children?.map((child) => (
                            <button
                              key={child.label}
                              className={cn(
                                'w-full text-left text-[13px] font-medium transition rounded-lg cursor-pointer hover:translate-x-0.5 py-1',
                                isDark ? 'hover:bg-white/20' : 'hover:bg-white/30',
                              )}
                              style={{ color: 'var(--menu-text)' }}
                              onClick={(event) => {
                                event.stopPropagation()
                                child.onClick?.()
                                setMobileMenuOpen(false)
                              }}
                            >
                              {child.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )

          return renderMenu(menuItems)
        })()}

        {menuDescription && (
          <div
            className="mt-4 rounded-2xl bg-gradient-to-br p-4 space-y-1 text-sm shadow-inner"
            style={{
              backgroundImage:
                theme?.menuFrom && theme?.menuTo ? `linear-gradient(135deg, ${theme.menuFrom}, ${theme.menuTo})` : undefined,
              borderColor: 'var(--menu-text)',
              borderWidth: 1,
              borderStyle: 'solid',
              color: 'var(--menu-text)',
            }}
          >
            <p className="text-xs uppercase tracking-[0.3em]">{menuDescription.title}</p>
            <p className="text-[13px] leading-relaxed">{menuDescription.description}</p>
          </div>
        )}

        {bottomMenuItems?.length ? (
          <div className="mt-4">
            {(() => {
              const renderMenu = (items: MenuItem[]) => (
                <div className="space-y-2">
                  {items.map((item) => {
                    const hasChildren = !!item.children?.length
                    const expanded = hasChildren && openDropdown === item.label
                    const handleClick = () => {
                      item.onClick?.()
                      if (hasChildren) {
                        setOpenDropdown((prev) => (prev === item.label ? null : item.label))
                      } else {
                        setOpenDropdown(null)
                        setMobileMenuOpen(false)
                      }
                    }
                    return (
                      <div key={item.label} className="space-y-2 relative">
                        <button
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-left text-[13px] font-semibold tracking-wide',
                            item.active ? 'border shadow-sm bg-white/90' : 'border border-transparent bg-transparent hover:bg-white/25',
                          )}
                          style={
                            item.active
                              ? {
                                  color: 'var(--menu-text)',
                                  borderColor: 'var(--menu-text)',
                                }
                              : {
                                  color: 'var(--menu-text)',
                                  borderColor: 'transparent',
                                }
                          }
                          onClick={handleClick}
                        >
                          <span className="flex items-center gap-3">
                            <span className="shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </span>
                          {hasChildren && (
                            <span className="text-sm" style={{ color: 'var(--menu-text)' }}>
                              {expanded ? '-' : '+'}
                            </span>
                          )}
                        </button>
                        <div
                          className={cn(
                            'overflow-hidden transition-all duration-300',
                            expanded ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2',
                          )}
                        >
                          {hasChildren && (
                            <div
                              className="mt-2 rounded-2xl px-5 py-4 space-y-4 border max-h-72 overflow-y-auto pr-2"
                              style={{
                                backgroundColor: theme?.accentSoft ?? 'rgba(255,255,255,0.58)',
                                borderColor: 'var(--menu-text)',
                              }}
                            >
                              {item.children?.map((child) => (
                                <button
                                  key={child.label}
                                  className={cn(
                                    'w-full text-left text-[13px] font-medium transition rounded-lg cursor-pointer hover:translate-x-0.5 py-1',
                                    isDark ? 'hover:bg-white/20' : 'hover:bg-white/30',
                                  )}
                                  style={{ color: 'var(--menu-text)' }}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    child.onClick?.()
                                    setMobileMenuOpen(false)
                                  }}
                                >
                                  {child.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )

              return renderMenu(bottomMenuItems)
            })()}
          </div>
        ) : null}

        <button
          className="mt-6 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[16px] font-semibold tracking-wide transition"
          style={{ color: 'var(--menu-text)' }}
          onClick={() => {
            onLogout?.()
            setMobileMenuOpen(false)
          }}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </nav>
    </>
  )

  return (
    <div
      className={cn('min-h-screen dashboard-theme flex', modeClass)}
      style={{ backgroundColor: theme?.background }}
    >
      <div className={cn('fixed inset-0 z-40 lg:hidden', mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity',
            mobileMenuOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          className={cn(
            'dashboard-sidebar absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-gradient-to-b text-white px-3 py-4 space-y-6 overflow-y-auto transition-transform duration-300',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{
            backgroundImage:
              theme?.menuFrom && theme?.menuTo ? `linear-gradient(to bottom, ${theme.menuFrom}, ${theme.menuTo})` : undefined,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold" style={{ color: 'var(--menu-text)' }}>
              Menu
            </div>
            <button
              type="button"
              className="rounded-xl p-2 hover:bg-white/10"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" style={{ color: 'var(--menu-text)' }} />
            </button>
          </div>
          {sidebarContent}
        </aside>
      </div>

      <aside
        className="dashboard-sidebar hidden lg:flex flex-col w-[280px] min-w-[260px] bg-gradient-to-b text-white px-3 py-4 space-y-6 sticky top-0 h-screen overflow-y-auto"
        style={{
          backgroundImage:
            theme?.menuFrom && theme?.menuTo
              ? `linear-gradient(to bottom, ${theme.menuFrom}, ${theme.menuTo})`
              : undefined,
        }}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 w-full p-6 lg:p-10 space-y-8 max-w-full lg:max-w-[calc(100vw-280px)]">
        <div className="sticky top-0 z-30">
          <div
            className="backdrop-blur border-b border-orange-100/60 shadow-sm -mx-6 lg:-mx-10 px-6 lg:px-10 py-4"
            style={{ backgroundColor: theme?.surface ?? '#fdf6f0' }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-500 tracking-[0.3em]">{roleLabel}</p>
                <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                <p className="text-base text-gray-500 max-w-2xl">{subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="lg:hidden inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-3 text-gray-700 shadow-sm hover:shadow-md transition"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                {actions}
                
              </div>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}

export default DashboardShell
