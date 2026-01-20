import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { register } from '../../services/api';

interface RegisterFormProps {
  onBackToLogin: () => void;
}

// FLOW START: Register Page (EN)
// จุดเริ่มต้น: หน้า Register (TH)

export const RegisterForm: React.FC<RegisterFormProps> = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()), [formData.email]);
  const passwordChecks = useMemo(() => {
    const pwd = formData.password;
    return {
      minLen: pwd.length >= 8,
      hasLower: /[a-z]/.test(pwd),
      hasUpper: /[A-Z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSymbol: /[^A-Za-z0-9]/.test(pwd),
    };
  }, [formData.password]);
  const passwordStrength = useMemo(() => {
    const score = Object.values(passwordChecks).filter(Boolean).length;
    if (!formData.password) return 0;
    if (score <= 2) return 1;
    if (score === 3) return 2;
    if (score === 4) return 3;
    return 4;
  }, [formData.password, passwordChecks]);

  const passwordStrengthLabel = useMemo(() => {
    if (!formData.password) return '';
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Good';
    if (passwordStrength === 3) return 'Strong';
    return 'Very strong';
  }, [formData.password, passwordStrength]);
  const passwordsMatch = useMemo(
    () => formData.password.length > 0 && formData.password === formData.confirmPassword,
    [formData.password, formData.confirmPassword],
  );

  const canSubmit =
    !!formData.firstName.trim() &&
    !!formData.lastName.trim() &&
    emailValid &&
    passwordStrength >= 2 &&
    passwordsMatch &&
    acceptedTerms &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
      acceptedTerms: true,
    });

    if (!canSubmit) {
      setError('Please review the highlighted fields and try again.');
      setLoading(false);
      return;
    }

    try {
      const latestTenantId = localStorage.getItem('tenantId') || '';
      const latestTenantSlug = localStorage.getItem('tenantSlug') || '';
      const tenant = (latestTenantId || latestTenantSlug).trim() || undefined;

      const res = await register(
        formData.email, 
        formData.password, 
        formData.firstName, 
        formData.lastName, 
        tenant
      );
      const message = res.message || 'Registration successful. Please check your email to verify your account.';
      setSuccessMessage(message);
      if (res.verificationToken) {
        const origin = window.location.origin || 'http://localhost:3000';
        setVerificationLink(`${origin}/verify-email?token=${encodeURIComponent(res.verificationToken)}`);
      }
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      const data = err?.response?.data;
      const message =
        data?.message ||
        data?.error?.message ||
        (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
        err?.message ||
        'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: "url('/image/solar-system-4879810_1920.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(12,12,12,0.78),rgba(2,2,2,0.72))]" />
      <div className="absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-orange-300/18 blur-[130px]" />
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-yellow-300/10 blur-[140px]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-wider text-orange-300">RISE GROUP ASIA</p>
            <h1 className="mt-3 text-3xl font-bold">Create your account</h1>
            <p className="mt-2 text-sm text-white/75">
              สมัครสมาชิกเพื่อเข้าใช้งาน RGA Dashboard (บัญชีใหม่เป็น <span className="font-semibold text-orange-200">Admin Test</span>)
              และต้องยืนยันอีเมลก่อนเริ่มใช้งาน
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-r from-orange-500/35 via-yellow-300/15 to-white/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-black/55 p-7 shadow-[0_40px_120px_rgba(0,0,0,0.7)] backdrop-blur sm:p-10">
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-orange-300">Sign up</p>
                    <h2 className="mt-2 text-2xl font-bold">Create your account</h2>
                    <p className="mt-1 text-sm text-white/70">We’ll email you a verification link.</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-300 to-yellow-200 text-black font-black">
                    R
                  </div>
                </div>

                {successMessage && (
                  <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-emerald-50">
                    <p className="text-sm font-semibold tracking-wide uppercase">Success</p>
                    <p className="mt-1 text-sm text-white/90">{successMessage}</p>
                    {verificationLink && (
                      <a className="mt-3 inline-block text-sm text-orange-200 underline" href={verificationLink}>
                        Verify email (dev)
                      </a>
                    )}
                    <p className="mt-2 text-xs text-white/70">Redirecting to sign in…</p>
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-50">
                      <p className="text-sm font-semibold tracking-wide uppercase">Error</p>
                      <p className="mt-1 text-sm text-white/90">{error}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-semibold text-white/90">
                        First name
                      </label>
                      <div className="mt-1">
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          onBlur={() => setTouched((prev) => ({ ...prev, firstName: true }))}
                          className={`block w-full rounded-2xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-orange-300/60 focus:ring-2 focus:ring-orange-300/20 ${
                            touched.firstName && !formData.firstName.trim() ? 'border-red-500/50' : 'border-white/10'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-semibold text-white/90">
                        Last name
                      </label>
                      <div className="mt-1">
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          onBlur={() => setTouched((prev) => ({ ...prev, lastName: true }))}
                          className={`block w-full rounded-2xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-orange-300/60 focus:ring-2 focus:ring-orange-300/20 ${
                            touched.lastName && !formData.lastName.trim() ? 'border-red-500/50' : 'border-white/10'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-white/90">
                      Email address
                    </label>
                    <div className="mt-1">
                      <div
                        className={`flex items-center gap-3 rounded-2xl border bg-white/5 px-4 py-3 transition focus-within:border-orange-300/60 focus-within:ring-2 focus-within:ring-orange-300/20 ${
                          touched.email && !emailValid ? 'border-red-500/50' : 'border-white/10'
                        }`}
                      >
                        <Mail className="h-5 w-5 text-white/60" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                          className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
                          placeholder="you@company.com"
                        />
                      </div>
                    </div>
                    {touched.email && !emailValid && (
                      <p className="mt-1 text-xs text-red-200">Please enter a valid email address.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-white/90">
                      Password
                    </label>
                    <div className="mt-1">
                      <div
                        className={`flex items-center gap-3 rounded-2xl border bg-white/5 px-4 py-3 transition focus-within:border-orange-300/60 focus-within:ring-2 focus-within:ring-orange-300/20 ${
                          touched.password && passwordStrength < 2 ? 'border-red-500/50' : 'border-white/10'
                        }`}
                      >
                        <Lock className="h-5 w-5 text-white/60" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                          className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
                          placeholder="Create a strong password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="rounded-lg p-1 text-white/70 hover:text-white"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-white/60">Password strength</p>
                        {passwordStrengthLabel && (
                          <p className="text-xs font-semibold text-white/80">{passwordStrengthLabel}</p>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded bg-white/10">
                        <div
                          className={`h-1.5 rounded ${
                            passwordStrength <= 1
                              ? 'w-1/4 bg-red-500'
                              : passwordStrength === 2
                                ? 'w-2/4 bg-orange-500'
                                : passwordStrength === 3
                                  ? 'w-3/4 bg-yellow-500'
                                  : 'w-full bg-green-600'
                          }`}
                        />
                      </div>
                      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 ${passwordChecks.minLen ? 'text-green-300' : 'text-white/25'}`}
                            />
                            <span className={`min-w-0 leading-tight ${passwordChecks.minLen ? 'text-green-300' : 'text-white/60'}`}>
                              At least 8 characters
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 ${passwordChecks.hasUpper ? 'text-green-300' : 'text-white/25'}`}
                            />
                            <span className={`min-w-0 leading-tight ${passwordChecks.hasUpper ? 'text-green-300' : 'text-white/60'}`}>
                              Uppercase letter
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 ${passwordChecks.hasLower ? 'text-green-300' : 'text-white/25'}`}
                            />
                            <span className={`min-w-0 leading-tight ${passwordChecks.hasLower ? 'text-green-300' : 'text-white/60'}`}>
                              Lowercase letter
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 ${passwordChecks.hasNumber ? 'text-green-300' : 'text-white/25'}`}
                            />
                            <span className={`min-w-0 leading-tight ${passwordChecks.hasNumber ? 'text-green-300' : 'text-white/60'}`}>
                              A number
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 ${passwordChecks.hasSymbol ? 'text-green-300' : 'text-white/25'}`}
                            />
                            <span className={`min-w-0 leading-tight ${passwordChecks.hasSymbol ? 'text-green-300' : 'text-white/60'}`}>
                              A symbol
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white/90">
                      Confirm password
                    </label>
                    <div className="mt-1">
                      <div
                        className={`flex items-center gap-3 rounded-2xl border bg-white/5 px-4 py-3 transition focus-within:border-orange-300/60 focus-within:ring-2 focus-within:ring-orange-300/20 ${
                          touched.confirmPassword && !passwordsMatch ? 'border-red-500/50' : 'border-white/10'
                        }`}
                      >
                        <Lock className="h-5 w-5 text-white/60" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                          className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
                          placeholder="Repeat your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="rounded-lg p-1 text-white/70 hover:text-white"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    {touched.confirmPassword && !passwordsMatch && (
                      <p className="mt-1 text-xs text-red-200">Passwords do not match.</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-start gap-2 text-sm text-white/85">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        onBlur={() => setTouched((prev) => ({ ...prev, acceptedTerms: true }))}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-orange-400 focus:ring-orange-300"
                      />
                      <span>
                        I agree to the <a className="underline text-orange-200" href="/terms">Terms</a> and{' '}
                        <a className="underline text-orange-200" href="/privacy">Privacy Policy</a>.
                      </span>
                    </label>
                    {touched.acceptedTerms && !acceptedTerms && (
                      <p className="mt-1 text-xs text-red-200">You must accept the terms to continue.</p>
                    )}
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-300 px-6 py-3 text-sm font-semibold text-black shadow-[0_20px_45px_rgba(249,115,22,0.45)] transition hover:shadow-[0_25px_55px_rgba(249,115,22,0.55)] focus:outline-none focus:ring-2 focus:ring-orange-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Creating account…' : 'Create account'}
                    </button>
                  </div>

                  <div className="pt-2">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-black/45 px-3 text-white/60">Already have an account?</span>
                      </div>
                    </div>
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={onBackToLogin}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-300/30"
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// FLOW END: Register Page (EN)
// จุดสิ้นสุด: หน้า Register (TH)
