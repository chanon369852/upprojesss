import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Facebook, MessageCircle, Music, RefreshCw, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Button } from './ui/button'
import { IntegrationNotification, Integration } from '../types/api'
import {
  applyPromoCode,
  confirmStripeSetupIntent,
  createStripeSetupIntent,
  getIntegrations,
  getUpgradeStatus,
  requestAdminFullUpgrade,
  syncIntegration,
  testIntegration,
  updateIntegration,
} from '../services/api'
import { useIntegrationNotifications } from '../hooks/useIntegrationNotifications'
import { getStoredRole, hasPermission, PERMISSIONS } from '../lib/rbac'
import { useCurrentUser } from '../hooks/useCurrentUser'

interface PlatformConfig {
  id: string
  label: string
  provider: string
  icon: React.ReactNode
  color: string
  description: string
}

const API_SETUP_PROVIDER_KEY = 'api_setup_provider'

// FLOW START: Checklist Page (EN)
// จุดเริ่มต้น: หน้า Checklist (TH)

const REQUIRED_PLATFORMS: PlatformConfig[] = [
  {
    id: 'googleads',
    label: 'Google Ads',
    provider: 'googleads',
    icon: <img src="https://cdn.simpleicons.org/googleads/FFFFFF" className="h-6 w-6" alt="Google Ads" />,
    color: 'bg-red-500',
    description: 'Sync campaigns and conversion data from Google Ads.',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    provider: 'facebook',
    icon: <img src="https://cdn.simpleicons.org/facebook/FFFFFF" className="h-6 w-6" alt="Facebook" />,
    color: 'bg-blue-600',
    description: 'Connect Meta Ads for real-time performance.',
  },
  {
    id: 'line',
    label: 'LINE OA',
    provider: 'line',
    icon: <img src="https://cdn.simpleicons.org/line/FFFFFF" className="h-6 w-6" alt="LINE" />,
    color: 'bg-green-500',
    description: 'Pull CRM and messaging KPIs from LINE OA.',
  },
  {
    id: 'tiktok',
    label: 'TikTok Ads',
    provider: 'tiktok',
    icon: <img src="https://cdn.simpleicons.org/tiktok/FFFFFF" className="h-6 w-6" alt="TikTok" />,
    color: 'bg-zinc-900',
    description: 'Monitor short-form video campaigns from TikTok.',
  },
]

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '')

const StripeSetupForm: React.FC<{
  disabled?: boolean
  onSuccess: (setupIntentId: string) => void
}> = ({ disabled, onSuccess }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const submit = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    setLocalError(null)

    const result = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })

    if (result.error) {
      setLocalError(result.error.message || 'Payment setup failed')
      setSubmitting(false)
      return
    }

    const setupIntentId = result.setupIntent?.id
    if (!setupIntentId) {
      setLocalError('Missing setup intent')
      setSubmitting(false)
      return
    }

    onSuccess(setupIntentId)
    setSubmitting(false)
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <PaymentElement />
      </div>
      {localError ? <p className="text-xs text-red-300">{localError}</p> : null}
      <Button
        variant="outline"
        size="sm"
        className="border-white/25 bg-white/5 text-white/90 hover:bg-white/10"
        onClick={submit}
        disabled={disabled || !stripe || !elements || submitting}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save card
      </Button>
    </div>
  )
}

