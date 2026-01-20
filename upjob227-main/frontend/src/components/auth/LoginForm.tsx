import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, MessageCircle, Sparkles, Send, Building2 } from 'lucide-react';
import { login, resendVerificationEmail } from '../../services/api';

type ChatMessage = {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
};

interface LoginFormProps {
  onForgotPassword?: () => void;
  onRegister?: () => void;
  onLoginSuccess?: () => void;
}

// FLOW START: Login Page (EN)
// จุดเริ่มต้น: หน้า Login (TH)

export const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword, onRegister, onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '', tenantId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [devVerifyLink, setDevVerifyLink] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showTenantId, setShowTenantId] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(process.env.NODE_ENV !== 'production');
  const [activeSlide, setActiveSlide] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'assistant',
      text: "Hi, I'm the RGA Copilot. Ask me anything about the platform before you sign in.",
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const slides = useMemo(
    () => [
      {
        src: '/assets/login-slide-1.jpg',
        alt: 'Unified realtime dashboard',
      },
      {
        src: '/assets/login-slide-2.jpg',
        alt: 'Campaign orchestration view',
      },
      {
        src: '/assets/login-slide-3.jpg',
        alt: 'Trend analytics overview',
      },
    ],
    []
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatTyping]);

  const handleForgotPasswordClick = () => {
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      navigate('/forgot-password');
    }
  };

  const handleRegisterClick = () => {
    if (onRegister) {
      onRegister();
    } else {
      navigate('/register');
    }
  };

  const handleAdminMessTrialClick = () => {
    handleRegisterClick();
  };

  const buildAssistantResponse = (prompt: string) => {
    const normalized = prompt.toLowerCase();
    if (normalized.includes('password')) {
      return 'Use the “Forgot password” link and we will email you a secure reset link to your corporate inbox.';
    }
    if (normalized.includes('demo') || normalized.includes('feature')) {
      return 'The RGA Dashboard unifies campaign, SEO, e-commerce, and CRM intelligence with real-time analytics in one pane.';
    }
    if (normalized.includes('register') || normalized.includes('onboard')) {
      return 'Need onboarding for your squad? Tap “Request onboarding” underneath the sign-in button to notify the Success team.';
    }
    return 'I can guide you through platform access, data coverage, and onboarding steps—just send over your question!';
  };

  const handleChatSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const userMessage: ChatMessage = { id: Date.now(), sender: 'user', text: trimmed };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatTyping(true);
    setTimeout(() => {
      const response: ChatMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: buildAssistantResponse(trimmed),
      };
      setChatMessages((prev) => [...prev, response]);
      setChatTyping(false);
    }, 800);
  };

  const handleChatInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleChatSend();
    }
  };

  const handleToggleChat = () => setChatOpen((prev) => !prev);
  const isSendDisabled = chatTyping || !chatInput.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnverifiedEmail(false);
    setResendStatus(null);
    setDevVerifyLink(null);

    try {
      const tenantValue = formData.tenantId.trim();
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (tenantValue) {
        if (uuidLike.test(tenantValue)) {
          localStorage.setItem('tenantId', tenantValue);
          localStorage.removeItem('tenantSlug');
        } else {
          localStorage.setItem('tenantSlug', tenantValue);
          localStorage.removeItem('tenantId');
        }
      } else {
        localStorage.removeItem('tenantId');
        localStorage.removeItem('tenantSlug');
      }
      await login(formData.email, formData.password);
      const currentRole = localStorage.getItem('userRole') || '';
      if (currentRole === 'admintest') {
        setToast({ message: 'เข้าสู่ระบบสำเร็จ: บัญชี Admin Test (ทดลอง 24 ชั่วโมง)', type: 'success' });
      } else {
        setToast({ message: 'เข้าสู่ระบบสำเร็จ', type: 'success' });
      }
      onLoginSuccess?.();
      navigate('/dashboard');
    } catch (err: any) {
      const data = err.response?.data;
      const message = data?.message || 'Unable to complete the sign-in request.';
      setError(message);
      if (typeof message === 'string' && message.toLowerCase().includes('email not verified')) {
        setUnverifiedEmail(true);
      }
      setToast({
        message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = formData.email.trim();
    if (!email) {
      setResendStatus('Please enter your email first.');
      return;
    }
    try {
      setResendStatus('Sending verification email…');
      const res = await resendVerificationEmail(email);
      setResendStatus(res.message || 'Verification email sent. Please check your inbox.');
      if (res.verificationToken) {
        setDevVerifyLink(`/verify-email?token=${encodeURIComponent(res.verificationToken)}`);
      }
    } catch (e: any) {
      setResendStatus(e.response?.data?.message || 'Failed to resend verification email.');
    }
  };

  const handleGoogleError = (error: string) => {
    setError(error);
  };

  const isDevBuild = process.env.NODE_ENV !== 'production';

  const demoAccounts = useMemo(
    () =>
      [
        { label: 'Super Admin', email: 'superadmin@rga.local', password: 'SuperAdmin@123' },
        { label: 'Admin Full', email: 'adminfull@rga.local', password: 'AdminFull@123' },
        { label: 'Admin Test', email: 'admintest@rga.local', password: 'AdminTest@123' },
        { label: 'Manager', email: 'manager@rga.local', password: 'Manager@123' },
        { label: 'Viewer', email: 'viewer@rga.local', password: 'Viewer@123' },
      ] as const,
    [],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {toast && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end px-6 pt-6">
          <div
            className={`pointer-events-auto inline-flex min-w-[280px] max-w-sm items-start gap-3 rounded-2xl border px-5 py-4 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur transition duration-200 ${
              toast.type === 'error'
                ? 'border-red-500/40 bg-red-500/15 text-red-100'
                : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-50'
            }`}
          >
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold tracking-wide uppercase">Notification</p>
              <p className="text-sm text-white/90">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: "url('/image/solar-system-4879810_1920.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,15,15,0.65),rgba(5,5,5,0.55))]" />
      <div className="absolute inset-0 opacity-20">
        <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:80px_80px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:80px_80px]" />
      </div>
      <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-orange-300/15 blur-[110px]" />

      <div className="relative z-10 flex min-h-screen items-center px-4 py-10">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#3d2418]/95 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-0 opacity-20 transition duration-700 group-hover:opacity-40">
            </div>
            <div className="relative space-y-8">
              <div className="flex flex-col gap-3 text-left">
                <p className="text-xs uppercase tracking-wider text-orange-300">RISE GROUP ASIA</p>
                <div className="flex items-center gap-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-300 text-2xl font-black tracking-tight text-black shadow-[0_0_45px_rgba(249,115,22,0.45)]">
                    RGA
                  </div>
                  <p className="text-2xl font-bold text-white leading-snug">Intelligence Operations Suite</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner">
                <div className="relative h-72 w-full">
                </div>
                <div className="flex items-center justify-center gap-2 p-4">
                  {slides.map((_, index) => (
                    <span
                      key={index}
                      className={`h-1 w-1 rounded-full transition ${
                        index === activeSlide ? 'bg-orange-400' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative rounded-[32px] border border-white/5 bg-[#3d2418]/85 p-10 backdrop-blur-2xl shadow-[0_35px_80px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-70 blur-3xl" />
            <div className="relative">
              <div className="mb-8 space-y-2">
                <p className="text-xs uppercase tracking-wider text-orange-300">Secure Access</p>
                <h2 className="text-3xl font-semibold text-white">Sign in to your RGA account</h2>
                <p className="text-sm text-gray-400">Use the corporate credentials issued by Rise Group Asia to access the control center.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300" htmlFor="email">
                    Corporate email
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      autoComplete="username"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder-gray-400 shadow-[0_10px_40px_rgba(0,0,0,0.45)] focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
                      placeholder="firstname.lastname@risegroup.asia"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      autoComplete="current-password"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder-gray-400 shadow-[0_10px_40px_rgba(0,0,0,0.45)] focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-sm text-gray-400">
                  <label className="flex items-center gap-2">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-transparent text-orange-500 focus:ring-orange-500"
                    />
                    <span>Remember this device</span>
                  </label>
                  <button type="button" onClick={handleForgotPasswordClick} className="text-orange-300 hover:text-white">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-300 px-6 py-3 text-lg font-semibold text-black shadow-[0_20px_45px_rgba(249,115,22,0.45)] transition duration-200 hover:shadow-[0_25px_55px_rgba(249,115,22,0.55)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 focus:ring-offset-[#050505] disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                      <span>Verifying credentials...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LogIn className="h-5 w-5" />
                      Sign in
                    </span>
                  )}
                </button>

                {unverifiedEmail && (
                  <div className="rounded-2xl border border-orange-300/25 bg-black/30 p-4">
                    <p className="text-sm font-semibold text-orange-200">ต้องยืนยันอีเมลก่อนเข้าใช้งาน</p>
                    <p className="mt-1 text-xs text-gray-300">
                      กรุณากดส่งอีเมลยืนยันอีกครั้ง แล้วเปิดลิงก์ในอีเมลเพื่อยืนยัน
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        ส่งอีเมลยืนยันอีกครั้ง
                      </button>
                      {resendStatus && <p className="text-xs text-gray-300">{resendStatus}</p>}
                      {devVerifyLink && (
                        <a className="text-xs text-orange-200 underline" href={devVerifyLink}>
                          Verify now (dev)
                        </a>
                      )}
                    </div>
                  </div>
                )}

              </form>

              <div className="mt-8 text-center text-sm text-gray-400">
                Need access for your team?{' '}
                <button type="button" onClick={handleRegisterClick} className="text-orange-300 hover:text-white">
                  Request onboarding
                </button>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleAdminMessTrialClick}
                    className="text-orange-200/80 hover:text-white"
                  >
                    สมัครใช้งาน Admin Test (ทดลอง 24 ชั่วโมง)
                  </button>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowTenantId((prev) => !prev)}
                    className="text-orange-200/80 hover:text-white"
                  >
                    {showTenantId ? 'ซ่อนไอดีองค์กร' : 'กรอกไอดีองค์กร'}
                  </button>
                </div>
                {showTenantId && (
                  <div className="mt-4 text-left">
                    <label className="text-sm font-medium text-gray-300" htmlFor="tenantId">
                      Tenant ID / Slug
                    </label>
                    <div className="relative mt-2">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
                      <input
                        id="tenantId"
                        type="text"
                        value={formData.tenantId}
                        onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                        autoComplete="organization"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-white placeholder-gray-400 shadow-[0_10px_40px_rgba(0,0,0,0.45)] focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
                        placeholder="เช่น rga-demo หรือ tenant-uuid"
                      />
                    </div>
                  </div>
                )}

                {isDevBuild && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
                    <button
                      type="button"
                      onClick={() => setShowDemoCredentials((prev) => !prev)}
                      className="w-full text-left text-sm font-semibold text-orange-200/90 hover:text-white"
                      aria-expanded={showDemoCredentials}
                    >
                      {showDemoCredentials ? 'ซ่อนอีเมล/รหัสผ่านทดสอบ (DEV)' : 'อีเมล/รหัสผ่านทดสอบ (DEV)'}
                    </button>
                    {showDemoCredentials && (
                      <div className="mt-3 space-y-3">
                        <p className="text-xs text-gray-300">
                          กดปุ่มด้านล่างเพื่อเติม Email/Password อัตโนมัติ แล้วกด Sign in
                        </p>
                        <div className="grid gap-2">
                          {demoAccounts.map((acc) => (
                            <button
                              key={acc.email}
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  email: acc.email,
                                  password: acc.password,
                                  tenantId: 'rga-demo',
                                }))
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                            >
                              <span className="font-semibold text-white">{acc.label}</span>
                              <span className="truncate text-xs text-gray-300">{acc.email}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={handleToggleChat}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur"
          aria-expanded={chatOpen}
        >
          <MessageCircle className="h-4 w-4 text-orange-300" />
          {chatOpen ? 'Hide copilot' : 'Chat with RGA Copilot'}
        </button>
        {chatOpen && (
          <div className="w-[320px] rounded-[28px] border border-white/10 bg-[#040404]/95 p-5 text-white shadow-[0_40px_120px_rgba(0,0,0,0.75)] backdrop-blur-3xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-200 text-black shadow-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold">RGA Copilot</p>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-orange-200/80">Instant Support</p>
                </div>
              </div>
              <button type="button" onClick={handleToggleChat} className="text-xs text-gray-400 hover:text-white">
                Minimize
              </button>
            </div>
            <div ref={chatScrollRef} className="mt-4 max-h-80 min-h-[220px] space-y-3 overflow-y-auto pr-1">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-lg ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 text-black'
                        : 'bg-white/5 text-white'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              {chatTyping && (
                <div className="flex items-center gap-2 text-xs text-orange-200">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-orange-300" />
                  Typing a reply...
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Ask anything</label>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={handleChatInputKeyDown}
                  rows={3}
                  placeholder="Ask about access, features, or onboarding..."
                  className="w-full resize-none bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleChatSend}
                disabled={isSendDisabled}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 px-4 py-2 text-sm font-semibold text-black shadow-[0_15px_35px_rgba(249,115,22,0.45)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Send to Copilot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// FLOW END: Login Page (EN)
// จุดสิ้นสุด: หน้า Login (TH)
