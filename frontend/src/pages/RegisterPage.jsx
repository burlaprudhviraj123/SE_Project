import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginSuccess } from '../store/authSlice';
import { registerStudent, verifyOtp } from '../lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ShieldCheck, Mail, ArrowLeft, KeySquare, Moon, Sun } from "lucide-react";

const RegisterPage = () => {
  const [step, setStep] = useState('REGISTER'); // 'REGISTER' | 'VERIFY_OTP'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: ''
  });
  const [otpCode, setOtpCode] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !formData.firstName || !formData.lastName || !formData.phoneNumber) {
      return 'Please fill in all required fields';
    }
    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@anits.edu.in')) {
      return 'Registration is restricted to ANITS college email addresses (@anits.edu.in)';
    }
    if (formData.username.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    if (formData.firstName.length < 2) {
      return 'First name must be at least 2 characters long';
    }
    if (formData.lastName.length < 2) {
      return 'Last name must be at least 2 characters long';
    }
    if (!/^\d{10}$/.test(formData.phoneNumber)) {
      return 'Phone number must be exactly 10 digits';
    }
    return '';
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await registerStudent({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address?.trim()
      });
      
      setRegisteredEmail(response.data?.email || formData.email.trim().toLowerCase());
      setStep('VERIFY_OTP');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || 'Registration failed. Please verify your email format and try again.';
      setError(typeof errMsg === 'string' ? errMsg : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp({
        email: registeredEmail,
        otpCode: otpCode.trim()
      });

      const { token, user } = response.data;
      dispatch(loginSuccess({ token, user }));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || 'Verification failed. Please check the OTP code.';
      setError(typeof errMsg === 'string' ? errMsg : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4 selection:bg-accent/20 relative">
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-full border-line bg-surface text-ink shadow-sm h-9 w-9 hover:bg-paper cursor-pointer"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#2B5D4F]" />}
        </Button>
      </div>
      <Card className="w-full max-w-xl border border-line bg-surface shadow-lg rounded-3xl overflow-hidden my-8">
        <CardHeader className="space-y-2 text-center pt-8 pb-6 border-b border-line bg-surface">
          <div className="flex justify-center mb-1">
            <div className="w-14 h-14 rounded-2xl bg-accent-dim flex items-center justify-center text-accent shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif text-ink tracking-tight font-bold">
            {step === 'REGISTER' ? 'Student Registration' : 'Verify College Email'}
          </CardTitle>
          <CardDescription className="text-xs text-ink-muted">
            {step === 'REGISTER'
              ? 'ANITS Campus Grievance Redressal System'
              : `A 6-digit verification code has been dispatched to ${registeredEmail}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5">
          {step === 'REGISTER' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* College domain notice banner */}
              <div className="p-4 bg-paper border border-line rounded-2xl text-xs text-ink-muted flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">
                  Registration is strictly restricted to enrolled students with an official ANITS college email (<strong className="text-ink">@anits.edu.in</strong>).
                </span>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-semibold text-ink">First Name *</Label>
                  <Input 
                    id="firstName" 
                    placeholder="e.g. Rahul" 
                    value={formData.firstName}
                    onChange={handleChange}
                    className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-semibold text-ink">Last Name *</Label>
                  <Input 
                    id="lastName" 
                    placeholder="e.g. Sharma" 
                    value={formData.lastName}
                    onChange={handleChange}
                    className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                    required
                  />
                </div>
              </div>

              {/* Username & College Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold text-ink">Student Roll Number (ID) *</Label>
                  <Input 
                    id="username" 
                    placeholder="e.g. A24126510123" 
                    value={formData.username}
                    onChange={handleChange}
                    className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-ink">ANITS College Email *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="student@anits.edu.in" 
                    value={formData.email}
                    onChange={handleChange}
                    className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                    required
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-ink">Password *</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-ink">Confirm Password *</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                    required
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-xs font-semibold text-ink">Mobile Number (10 digits) *</Label>
                <Input 
                  id="phoneNumber" 
                  placeholder="9876543210" 
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="h-11 px-4 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10"
                  required
                />
              </div>

              {/* Address (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold text-ink">Campus / Hostel Address (Optional)</Label>
                <Textarea 
                  id="address" 
                  placeholder="e.g. Block-B, Room 304, Campus Hostel" 
                  value={formData.address}
                  onChange={handleChange}
                  className="min-h-[70px] p-3 rounded-xl text-sm border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 resize-y"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2.5 text-status-rejected text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-xs font-semibold tracking-wide bg-accent hover:bg-[#234C40] text-white shadow-sm transition-all"
                disabled={loading}
              >
                {loading ? "Sending Verification Code..." : "Register & Receive Verification Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="p-4 bg-accent-dim border border-accent/20 rounded-2xl text-xs text-ink-muted space-y-1">
                <p>
                  Please enter the 6-digit OTP code sent to your ANITS email inbox (<strong className="text-ink">{registeredEmail}</strong>). The code is valid for 10 minutes.
                </p>
                <p className="text-[11px] text-ink-faint">
                  (In development mode, check your server console log for the dispatched OTP code).
                </p>
              </div>

              <div className="space-y-1.5 text-center">
                <Label htmlFor="otpCode" className="text-xs font-semibold text-ink block">6-Digit Verification Code</Label>
                <Input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="h-12 rounded-xl text-center text-2xl tracking-[0.5em] font-mono border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 max-w-xs mx-auto"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2.5 text-status-rejected text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-xs font-semibold tracking-wide bg-accent hover:bg-[#234C40] text-white shadow-sm transition-all"
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? "Verifying..." : "Verify Code & Activate Account"}
              </Button>

              <button
                type="button"
                onClick={() => { setStep('REGISTER'); setError(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-ink pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to registration details
              </button>
            </form>
          )}
        </CardContent>

        <CardFooter className="pt-4 pb-6 border-t border-line flex justify-center bg-paper/30">
          <p className="text-center text-xs text-ink-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-accent hover:underline underline-offset-4">
              Sign in here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;