const Checklist: React.FC = () => {
  const navigate = useNavigate()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionTarget, setActionTarget] = useState<string | null>(null)
  const [verifyStatus, setVerifyStatus] = useState<
    Record<
      string,
      {
        state: 'unknown' | 'verified' | 'failed'
        message?: string
        testedAt?: string
      }
    >
  >({})
  const { notifications, loading: loadingNotifications, error: notificationError, refetch } = useIntegrationNotifications('open')
  const [platformAlert, setPlatformAlert] = useState<{ title: string; description: string; timestamp: string } | null>(null)

  const { user: currentUser, loading: loadingCurrentUser } = useCurrentUser()

  const [selectedPlatform, setSelectedPlatform] = useState<{
    id: string
    label: string
    provider: string
    status: 'connected' | 'disconnected'
  } | null>(null)

  const [upgradeStatus, setUpgradeStatus] = useState<{
    role?: string
    paymentMethod: { linked: boolean; brand: string | null; last4: string | null; linkedAt: string | null }
    promo: { code: string | null; appliedAt: string | null }
    trial?: {
      startedAt: string | null
      expiresAt: string | null
      active: boolean
      expired: boolean
      msRemaining: number | null
    } | null
    pending?: {
      integrationSetups: number
      jsonImports: number
    }
    canRequestUpgrade: boolean
    note: string | null
  } | null>(null)
  const [promoDraft, setPromoDraft] = useState('')

  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactLineId, setContactLineId] = useState('')
  const [contactNote, setContactNote] = useState('')

  const [modalStep, setModalStep] = useState<'pricing' | 'promo' | 'payment' | 'pending' | 'request'>('pricing')
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [loadingStripe, setLoadingStripe] = useState(false)

  const role = (currentUser?.role as any) || getStoredRole()
  const canManageIntegrations = loadingCurrentUser ? false : hasPermission(role, PERMISSIONS.manage_integrations)

  const hasContactName = Boolean(contactName.trim())
  const hasContactChannel = Boolean(contactPhone.trim() || contactEmail.trim() || contactLineId.trim())
  const canSubmitUpgradeRequest = Boolean(upgradeStatus?.canRequestUpgrade) && hasContactName && hasContactChannel

  const loadUpgradeStatus = useCallback(async () => {
    try {
      const s = await getUpgradeStatus()
      setUpgradeStatus(s)
    } catch {
      setUpgradeStatus(null)
    }
  }, [])

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getIntegrations()
      setIntegrations(data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load integration status from the API')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIntegrations()
    refetch()
    loadUpgradeStatus()
  }, [loadIntegrations, refetch, loadUpgradeStatus])

  useEffect(() => {
    const run = async () => {
      if (!canManageIntegrations) return
      if (!integrations.length) return
      const active = integrations.filter((i) => i && i.id && i.isActive)
      if (!active.length) return

      await Promise.all(
        active.map(async (integration) => {
          const provider = String(integration.provider || '').toLowerCase()
          if (!provider) return
          try {
            setVerifyStatus((prev) => ({ ...prev, [provider]: { state: 'unknown', message: 'Verifying…' } }))
            const result = await testIntegration(integration.id)
            const ok = Boolean(result?.ok)
            setVerifyStatus((prev) => ({
              ...prev,
              [provider]: {
                state: ok ? 'verified' : 'failed',
                message: String(result?.message || (ok ? 'Verified' : 'Not verified')),
                testedAt: new Date().toLocaleString(),
              },
            }))
          } catch (e: any) {
            setVerifyStatus((prev) => ({
              ...prev,
              [provider]: {
                state: 'failed',
                message: String(e?.response?.data?.message || e?.message || 'Verification failed'),
                testedAt: new Date().toLocaleString(),
              },
            }))
          }
        }),
      )
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageIntegrations, integrations])

  useEffect(() => {
    loadUpgradeStatus()
  }, [loadUpgradeStatus])

  useEffect(() => {
    const run = async () => {
      if (!selectedPlatform) return
      if (modalStep !== 'payment') return
      if (stripeClientSecret) return

      try {
        setLoadingStripe(true)
        setError(null)
        const data = await createStripeSetupIntent()
        setStripeClientSecret(data.clientSecret)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Unable to initialize Stripe')
      } finally {
        setLoadingStripe(false)
      }
    }

    run()
  }, [modalStep, selectedPlatform, stripeClientSecret])

  const integrationMap = useMemo(() => {
    return integrations.reduce<Record<string, Integration>>((acc, integration) => {
      acc[integration.provider] = integration
      return acc
    }, {})
  }, [integrations])

  const steps = useMemo(() => {
    return REQUIRED_PLATFORMS.map((platform) => {
      const integration = integrationMap[platform.provider]
      const isConnected = Boolean(integration?.isActive)
      return {
        ...platform,
        status: isConnected ? 'connected' : 'disconnected',
        integration,
      }
    })
  }, [integrationMap])

  const completedSteps = steps.filter((step) => step.status === 'connected').length
  const completionPercent = useMemo(() => {
    if (!steps.length) return 0
    return Math.round((completedSteps / steps.length) * 100)
  }, [completedSteps, steps.length])

  useEffect(() => {
    if (!steps.length) return
    if (completedSteps !== steps.length) return
    try {
      localStorage.setItem('hasCompletedChecklist', 'true')
    } catch {
      // ignore
    }
  }, [completedSteps, steps.length])

  const handleToggle = async (provider: string) => {
    const integration = integrationMap[provider]
    if (!integration) {
      setError('Integration record not found. Please configure it first via API Setup.')
      return
    }

    try {
      setActionTarget(provider)
      await updateIntegration(integration.id, { isActive: !integration.isActive })
      await loadIntegrations()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to update integration status')
    } finally {
      setActionTarget(null)
    }
  }

  const closePlatformModal = () => setSelectedPlatform(null)

  const handleConfigure = (provider: string, label: string) => {
    const timestamp = new Date().toLocaleString()
    try {
      window.localStorage.setItem(API_SETUP_PROVIDER_KEY, provider)
    } catch {
      // ignore
    }
    setPlatformAlert({
      title: `${label} setup`,
      description: 'Redirecting you to API Setup…',
      timestamp,
    })
    navigate('/api-setup')
  }

  const handleTest = async (provider: string, label: string) => {
    const integration = integrationMap[provider]
    if (!integration) {
      setError('Integration record not found. Please configure it first via API Setup.')
      return
    }

    try {
      setActionTarget(`test:${provider}`)
      setError(null)
      await testIntegration(integration.id)
      setPlatformAlert({
        title: `${label} test successful`,
        description: 'Credentials appear to be configured.',
        timestamp: new Date().toLocaleString(),
      })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Integration test failed')
    } finally {
      setActionTarget(null)
    }
  }

  const handleVerify = async (provider: string, label: string) => {
    const integration = integrationMap[provider]
    if (!integration) {
      setError('Integration record not found. Please configure it first via API Setup.')
      return
    }

    try {
      setActionTarget(`verify:${provider}`)
      setError(null)
      setVerifyStatus((prev) => ({ ...prev, [provider]: { state: 'unknown', message: 'Verifying…' } }))
      const result = await testIntegration(integration.id)
      const ok = Boolean((result as any)?.ok)
      setVerifyStatus((prev) => ({
        ...prev,
        [provider]: {
          state: ok ? 'verified' : 'failed',
          message: String((result as any)?.message || (ok ? 'Verified' : 'Not verified')),
          testedAt: new Date().toLocaleString(),
        },
      }))
      if (ok) {
        setPlatformAlert({
          title: `${label} verified`,
          description: 'Connection verified successfully.',
          timestamp: new Date().toLocaleString(),
        })
      }
    } catch (err: any) {
      const msg = String(err?.response?.data?.message || err?.message || 'Verification failed')
      setVerifyStatus((prev) => ({
        ...prev,
        [provider]: { state: 'failed', message: msg, testedAt: new Date().toLocaleString() },
      }))
      setError(msg)
    } finally {
      setActionTarget(null)
    }
  }

  const handleSyncNow = async (provider: string, label: string) => {
    const integration = integrationMap[provider]
    if (!integration) {
      setError('Integration record not found. Please configure it first via API Setup.')
      return
    }

    try {
      setActionTarget(`sync:${provider}`)
      setError(null)
      await syncIntegration(integration.id)
      setPlatformAlert({
        title: `${label} sync started`,
        description: 'Sync completed (check last sync time / data in dashboard).',
        timestamp: new Date().toLocaleString(),
      })
      await loadIntegrations()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Sync failed')
    } finally {
      setActionTarget(null)
    }
  }

  const handleResetAll = async () => {
    if (!canManageIntegrations) {
      setError('ต้องอัปเกรดเป็น admin_full ก่อนจึงจะจัดการการเชื่อมต่อ API ได้')
      return
    }
    const activeIntegrations = integrations.filter((integration) => integration.isActive)
    if (!activeIntegrations.length) {
      return
    }

    try {
      setActionTarget('reset-all')
      await Promise.all(activeIntegrations.map((integration) => updateIntegration(integration.id, { isActive: false })))
      await loadIntegrations()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to reset integrations')
    } finally {
      setActionTarget(null)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('hasCompletedChecklist', 'true')
    navigate('/dashboard')
  }

  const handleUpgradeRequest = async () => {
    try {
      if (!canManageIntegrations && (!hasContactName || !hasContactChannel)) {
        setError('กรุณากรอก Name และช่องทางติดต่ออย่างน้อย 1 ช่อง (Phone/Email/LINE ID)')
        return
      }
      setActionTarget('upgrade-request')
      setError(null)

      const contact = {
        name: contactName.trim() || undefined,
        phone: contactPhone.trim() || undefined,
        email: contactEmail.trim() || undefined,
        lineId: contactLineId.trim() || undefined,
        note: contactNote.trim() || undefined,
      }

      const message = upgradeStatus?.promo?.code ? `promo:${upgradeStatus.promo.code}` : undefined

      await requestAdminFullUpgrade({
        ...(message ? { message } : {}),
        ...(Object.values(contact).some(Boolean) ? { contact } : {}),
      })
      setPlatformAlert({
        title: 'ส่งคำขออัปเกรดแล้ว',
        description: 'ระบบได้แจ้งไปยังผู้ดูแล (super_admin) เพื่ออนุมัติการอัปเกรดเป็น admin_full แล้ว',
        timestamp: new Date().toLocaleString(),
      })
      refetch()
      loadUpgradeStatus()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'ไม่สามารถส่งคำขออัปเกรดได้')
    } finally {
      setActionTarget(null)
    }
  }

  const handleBindCard = () => {
    setError(null)
    setStripeClientSecret(null)
    setModalStep('payment')
    if (!selectedPlatform) {
      setSelectedPlatform({ id: 'billing', label: 'Billing', provider: 'billing', status: 'disconnected' })
    }
  }

  const handleApplyPromo = async () => {
    const code = promoDraft.trim()
    if (!code) return
    try {
      setActionTarget('apply-promo')
      setError(null)
      await applyPromoCode({ code })
      await loadUpgradeStatus()
      setPromoDraft('')
      setPlatformAlert({
        title: 'ใช้โปรโมชั่นแล้ว',
        description: `Applied promo code: ${code}`,
        timestamp: new Date().toLocaleString(),
      })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'ไม่สามารถใช้โปรโมชั่นได้')
    } finally {
      setActionTarget(null)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-8 overflow-hidden bg-black">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-100"
          style={{ backgroundImage: "url('/image/galaxy-wallpaper-warm-colors.jpg')" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,190,92,0.25),_transparent_75%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(5,5,5,0.2),rgba(5,5,5,0.2))]" />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-10 top-6 h-64 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute inset-x-20 bottom-6 h-80 rounded-full bg-black/30 blur-[160px]" />
        
        {/* Combined Effects: Stars + Aurora + Glow (7 Points) */}
        <div className="absolute inset-0">
          {/* Aurora Effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-orange-500/5 to-purple-400/10 animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-400/5 to-orange-300/8 animate-pulse" style={{ animationDelay: '2s', animationDuration: '10s' }} />
          
          {/* 20 Glow Points - Expanded variety */}
          {/* Top Left: 3 points */}
          <div className="absolute top-20 left-32 h-32 w-32 rounded-full bg-orange-400/20 blur-[80px] animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
          <div className="absolute top-16 left-60 h-24 w-24 rounded-full bg-orange-600/18 blur-[60px] animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }} />
          <div className="absolute top-8 left-24 h-16 w-16 rounded-full bg-amber-500/22 blur-[40px] animate-pulse" style={{ animationDelay: '2.8s', animationDuration: '3.2s' }} />
          
          {/* Top Right: 3 points */}
          <div className="absolute top-32 right-24 h-28 w-28 rounded-full bg-amber-400/15 blur-[70px] animate-pulse" style={{ animationDelay: '2.5s', animationDuration: '4.5s' }} />
          <div className="absolute top-12 right-40 h-20 w-20 rounded-full bg-yellow-300/25 blur-[50px] animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '4s' }} />
          <div className="absolute top-48 right-16 h-18 w-18 rounded-full bg-orange-500/16 blur-[45px] animate-pulse" style={{ animationDelay: '3.2s', animationDuration: '3.8s' }} />
          
          {/* Bottom Left: 3 points */}
          <div className="absolute bottom-28 left-40 h-20 w-20 rounded-full bg-yellow-400/22 blur-[50px] animate-pulse" style={{ animationDelay: '1s', animationDuration: '3s' }} />
          <div className="absolute bottom-16 left-24 h-24 w-24 rounded-full bg-amber-600/14 blur-[65px] animate-pulse" style={{ animationDelay: '2.2s', animationDuration: '4.2s' }} />
          <div className="absolute bottom-40 left-60 h-16 w-16 rounded-full bg-orange-300/20 blur-[42px] animate-pulse" style={{ animationDelay: '3.6s', animationDuration: '3.4s' }} />
          
          {/* Bottom Right: 3 points */}
          <div className="absolute bottom-20 right-36 h-16 w-16 rounded-full bg-orange-500/25 blur-[40px] animate-pulse" style={{ animationDelay: '3s', animationDuration: '5s' }} />
          <div className="absolute bottom-32 right-20 h-22 w-22 rounded-full bg-yellow-500/18 blur-[55px] animate-pulse" style={{ animationDelay: '1.3s', animationDuration: '3.6s' }} />
          <div className="absolute bottom-8 right-28 h-18 w-18 rounded-full bg-amber-400/21 blur-[48px] animate-pulse" style={{ animationDelay: '2.7s', animationDuration: '4.1s' }} />
          
          {/* Center Area: 4 points */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-amber-300/12 blur-[100px] animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '5s' }} />
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 h-36 w-36 rounded-full bg-orange-400/16 blur-[90px] animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }} />
          <div className="absolute top-2/5 right-2/5 h-28 w-28 rounded-full bg-yellow-400/14 blur-[75px] animate-pulse" style={{ animationDelay: '1.8s', animationDuration: '4.3s' }} />
          <div className="absolute top-3/5 left-2/5 h-24 w-24 rounded-full bg-amber-500/17 blur-[68px] animate-pulse" style={{ animationDelay: '0.3s', animationDuration: '3.7s' }} />
          
          {/* Middle Edges: 4 points */}
          <div className="absolute top-1/4 left-8 h-20 w-20 rounded-full bg-orange-400/19 blur-[52px] animate-pulse" style={{ animationDelay: '2.4s', animationDuration: '4.6s' }} />
          <div className="absolute top-1/3 right-12 h-18 w-18 rounded-full bg-yellow-300/23 blur-[46px] animate-pulse" style={{ animationDelay: '1.6s', animationDuration: '3.9s' }} />
          <div className="absolute bottom-1/4 left-16 h-22 w-22 rounded-full bg-amber-400/15 blur-[58px] animate-pulse" style={{ animationDelay: '3.1s', animationDuration: '4.4s' }} />
          <div className="absolute bottom-1/3 right-8 h-20 w-20 rounded-full bg-orange-600/20 blur-[54px] animate-pulse" style={{ animationDelay: '0.7s', animationDuration: '4.8s' }} />
          
          {/* Twinkling Stars */}
          <div className="absolute top-10 left-20 h-1 w-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '0s', animationDuration: '2s' }} />
          <div className="absolute top-32 right-40 h-1 w-1 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
          <div className="absolute top-60 left-1/3 h-1 w-1 rounded-full bg-white/90 animate-pulse" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
          <div className="absolute bottom-40 right-20 h-1 w-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '2s' }} />
          <div className="absolute bottom-20 left-40 h-1 w-1 rounded-full bg-white/70 animate-pulse" style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
          <div className="absolute top-1/4 right-1/4 h-1 w-1 rounded-full bg-white/85 animate-pulse" style={{ animationDelay: '2.5s', animationDuration: '2.8s' }} />
          <div className="absolute top-1/2 left-1/4 h-1 w-1 rounded-full bg-white/95 animate-pulse" style={{ animationDelay: '3s', animationDuration: '2.2s' }} />
          <div className="absolute top-3/4 right-1/3 h-1 w-1 rounded-full bg-white/75 animate-pulse" style={{ animationDelay: '3.5s', animationDuration: '3.2s' }} />
          <div className="absolute top-16 left-60 h-1 w-1 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: '4s', animationDuration: '2.6s' }} />
          <div className="absolute bottom-32 right-60 h-1 w-1 rounded-full bg-white/90 animate-pulse" style={{ animationDelay: '4.5s', animationDuration: '2.4s' }} />
        </div>
      </div>
      <div className="relative w-full max-w-5xl rounded-[40px] border border-white/10 bg-black/55 p-10 shadow-[0_60px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm space-y-10">
        {!canManageIntegrations && selectedPlatform ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={closePlatformModal}
          >
            <div
              className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-5 text-white shadow-[0_40px_90px_rgba(0,0,0,0.65)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.0em] text-white/60">Platform</p>
                  <p className="text-lg font-semibold text-white">{selectedPlatform.label}</p>
                  <p className="text-xs text-white/60">Status: {selectedPlatform.status}</p>
                </div>
                <Button variant="outline" size="sm" className="border-white/20 bg-white/5 text-white/80 hover:bg-white/10" onClick={closePlatformModal}>
                  Close
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setModalStep('pricing')}
                  className={`rounded-full border px-3 py-1 text-xs ${modalStep === 'pricing' ? 'border-orange-400/60 bg-orange-500/10 text-orange-100' : 'border-white/15 text-white/70'}`}
                >
                  Pricing
                </button>
                <button
                  type="button"
                  onClick={() => setModalStep('promo')}
                  className={`rounded-full border px-3 py-1 text-xs ${modalStep === 'promo' ? 'border-orange-400/60 bg-orange-500/10 text-orange-100' : 'border-white/15 text-white/70'}`}
                >
                  Promo
                </button>
                <button
                  type="button"
                  onClick={() => setModalStep('payment')}
                  className={`rounded-full border px-3 py-1 text-xs ${modalStep === 'payment' ? 'border-orange-400/60 bg-orange-500/10 text-orange-100' : 'border-white/15 text-white/70'}`}
                >
                  Payment
                </button>
                <button
                  type="button"
                  onClick={() => setModalStep('pending')}
                  className={`rounded-full border px-3 py-1 text-xs ${modalStep === 'pending' ? 'border-orange-400/60 bg-orange-500/10 text-orange-100' : 'border-white/15 text-white/70'}`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setModalStep('request')}
                  className={`rounded-full border px-3 py-1 text-xs ${modalStep === 'request' ? 'border-orange-400/60 bg-orange-500/10 text-orange-100' : 'border-white/15 text-white/70'}`}
                >
                  Request
                </button>
              </div>

              {modalStep === 'payment' ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.0em] text-white/60">Payment</p>
                  <p className="text-sm text-white/80 mt-1">กรอกบัตรจริงผ่าน Stripe (Test mode ได้)</p>

                  {!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? (
                    <p className="mt-3 text-xs text-red-300">Missing REACT_APP_STRIPE_PUBLISHABLE_KEY</p>
                  ) : stripeClientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                      <StripeSetupForm
                        disabled={loadingStripe || actionTarget === 'bind-card'}
                        onSuccess={async (setupIntentId) => {
                          try {
                            setActionTarget('bind-card')
                            setError(null)
                            await confirmStripeSetupIntent({ setupIntentId })
                            await loadUpgradeStatus()
                            setPlatformAlert({
                              title: 'ผูกบัตรสำเร็จ',
                              description: 'บันทึกบัตรกับ Stripe แล้ว สามารถส่งคำขออัปเกรดได้',
                              timestamp: new Date().toLocaleString(),
                            })
                            setModalStep('pending')
                          } catch (err: any) {
                            setError(err?.response?.data?.message || 'Stripe confirm failed')
                          } finally {
                            setActionTarget(null)
                          }
                        }}
                      />
                    </Elements>
                  ) : (
                    <div className="mt-3 text-sm text-white/70">
                      {loadingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Preparing Stripe...'}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.0em] text-white/60">Billing</p>
                <p className="text-xs text-white/60 mt-2">
                  Card:{' '}
                  {upgradeStatus?.paymentMethod?.linked
                    ? `${upgradeStatus.paymentMethod.brand || 'CARD'} •••• ${upgradeStatus.paymentMethod.last4}`
                    : 'Not linked'}
                </p>
                {upgradeStatus?.paymentMethod?.linkedAt ? (
                  <p className="text-xs text-white/50">Linked at: {new Date(upgradeStatus.paymentMethod.linkedAt).toLocaleString()}</p>
                ) : null}
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/25 bg-white/5 text-white/90 hover:bg-white/10"
                    onClick={handleBindCard}
                    disabled={actionTarget === 'bind-card'}
                  >
                    {actionTarget === 'bind-card' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Bind credit card
                  </Button>
                </div>
              </div>

              {upgradeStatus?.trial ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.0em] text-white/60">Trial</p>
                  <p className="text-sm text-white/80 mt-1">
                    {upgradeStatus.trial.active
                      ? 'Trial is active'
                      : upgradeStatus.trial.expired
                        ? 'Trial expired'
                        : 'Trial status unavailable'}
                  </p>
                  {typeof upgradeStatus.trial.msRemaining === 'number' ? (
                    <p className="text-xs text-white/60 mt-1">
                      Remaining: {Math.ceil(upgradeStatus.trial.msRemaining / (60 * 1000))} minutes
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.0em] text-white/60">Promotion</p>
                <p className="text-sm text-white/80 mt-1">ใส่โค้ดโปรโมชัน (ถ้ามี) และระบบจะแสดงรายละเอียด</p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={promoDraft}
                    onChange={(e) => setPromoDraft(e.target.value)}
                    placeholder="Promo code"
                    className="h-9 w-full rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white placeholder:text-white/40"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/25 bg-white/5 text-white/90 hover:bg-white/10"
                    onClick={handleApplyPromo}
                    disabled={actionTarget === 'apply-promo' || !promoDraft.trim()}
                  >
                    {actionTarget === 'apply-promo' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Apply
                  </Button>
                </div>

                <div className="mt-3 text-xs text-white/70">
                  <p>
                    Current promo: {upgradeStatus?.promo?.code ? upgradeStatus.promo.code : 'None'}
                  </p>
                  {upgradeStatus?.promo?.appliedAt ? (
                    <p className="text-white/50">Applied at: {new Date(upgradeStatus.promo.appliedAt).toLocaleString()}</p>
                  ) : null}
                  {upgradeStatus?.note ? <p className="text-white/50">{upgradeStatus.note}</p> : null}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.0em] text-white/60">Data setup (pending)</p>
                <p className="text-sm text-white/80 mt-1">คุณสามารถกรอก API และอัปโหลด JSON ได้ก่อน (จะเป็นสถานะ pending จนกว่าจะอัปเกรดเป็น admin_full)</p>
                <p className="text-xs text-white/60 mt-2">
                  Pending API setups: {upgradeStatus?.pending?.integrationSetups ?? 0} · Pending JSON imports: {upgradeStatus?.pending?.jsonImports ?? 0}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/25 bg-white/5 text-white/90 hover:bg-white/10"
                    onClick={() => handleConfigure(selectedPlatform.provider, selectedPlatform.label)}
                  >
                    Open API Setup
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/25 bg-white/5 text-white/90 hover:bg-white/10"
                    onClick={() => navigate('/api-setup')}
                  >
                    Upload JSON
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 text-white">
            <p className="text-xs uppercase tracking-[0.0em] text-orange-300">Onboarding flow</p>
            <h1 className="text-4xl font-bold text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)]">Checklist</h1>
            <p className="text-base text-white/80 max-w-xl leading-relaxed">Link every data source to unlock the full real-time dashboard experience before entering the live RGA workspace.</p>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-orange-400/60 bg-gradient-to-br from-black/85 via-orange-950/40 to-orange-900/30 backdrop-blur-sm px-8 py-6 text-white shadow-[0_25px_50px_rgba(255,140,0,0.3)]">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute -top-10 -right-6 h-52 w-52 rounded-full bg-orange-500/30 blur-[90px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_70%)]" />
            </div>
            <div className="relative space-y-4">
              <p className="text-xs uppercase tracking-[0.0em] text-orange-200">Rise Group Asia</p>
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-200 text-2xl font-black tracking-tight text-black shadow-[0_0_35px_rgba(249,115,22,0.45)]">
                  RGA
                </div>
                <div>
                  <p className="text-xl font-semibold leading-snug text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.55)]">Intelligence Operations Suite</p>
                  <p className="text-xs tracking-[0.0em] text-white/80 uppercase">Mission Control Checklist</p>
                </div>
              </div>
              <div className="flex gap-3 text-xs font-medium text-white/80">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 ring-2 ring-orange-300/50 shadow-[0_0_6px_rgba(251,146,60,0.8)]" />Sync readiness</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 ring-2 ring-emerald-300/50 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />Security verified</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-white/90 to-white ring-2 ring-white/30 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />Ops escalation plan</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-orange-300/50 bg-gradient-to-br from-black/85 via-orange-950/40 to-orange-900/30 backdrop-blur-sm p-6 text-white shadow-[0_25px_50px_rgba(255,140,0,0.25)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.0em] text-white/60">Progress</p>
                <h2 className="text-2xl font-semibold text-white">Welcome to RGA Dashboard</h2>
                <p className="text-sm text-white/60">
                  You're {completedSteps} out of {steps.length} integrations online
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-orange-300">{completionPercent}%</p>
                <p className="text-xs uppercase tracking-[0.em] text-white/40">Complete</p>
              </div>
            </div>
            <div className="mt-6 h-4 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300 shadow-[0_0_12px_rgba(249,115,22,0.7)] transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-orange-300/50 bg-gradient-to-br from-black/85 via-orange-950/40 to-orange-900/30 backdrop-blur-sm p-6 text-white shadow-[0_25px_50px_rgba(255,140,0,0.25)]">
            {notificationError && (
              <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {notificationError}
              </div>
            )}
            {platformAlert && (
              <div className="mb-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-semibold text-white">{platformAlert.title}</p>
                    <p className="text-sm text-white/80">{platformAlert.description}</p>
                    <p className="text-xs text-white/50 mt-1">Updated {platformAlert.timestamp}</p>
                  </div>
                </div>
              </div>
            )}
            {!loadingNotifications && notifications.length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-orange-300">Alerts</p>
                    <h3 className="text-xl font-semibold text-white">Action required</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                    onClick={refetch}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh alerts
                  </Button>
                </div>

                <div className="space-y-3">
                  {notifications.map((alert: IntegrationNotification) => (
                    <div
                      key={alert.id}
                      className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-300" />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {alert.title}
                            {alert.integration?.name ? ` · ${alert.integration.name}` : ''}
                          </p>
                          {alert.reason && <p className="text-xs text-white/80">{alert.reason}</p>}
                          <p className="text-xs text-white/50">
                            {new Date(alert.createdAt).toLocaleString()} · {alert.platform.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      {alert.actionUrl && (
                        <Button
                          variant="outline"
                          className="w-full border-white/25 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                          onClick={() => window.open(alert.actionUrl!, '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" /> Go to setup
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.0em] text-white/50">Integrations</p>
<h3 className="text-xl font-bold text-white">Connect external APIs</h3>              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto gap-2 border-white/30 bg-white/5 text-white hover:bg-white/10 justify-center"
                  onClick={() => navigate('/integrations')}
                  disabled={!canManageIntegrations}
                >
                  Open workspace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto gap-2 border-white/30 bg-white/5 text-white hover:bg-white/10 justify-center"
                  onClick={loadIntegrations}
                  disabled={loading || actionTarget === 'reset-all'}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto gap-2 border-white/30 bg-white/5 text-white hover:bg-white/10 justify-center"
                  onClick={handleResetAll}
                  disabled={!canManageIntegrations || !integrations.some((integration) => integration.isActive) || actionTarget === 'reset-all'}
                >
                  {actionTarget === 'reset-all' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Reset all
                </Button>
                {!canManageIntegrations ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto gap-2 border-orange-400/60 bg-orange-500/10 text-orange-100 hover:bg-orange-500/15 justify-center"
                    onClick={handleUpgradeRequest}
                    disabled={actionTarget === 'upgrade-request'}
                  >
                    {actionTarget === 'upgrade-request' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Request upgrade (admin_full)
                  </Button>
                ) : null}
              </div>
            </div>

            {!canManageIntegrations ? (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.0em] text-white/60">Billing</p>
                    <p className="text-sm text-white/80">
                      ต้องผูกบัตรเครดิตก่อนจึงจะส่งคำขออัปเกรดเป็น admin_full ได้
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      Card: {upgradeStatus?.paymentMethod?.linked ? `${upgradeStatus.paymentMethod.brand || 'CARD'} •••• ${upgradeStatus.paymentMethod.last4}` : 'Not linked'}
                    </p>
                    <p className="text-xs text-white/60">
                      Promo: {upgradeStatus?.promo?.code ? upgradeStatus.promo.code : 'None'}
                    </p>
                    <p className="text-xs text-white/60">
                      Pending API setups: {upgradeStatus?.pending?.integrationSetups ?? 0} · Pending JSON imports: {upgradeStatus?.pending?.jsonImports ?? 0}
                    </p>
                    {upgradeStatus?.trial ? (
                      <p className="text-xs text-white/60">
                        Trial: {upgradeStatus.trial.active ? 'active' : upgradeStatus.trial.expired ? 'expired' : 'unknown'}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/25 text-white/90 hover:bg-white/10"
                      onClick={handleBindCard}
                      disabled={actionTarget === 'bind-card'}
                    >
                      {actionTarget === 'bind-card' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Bind credit card
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/25 text-white/90 hover:bg-white/10"
                      onClick={() => navigate('/api-setup')}
                    >
                      Open API Setup
                    </Button>
                    <div className="flex gap-2">
                      <input
                        value={promoDraft}
                        onChange={(e) => setPromoDraft(e.target.value)}
                        placeholder="Promo code"
                        className="h-9 w-full rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white placeholder:text-white/40"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/25 text-white/90 hover:bg-white/10"
                        onClick={handleApplyPromo}
                        disabled={actionTarget === 'apply-promo' || !promoDraft.trim()}
                      >
                        {actionTarget === 'apply-promo' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {!canManageIntegrations ? (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                <p className="text-xs uppercase tracking-[0.0em] text-white/60">Your info</p>
                <p className="text-sm text-white/80">กรอกข้อมูลของคุณเพื่อให้ super_admin ติดต่อกลับได้</p>
                <p className="text-xs text-white/60 mt-1">ต้องกรอก Name และช่องทางติดต่ออย่างน้อย 1 ช่อง (Phone/Email/LINE ID)</p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Name"
                    className="h-9 w-full rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white placeholder:text-white/40"
                  />
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Phone"
                    className="h-9 w-full rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white placeholder:text-white/40"
                  />
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email"
                    className="h-9 w-full rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white placeholder:text-white/40"
                  />
                  <input
                    value={contactLineId}
                    onChange={(e) => setContactLineId(e.target.value)}
                    placeholder="LINE ID"
                    className="h-9 w-full rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white placeholder:text-white/40"
                  />
                  <textarea
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    placeholder="Note"
                    className="md:col-span-2 min-h-[80px] w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                </div>
              </div>
            ) : null}

            {error && (
              <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12 text-white/60">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fetching integrations from the API...
              </div>
            ) : (
              <div className="space-y-0">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0b0b0b]/80 px-5 py-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        className={`${step.color} p-3 rounded-2xl shadow-lg shadow-black/40 ${!canManageIntegrations ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (canManageIntegrations) return
                          setSelectedPlatform({ id: step.id, label: step.label, provider: step.provider, status: step.status as any })
                        }}
                      >
                        {step.icon}
                      </button>
                      <div>
                        <p className="text-lg font-semibold text-white leading-tight">{step.label}</p>
                        <p className="text-sm text-white/70 leading-tight">{step.description}</p>
                        {step.integration?.lastSyncAt && (
                          <p className="text-xs text-white/40 leading-tight">
                            Last sync · {new Date(step.integration.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap w-full sm:w-auto min-w-[110px] border ${
                          step.status === 'connected'
                            ? 'border-emerald-400/30 text-emerald-200 bg-emerald-500/10'
                            : 'border-white/20 text-white/70'
                        }`}
                      >
                        {step.status === 'connected' ? 'Connected' : 'Disconnected'}
                      </span>

                      {canManageIntegrations && step.integration?.id ? (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium text-center whitespace-nowrap w-full sm:w-auto min-w-[120px] border ${
                            verifyStatus[String(step.provider || '').toLowerCase()]?.state === 'verified'
                              ? 'border-emerald-400/30 text-emerald-200 bg-emerald-500/10'
                              : verifyStatus[String(step.provider || '').toLowerCase()]?.state === 'failed'
                                ? 'border-rose-400/30 text-rose-200 bg-rose-500/10'
                                : 'border-white/15 text-white/60 bg-white/5'
                          }`}
                          title={verifyStatus[String(step.provider || '').toLowerCase()]?.message || undefined}
                        >
                          {verifyStatus[String(step.provider || '').toLowerCase()]?.state === 'verified'
                            ? 'Verified'
                            : verifyStatus[String(step.provider || '').toLowerCase()]?.state === 'failed'
                              ? 'Not verified'
                              : 'Not verified'}
                        </span>
                      ) : null}

                      <div className="flex flex-col gap-1 sm:flex-row">
                        {canManageIntegrations ? (
                          <>
                            <Button
                              variant="outline"
                              className={`min-w-[150px] border transition ${
                                step.status === 'connected'
                                  ? 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10'
                                  : 'border-orange-400/60 text-orange-200 hover:bg-orange-500/10'
                              }`}
                              onClick={() => handleToggle(step.provider)}
                              disabled={actionTarget === step.provider || actionTarget?.startsWith('reset')}
                            >
                              {actionTarget === step.provider ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : step.status === 'connected' ? (
                                'Disconnect'
                              ) : (
                                'Activate'
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              className="min-w-[150px] border border-orange-400/60 text-orange-200 hover:bg-orange-500/10"
                              onClick={() => handleConfigure(step.provider, step.label)}
                            >
                              {step.integration?.id ? 'Update setup' : 'Connect / Setup'}
                            </Button>

                            {step.integration?.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  className="w-full sm:min-w-[150px] border-white/25 bg-white/5 text-white/80 hover:bg-white/10"
                                  onClick={() => handleTest(step.provider, step.label)}
                                  disabled={
                                    actionTarget === step.provider ||
                                    actionTarget === `test:${step.provider}` ||
                                    actionTarget === `sync:${step.provider}` ||
                                    actionTarget === `verify:${step.provider}`
                                  }
                                >
                                  {actionTarget === `test:${step.provider}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Test'
                                  )}
                                </Button>

                                <Button
                                  variant="outline"
                                  className="w-full sm:min-w-[150px] border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"
                                  onClick={() => handleVerify(step.provider, step.label)}
                                  disabled={
                                    actionTarget === `verify:${step.provider}` ||
                                    actionTarget === `test:${step.provider}` ||
                                    actionTarget === `sync:${step.provider}`
                                  }
                                >
                                  {actionTarget === `verify:${step.provider}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Verify'
                                  )}
                                </Button>

                                <Button
                                  variant="outline"
                                  className="w-full sm:min-w-[150px] border-white/25 bg-white/5 text-white/80 hover:bg-white/10"
                                  onClick={() => handleSyncNow(step.provider, step.label)}
                                  disabled={
                                    !step.integration?.isActive ||
                                    actionTarget === `sync:${step.provider}` ||
                                    actionTarget === `test:${step.provider}` ||
                                    actionTarget === `verify:${step.provider}`
                                  }
                                >
                                  {actionTarget === `sync:${step.provider}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Sync'
                                  )}
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full sm:min-w-[150px] border-white/25 bg-white/5 text-white/70 hover:bg-white/10"
                                onClick={() => handleConfigure(step.provider, step.label)}
                              >
                                Not configured
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              className="w-full sm:min-w-[150px] border border-orange-400/60 text-orange-200 hover:bg-orange-500/10"
                              onClick={() => setSelectedPlatform({ id: step.id, label: step.label, provider: step.provider, status: step.status as any })}
                            >
                              View details
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-8">
            <Button
              variant="outline"
              className="w-full sm:w-auto px-6 py-3 text-lg border-white/30 text-white hover:bg-white/10"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// FLOW END: Checklist Page (EN)
// จุดสิ้นสุด: หน้า Checklist (TH)

export default Checklist
