import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/authSlice';
import { acceptStaffInvite } from '../lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ShieldAlert, KeyRound } from "lucide-react";

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing staff invitation token. Please check your invitation link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing invitation token.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await acceptStaffInvite({ token, password });
      const { token: jwtToken, user } = response.data;
      setSuccess(true);
      setTimeout(() => {
        dispatch(loginSuccess({ token: jwtToken, user }));
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || 'Failed to activate staff account. Link may have expired.';
      setError(typeof errMsg === 'string' ? errMsg : 'Failed to activate account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4 relative selection:bg-accent/20">
      <Card className="w-full max-w-md border border-line bg-paper-light shadow-sm rounded-lg">
        <CardHeader className="space-y-2 text-center pb-4 border-b border-line">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center text-accent">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif text-ink tracking-tight">Staff Account Activation</CardTitle>
          <CardDescription className="text-sm text-ink-muted">
            ANITS Campus Grievance Redressal System
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {success ? (
            <div className="p-4 rounded-md bg-accent-subtle border border-accent/20 flex flex-col items-center text-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-accent" />
              <h3 className="font-semibold text-ink">Account Activated!</h3>
              <p className="text-xs text-ink-muted">Redirecting you to your staff workspace...</p>
            </div>
          ) : !token ? (
            <div className="p-4 rounded-md bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2 text-status-rejected text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <p>Invalid link. Please contact the ANITS grievance administrator for an invitation link.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-ink-muted leading-relaxed">
                You have been invited to join the ANITS Grievance Redressal team. Please set a secure password to activate your staff credentials.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-ink">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 text-sm border-line bg-paper-light focus:border-accent focus:ring-accent"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-ink">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 text-sm border-line bg-paper-light focus:border-accent focus:ring-accent"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-md bg-status-rejected/10 border border-status-rejected/20 flex items-center gap-2 text-status-rejected text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
                disabled={loading}
              >
                {loading ? "Activating..." : "Set Password & Access Portal"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-6 border-t border-line flex justify-center">
          <Link to="/login" className="text-xs text-ink-muted hover:text-accent underline underline-offset-4">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AcceptInvitePage;
