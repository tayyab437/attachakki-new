import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Mail, Lock, Store, User, Key, KeyRound, ShieldAlert, ArrowRight, RefreshCw, Sparkles, Building2 } from 'lucide-react';

export default function AuthView() {
  const { login, signUp, verifyEmailCode, resendVerificationEmail, verification, loading } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('ac.repair.in.dubai3@gmail.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  
  // Verification field
  const [otpCode, setOtpCode] = useState('');
  
  // UI states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'err'; msg: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (isSignUp) {
      if (!fullName.trim() || !shopName.trim() || !email.trim()) {
        setFeedback({ type: 'err', msg: 'Please fill in all registration fields.' });
        return;
      }
      const res = await signUp(email, password, fullName, shopName);
      if (res.success) {
        setFeedback({ type: 'success', msg: res.msg });
      } else {
        setFeedback({ type: 'err', msg: res.msg });
      }
    } else {
      const res = await login(email, password);
      if (!res.success) {
        setFeedback({ type: 'err', msg: res.msg });
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!otpCode.trim()) {
      setFeedback({ type: 'err', msg: 'Please enter the 6-digit confirmation code.' });
      return;
    }
    const res = await verifyEmailCode(otpCode.trim());
    if (res.success) {
      setFeedback({ type: 'success', msg: res.msg });
    } else {
      setFeedback({ type: 'err', msg: res.msg });
    }
  };

  const handleResend = async () => {
    setFeedback(null);
    await resendVerificationEmail();
    setFeedback({ 
      type: 'success', 
      msg: `A fresh 6-digit PIN has been dispatched. Check the simulation box below!` 
    });
  };

  // If we are currently in the Verification Flow
  if (verification.emailSent) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans" id="auth-code-wrapper">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center shadow-md animate-pulse">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900" id="verify-heading">
            Confirm Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            A confirmation mail was dispatched to <span className="font-semibold text-gray-800">{verification.emailToVerify}</span>.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 rounded-2xl sm:px-10">
            {feedback && (
              <div className={`p-3 rounded-lg text-xs mb-4 flex items-start gap-2 ${feedback.type === 'err' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-line leading-relaxed">{feedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label htmlFor="otp" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  6-Digit OTP Verification PIN
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-center font-mono text-lg tracking-widest placeholder:tracking-normal placeholder:font-sans"
                  />
                </div>
              </div>

              <div id="verify-buttons" className="space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-xs text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors cursor-pointer"
                >
                  Verify Verification PIN
                </button>
                
                <button
                  type="button"
                  onClick={handleResend}
                  className="w-full flex justify-center items-center gap-1 py-2 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Resend Verification Code
                </button>
              </div>
            </form>

            {/* SIMULATED SMTP SYSTEM GIZMO */}
            <div className="mt-8 bg-amber-50/70 border border-amber-200/50 p-4 rounded-xl">
              <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs mb-1">
                <Sparkles className="h-4 w-4 text-orange-600 shrink-0" />
                <span>Local Mailer Sandbox Terminal</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed mb-3">
                Since you are test driving this applet in developer workspace, we have intercept-routed the verification email here for your testing convenience.
              </p>
              <div className="bg-gray-950 p-3 rounded-lg font-mono text-xs text-emerald-400 flex items-center justify-between">
                <div>
                  <span className="text-gray-500">OTP_PIN_INBOUND:</span> <span className="font-bold text-white tracking-widest text-sm">{verification.otpToken || "Expiring..."}</span>
                </div>
                <button 
                  onClick={() => {
                    if (verification.otpToken) setOtpCode(verification.otpToken);
                  }}
                  className="px-2 py-1 bg-emerald-950 border border-emerald-500/30 text-[10px] text-emerald-300 rounded hover:bg-emerald-900 transition-colors"
                >
                  Auto-Fill
                </button>
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-amber-700">
                <span className="hover:underline cursor-pointer" onClick={() => {
                  setOtpCode('000000');
                  setFeedback({ type: 'err', msg: 'Expired token simulation. CODE_EXPIRED_MOCK_403.' });
                }}>Simulate Expired Link</span>
                <span className="hover:underline cursor-pointer" onClick={() => {
                  setOtpCode('999999');
                  setFeedback({ type: 'err', msg: 'Invalid token check. CODE_MISMATCH_MOCK_401.' });
                }}>Simulate Invalid Token</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans" id="auth-main-wrapper">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center" id="logo-branding">
          <div className="h-12 w-12 rounded-xl bg-gray-900 flex items-center justify-center shadow-xs">
            <Building2 className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
          {isSignUp ? 'Create Flour Shop Workspace' : 'Sign in to Flour Shop SaaS'}
        </h2>
        <p className="mt-2 text-center text-xs text-gray-650">
          {isSignUp ? 'Establish your digital Atta Chakki business workspace' : 'Enter your registered credentials to manage grains and custom POS'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 rounded-2xl sm:px-10">
          {feedback && (
            <div className={`p-3 rounded-lg text-xs mb-4 flex items-start gap-2 ${feedback.type === 'err' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="whitespace-pre-line leading-relaxed">{feedback.msg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Owner Full Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="e.g. M. Ibrahim Khan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 bg-gray-50 text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="shopName" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Flour Shop / Atta Chakki Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Store className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="shopName"
                      type="text"
                      required
                      placeholder="e.g. Supreme Chakki & Millers"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 bg-gray-50 text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="ac.repair.in.dubai3@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-gray-50 text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pass" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Passcode / Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="pass"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-gray-50 text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white text-xs"
                />
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 checkbox-accent"
                  />
                  <label htmlFor="remember" className="ml-2 text-gray-600 font-medium">Keep me active</label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFeedback({ 
                      type: 'success', 
                      msg: `Password reset simulation: A temporary secret pin has been dispatched to ${email}. Check mailbox.` 
                    });
                  }}
                  className="text-xs font-semibold text-gray-900 hover:underline"
                >
                  Forgot passcode?
                </button>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 rounded-xl shadow-xs text-xs font-semibold text-white bg-gray-950 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-950 transition-colors cursor-pointer"
              >
                <span>{isSignUp ? 'Initiate Register & Verify' : 'Enter Dashboard'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 font-semibold tracking-wide">Workspace Switcher</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setFeedback(null);
                }}
                className="text-xs font-bold text-gray-700 hover:text-gray-900 hover:underline"
              >
                {isSignUp ? 'Already own a shop? Login' : 'Need a new business profile? Start Free Trial'}
              </button>
            </div>
          </div>
          
          <div className="mt-6 p-3 bg-gray-50 border border-gray-150 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Developer Fast-Track Credentials</span>
            <div className="text-[11px] text-gray-650 flex flex-col gap-1">
              <div><span className="font-semibold text-gray-800">Demo User:</span> <code className="bg-gray-200 text-gray-800 px-1 rounded font-mono">ac.repair.in.dubai3@gmail.com</code></div>
              <div><span className="font-semibold text-gray-800">Passcode:</span> <code className="bg-gray-200 text-gray-800 px-1 rounded font-mono">password123</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
