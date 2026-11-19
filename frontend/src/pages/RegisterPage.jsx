import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginSuccess } from '../store/authSlice';
import { registerStudent, verifyOtp } from '../lib/api';
import { setThemeCleanly } from '../lib/theme';
import { 
  cleanPhoneNumber, 
  validatePhoneNumber, 
  cleanEmail, 
  validateCollegeEmail, 
  validateUsername, 
  validateName, 
  validatePassword,
  cleanText
} from '../lib/validation';
import { Button } from "@/components/ui/button";
import { Input, FloatingInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DirectionalStepper, DirectionalStep } from "@/components/ui/directional-stepper";
import { AlertCircle, CheckCircle2, ShieldCheck, Mail, ArrowLeft, KeySquare, Moon, Sun } from "lucide-react";

const RegisterPage = () => {
  const [step, setStep] = useState('REGISTER'); // 'REGISTER' | 'VERIFY_OTP'
  const [stepDirection, setStepDirection] = useState('forward');
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
    setThemeCleanly(nextDark);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    if (id === 'phoneNumber') {
      const cleaned = cleanPhoneNumber(value);
      if (cleaned) {
        setFormData(prev => ({ ...prev, phoneNumber: cleaned }));
      }
    } else if (id === 'email') {
      setFormData(prev => ({ ...prev, email: cleanEmail(value) }));
    } else if (id === 'username' || id === 'firstName' || id === 'lastName') {
      setFormData(prev => ({ ...prev, [id]: cleanText(value) }));
    }
  };

  const validateForm = () => {
    const firstNameCheck = validateName(formData.firstName, 'First Name');
    if (!firstNameCheck.isValid) return firstNameCheck.error;

    const lastNameCheck = validateName(formData.lastName, 'Last Name');
    if (!lastNameCheck.isValid) return lastNameCheck.error;

    const usernameCheck = validateUsername(formData.username);
    if (!usernameCheck.isValid) return usernameCheck.error;

    const emailCheck = validateCollegeEmail(formData.email);
    if (!emailCheck.isValid) return emailCheck.error;

    const passwordCheck = validatePassword(formData.password, formData.confirmPassword);
    if (!passwordCheck.isValid) return passwordCheck.error;

    const phoneCheck = validatePhoneNumber(formData.phoneNumber);
    if (!phoneCheck.isValid) return phoneCheck.error;

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

    const firstNameCheck = validateName(formData.firstName, 'First Name');
    const lastNameCheck = validateName(formData.lastName, 'Last Name');
    const usernameCheck = validateUsername(formData.username);
    const emailCheck = validateCollegeEmail(formData.email);
    const phoneCheck = validatePhoneNumber(formData.phoneNumber);
    const cleanAddress = cleanText(formData.address);

    setLoading(true);
    try {
      const response = await registerStudent({
        username: usernameCheck.value,
        email: emailCheck.value,
        password: formData.password,
        firstName: firstNameCheck.value,
        lastName: lastNameCheck.value,
        phoneNumber: phoneCheck.value,
        address: cleanAddress
      });
      
      setRegisteredEmail(response.data?.email || emailCheck.value);
      setStepDirection('forward');
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

    const cleanOtp = (otpCode || '').trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp({
        email: cleanEmail(registeredEmail),
        otpCode: cleanOtp
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

        <CardContent className="p-6 sm:p-8">
          <DirectionalStepper currentStep={step} direction={stepDirection}>
            <DirectionalStep step="REGISTER">
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
                <FloatingInput 
                  id="firstName" 
                  name="firstName"
                  label="First Name *"
                  placeholder=" "
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <FloatingInput 
                  id="lastName" 
                  name="lastName"
                  label="Last Name *"
                  placeholder=" "
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
              </div>

              {/* Username & College Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingInput 
                  id="username" 
                  name="username"
                  label="Student Roll Number (ID) *"
                  placeholder=" "
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <FloatingInput 
                  id="email" 
                  name="email"
                  type="email" 
                  label="ANITS College Email *"
                  placeholder=" "
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingInput 
                  id="password" 
                  name="password"
                  type="password" 
                  label="Password *"
                  placeholder=" "
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <FloatingInput 
                  id="confirmPassword" 
                  name="confirmPassword"
                  type="password" 
                  label="Confirm Password *"
                  placeholder=" "
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Contact */}
              <FloatingInput 
                id="phoneNumber" 
                name="phoneNumber"
                label="Mobile Number (10 digits) *"
                placeholder=" "
                value={formData.phoneNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />

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
          </DirectionalStep>
          <DirectionalStep step="VERIFY_OTP">
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="p-4 bg-accent-dim border border-accent/20 rounded-2xl text-xs text-neutral-800 dark:text-neutral-900 space-y-1">
                <p>
                  Please enter the 6-digit OTP code sent to your ANITS email inbox (<strong className="text-black font-bold">{registeredEmail}</strong>). The code is valid for 10 minutes.
                </p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-700">
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
                  error={Boolean(error)}
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
                onClick={() => { setStepDirection('backward'); setStep('REGISTER'); setError(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-ink pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to registration details
              </button>
            </form>
          </DirectionalStep>
        </DirectionalStepper>
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
