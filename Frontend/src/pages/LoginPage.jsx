import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice';
import { loginUser, forgotPassword, resetPassword } from '../lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ShieldCheck, KeyRound, ArrowLeft, Lock } from "lucide-react";

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  
  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState('EMAIL'); // 'EMAIL' | 'OTP'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!username || !password) {
      setLocalError('Please fill in both fields');
      return;
    }

    dispatch(loginStart());
    try {
      const response = await loginUser({ username: username.trim(), password });
      const { token, user } = response.data;
      dispatch(loginSuccess({ token, user }));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      const errMsg = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || 'Invalid credentials or account issue.');
      dispatch(loginFailure(errMsg));
    }
  };

  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid college email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await forgotPassword({ email: forgotEmail.trim().toLowerCase() });
      setForgotMsg(res.data?.message || 'Password reset OTP dispatched.');
      setForgotStep('OTP');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data || 'Failed to dispatch reset code.';
      setForgotError(typeof errMsg === 'string' ? errMsg : 'Request failed');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotOtpSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit OTP.');
      return;
    }

    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }

    setForgotLoading(true);
    try {
      await resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otpCode: forgotOtp.trim(),
        newPassword
      });
      setForgotMsg('Password successfully updated! You can now sign in.');
      setTimeout(() => {
        setShowForgot(false);
        setForgotStep('EMAIL');
        setForgotEmail('');
        setForgotOtp('');
        setNewPassword('');
        setForgotMsg('');
      }, 2000);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data || 'Failed to reset password. Check the OTP code.';
      setForgotError(typeof errMsg === 'string' ? errMsg : 'Reset failed');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4 selection:bg-accent/20">
      <Card className="w-full max-w-md border border-line bg-surface shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pt-8 pb-6 border-b border-line bg-surface">
          <div className="flex justify-center mb-1">
            <div className="w-14 h-14 rounded-2xl bg-accent-dim flex items-center justify-center text-accent shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif text-ink tracking-tight font-bold">
            {showForgot ? 'Reset Password' : 'Sign In'}
          </CardTitle>
          <CardDescription className="text-xs text-ink-muted">
            {showForgot ? 'Verify your college email with a 6-digit OTP' : 'ResolveDesk — ANITS Campus Grievance System'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5">
          {!showForgot ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold text-ink">Username or College Email</Label>
                <Input 
                  id="username" 
                  placeholder="e.g. 21b91a0501 or user@anits.edu.in" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-ink">Password</Label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setLocalError(''); }}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                  required
                />
              </div>
              
              {(localError || error) && (
                <div className="p-3 rounded-xl bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2.5 text-status-rejected text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{localError || error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-xs font-semibold tracking-wide bg-accent hover:bg-[#234C40] text-white shadow-sm transition-all"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : forgotStep === 'EMAIL' ? (
            <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
              <p className="text-xs text-ink-muted leading-relaxed">
                Enter your registered ANITS email address. We will dispatch a 6-digit OTP code to verify your identity.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="forgotEmail" className="text-xs font-semibold text-ink">ANITS College Email</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder="your.id@anits.edu.in"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                  required
                />
              </div>

              {forgotError && (
                <div className="p-3 rounded-xl bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2.5 text-status-rejected text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{forgotError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-xs font-semibold tracking-wide bg-accent hover:bg-[#234C40] text-white shadow-sm transition-all"
                disabled={forgotLoading}
              >
                {forgotLoading ? "Sending OTP..." : "Send Reset Code"}
              </Button>

              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotError(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-ink pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotOtpSubmit} className="space-y-4">
              {forgotMsg && (
                <div className="p-3 rounded-xl bg-accent-dim border border-accent/20 flex items-center gap-2.5 text-accent text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <p>{forgotMsg}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="forgotOtp" className="text-xs font-semibold text-ink">6-Digit Verification Code</Label>
                <Input
                  id="forgotOtp"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-12 rounded-xl text-center text-xl tracking-[0.4em] font-mono border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-semibold text-ink">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                  required
                />
              </div>

              {forgotError && (
                <div className="p-3 rounded-xl bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2.5 text-status-rejected text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{forgotError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-xs font-semibold tracking-wide bg-accent hover:bg-[#234C40] text-white shadow-sm transition-all"
                disabled={forgotLoading || forgotOtp.length !== 6}
              >
                {forgotLoading ? "Resetting..." : "Confirm & Update Password"}
              </Button>

              <button
                type="button"
                onClick={() => { setForgotStep('EMAIL'); setForgotError(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-ink pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Re-enter Email
              </button>
            </form>
          )}
        </CardContent>

        <CardFooter className="pt-4 pb-6 border-t border-line flex justify-center bg-paper/30">
          <p className="text-center text-xs text-ink-muted">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-accent hover:underline underline-offset-4">
              Register here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
