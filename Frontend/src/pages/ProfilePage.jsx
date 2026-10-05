import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  KeyRound,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  GraduationCap,
  Clock,
  FileText,
  CheckCircle,
  ArrowRight,
  Plus,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { getCurrentProfile, updateProfile, changePassword, getMyGrievances } from '../lib/api';
import { updateUser } from '../store/authSlice';

const statusConfig = {
  PENDING: { label: 'Pending Review', dot: 'bg-[#B8862E]', badge: 'border-[#B8862E]/30 bg-[#B8862E]/10 text-[#B8862E]' },
  ASSIGNED: { label: 'Assigned', dot: 'bg-[#2B5D4F]', badge: 'border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F]' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-[#2B5D4F]', badge: 'border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F]' },
  RESOLVED: { label: 'Resolved', dot: 'bg-[#3F6B4A]', badge: 'border-[#3F6B4A]/30 bg-[#3F6B4A]/10 text-[#3F6B4A]' },
  REJECTED: { label: 'Rejected', dot: 'bg-[#9B4A3F]', badge: 'border-[#9B4A3F]/30 bg-[#9B4A3F]/10 text-[#9B4A3F]' },
  CLOSED_BY_USER: { label: 'Closed', dot: 'bg-[#8C827A]', badge: 'border-[#E4E0D8] bg-[#FAF9F6] text-ink-muted' }
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  if (Array.isArray(date)) {
    return new Date(date[0], date[1] - 1, date[2], date[3] || 0, date[4] || 0).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

const formatMonthYear = (date) => {
  if (!date) return 'Joined Recently';
  if (Array.isArray(date)) {
    return new Date(date[0], date[1] - 1, date[2]).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric'
    });
  }
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'Joined Recently' : d.toLocaleDateString('en-US', {
    month: 'long', year: 'numeric'
  });
};

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'edit' | 'security'
  const [profileData, setProfileData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    role: '',
    departmentName: '',
    departmentId: null,
    createdAt: null,
    isActive: true
  });

  const [grievances, setGrievances] = useState([]);
  const [loadingGrievances, setLoadingGrievances] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchUserGrievances();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getCurrentProfile();
      const data = response.data;
      setProfileData({
        username: data.username || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phoneNumber: data.phone || '',
        address: data.address || '',
        role: data.role || authUser?.role || 'STUDENT',
        departmentName: data.departmentName || '',
        departmentId: data.departmentId || null,
        createdAt: data.createdAt || null,
        isActive: data.isActive !== undefined ? data.isActive : true
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchUserGrievances = async () => {
    try {
      setLoadingGrievances(true);
      const res = await getMyGrievances();
      setGrievances(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching user grievances:", error);
    } finally {
      setLoadingGrievances(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const onUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phoneNumber: profileData.phoneNumber,
        address: profileData.address
      });
      dispatch(updateUser(response.data));
      setMessage({ type: 'success', text: 'Personal details updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update profile. Please check your inputs.'
      });
    } finally {
      setLoading(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      await changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordMessage({ type: 'success', text: 'Password successfully updated!' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to change password. Please verify your current password.'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Metrics calculation
  const totalGrievances = grievances.length;
  const inProgressCount = grievances.filter(g => g.status === 'IN_PROGRESS' || g.status === 'ASSIGNED').length;
  const resolvedCount = grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED_BY_USER').length;
  const pendingCount = grievances.filter(g => g.status === 'PENDING').length;

  const initials = `${profileData.firstName?.charAt(0) || ''}${profileData.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-paper py-8 px-4 sm:px-6 lg:px-8 selection:bg-accent/20">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header / Identity Banner */}
        <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Identity badge & avatar info */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-accent-dim border-2 border-accent/20 flex items-center justify-center text-accent text-2xl sm:text-3xl font-serif font-bold shadow-xs shrink-0">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-surface text-accent p-1.5 rounded-xl shadow-xs border border-line">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono border border-line bg-paper text-ink rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#3F6B4A]" />
                    <span className="font-semibold">{profileData.role || 'STUDENT'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-muted bg-paper px-2.5 py-1 rounded-full border border-line">
                    <Calendar className="w-3 h-3 text-accent" />
                    Enrolled {formatMonthYear(profileData.createdAt)}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink tracking-tight">
                  {profileData.firstName || profileData.lastName
                    ? `${profileData.firstName} ${profileData.lastName}`
                    : profileData.username || 'Campus Member'}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-accent" />
                    Roll / ID: <span className="font-semibold text-ink">{profileData.username || authUser?.username || '—'}</span>
                  </span>
                  <span className="hidden sm:inline text-line">•</span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-accent" />
                    {profileData.departmentName || 'General Campus'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
              <Button
                onClick={() => navigate('/grievances/new')}
                className="h-11 px-5 rounded-xl bg-accent hover:bg-[#234C40] text-white font-mono text-xs font-semibold shadow-xs flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Lodge Grievance
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 p-1.5 bg-surface border border-line rounded-2xl w-full sm:w-fit overflow-x-auto shadow-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'bg-accent text-white shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <Activity className="w-4 h-4" />
            Overview & Activity
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 ${
              activeTab === 'edit'
                ? 'bg-accent text-white shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <User className="w-4 h-4" />
            Edit Profile
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 ${
              activeTab === 'security'
                ? 'bg-accent text-white shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Security & Password
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ACTIVITY */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-surface border border-line shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                  <span>Total Submitted</span>
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <div className="text-3xl font-serif font-bold text-ink">
                  {loadingGrievances ? '—' : totalGrievances}
                </div>
                <p className="text-[11px] text-ink-muted font-mono">All grievances lodged to date</p>
              </div>

              <div className="p-5 rounded-3xl bg-surface border border-line shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[#B8862E]">
                  <span>Under Review</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-3xl font-serif font-bold text-ink">
                  {loadingGrievances ? '—' : pendingCount}
                </div>
                <p className="text-[11px] text-ink-muted font-mono">Pending committee triage</p>
              </div>

              <div className="p-5 rounded-3xl bg-surface border border-line shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-accent">
                  <span>In Progress</span>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-3xl font-serif font-bold text-ink">
                  {loadingGrievances ? '—' : inProgressCount}
                </div>
                <p className="text-[11px] text-ink-muted font-mono">Under active investigation</p>
              </div>

              <div className="p-5 rounded-3xl bg-surface border border-line shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[#3F6B4A]">
                  <span>Resolved Cases</span>
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="text-3xl font-serif font-bold text-ink">
                  {loadingGrievances ? '—' : resolvedCount}
                </div>
                <p className="text-[11px] text-ink-muted font-mono">Settled with formal resolution</p>
              </div>
            </div>

            {/* Split Grid: Academic Credentials & Recent Grievances */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT: Academic & Institutional Credentials Card */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border border-line bg-surface rounded-3xl overflow-hidden shadow-xs">
                  <div className="h-2 bg-[#2B5D4F]" />
                  <CardHeader className="p-6 pb-4 border-b border-line">
                    <CardTitle className="text-base font-serif font-bold text-ink flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-accent" />
                      Academic Credentials
                    </CardTitle>
                    <CardDescription className="text-xs text-ink-muted">
                      Institutional directory record synchronized with ANITS database.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 space-y-3.5">
                    <div className="p-3.5 rounded-2xl bg-paper border border-line">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-medium">Department / Branch</p>
                      <p className="text-xs font-semibold text-ink mt-0.5">{profileData.departmentName || 'General Campus / Undefined'}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-paper border border-line">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-medium">Student / Faculty Roll ID</p>
                      <p className="text-xs font-semibold text-ink font-mono mt-0.5">{profileData.username || authUser?.username || '—'}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-paper border border-line">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-medium">Official College Email</p>
                      <p className="text-xs font-semibold text-ink truncate mt-0.5">{profileData.email || '—'}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-paper border border-line">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-medium">Primary Contact Phone</p>
                      <p className="text-xs font-semibold text-ink mt-0.5">{profileData.phoneNumber || 'Not provided'}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-paper border border-line">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-medium">Campus / Hostel Address</p>
                      <p className="text-xs text-ink mt-0.5 leading-relaxed">{profileData.address || 'No campus address on file.'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Institutional Security Notice */}
                <div className="p-5 rounded-3xl border border-line bg-surface shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-ink">
                    <ShieldCheck className="h-4 w-4 text-accent" /> Institutional Security
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Account authentication is protected via college Active Directory. You can update your contact phone or address anytime in the Edit Profile tab.
                  </p>
                </div>
              </div>

              {/* RIGHT: Recent Grievances Log */}
              <div className="lg:col-span-8 space-y-6">
                <Card className="border border-line bg-surface rounded-3xl overflow-hidden shadow-xs">
                  <CardHeader className="p-6 pb-4 border-b border-line flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-serif font-bold text-ink flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent" />
                        Recent Grievance History
                      </CardTitle>
                      <CardDescription className="text-xs text-ink-muted">
                        Latest grievances submitted from this account.
                      </CardDescription>
                    </div>
                    {grievances.length > 0 && (
                      <Button
                        variant="ghost"
                        onClick={() => navigate('/grievances')}
                        className="text-xs font-mono text-accent hover:text-accent hover:bg-accent-dim rounded-xl h-8 px-3"
                      >
                        View All ({grievances.length}) →
                      </Button>
                    )}
                  </CardHeader>

                  <CardContent className="p-6">
                    {loadingGrievances ? (
                      <div className="flex flex-col items-center justify-center py-12 text-ink-muted space-y-3">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        <span className="text-xs font-mono">Loading grievance records...</span>
                      </div>
                    ) : grievances.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent-dim text-accent flex items-center justify-center mx-auto">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-serif font-bold text-ink">No Grievances Lodged Yet</h3>
                          <p className="text-xs text-ink-muted max-w-sm mx-auto">
                            You currently have zero active or past grievances recorded in the ANITS Redressal Portal.
                          </p>
                        </div>
                        <Button
                          onClick={() => navigate('/grievances/new')}
                          className="h-10 px-4 rounded-xl bg-accent hover:bg-[#234C40] text-white font-mono text-xs font-semibold shadow-xs inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Lodge Your First Grievance
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {grievances.slice(0, 5).map((item) => {
                          const status = statusConfig[item.status] || {
                            label: item.status,
                            dot: 'bg-muted-foreground',
                            badge: 'border-border bg-muted text-muted-foreground'
                          };
                          return (
                            <div
                              key={item.id}
                              onClick={() => navigate(`/grievances/${item.id}`)}
                              className="group p-4 rounded-2xl bg-paper hover:bg-[#F2EFE9] border border-line transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-mono font-semibold text-accent">
                                    #{item.ticketNumber || item.id}
                                  </span>
                                  <span className="text-xs text-line">•</span>
                                  <span className="text-xs font-mono text-ink-muted">
                                    {item.departmentName || 'General'}
                                  </span>
                                  <span className="text-xs text-line">•</span>
                                  <span className="text-[11px] font-mono text-ink-muted">
                                    {formatDate(item.createdAt)}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate">
                                  {item.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${status.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                  {status.label}
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-surface border border-line flex items-center justify-center text-ink-muted group-hover:text-accent group-hover:border-accent transition-all">
                                  <ArrowRight className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EDIT PROFILE */}
        {activeTab === 'edit' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Academic Metadata Box */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border border-line bg-surface rounded-3xl overflow-hidden shadow-xs">
                <div className="h-2 bg-[#2B5D4F]" />
                <CardHeader className="p-6 pb-4 border-b border-line">
                  <CardTitle className="text-base font-serif font-bold text-ink flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-accent" />
                    Institutional Record
                  </CardTitle>
                  <CardDescription className="text-xs text-ink-muted">
                    These parameters are issued by the university administration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-paper border border-line">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-medium">Assigned Department</p>
                    <p className="text-xs font-semibold text-ink mt-0.5">{profileData.departmentName || 'General Campus'}</p>
                    <p className="text-[10px] text-ink-muted mt-1 font-mono">Contact registrar to modify branch assignment.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-paper border border-line">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-medium">Roll Number / Staff ID</p>
                    <p className="text-xs font-semibold text-ink font-mono mt-0.5">{profileData.username || authUser?.username || '—'}</p>
                    <p className="text-[10px] text-ink-muted mt-1 font-mono">Immutable institutional identity.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-paper border border-line">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-medium">Account Access Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-[#3F6B4A]" />
                      <span className="text-xs font-semibold text-ink">Active & Verified</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Editable Profile Form */}
            <div className="lg:col-span-8">
              <Card className="border border-line bg-surface rounded-3xl overflow-hidden shadow-xs">
                <CardHeader className="p-6 sm:p-8 pb-4 border-b border-line">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-accent-dim flex items-center justify-center text-accent">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-serif font-bold text-ink">Personal Information</CardTitle>
                      <CardDescription className="text-xs text-ink-muted">
                        Update your contact coordinates to ensure you receive timely notifications.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <form onSubmit={onUpdateProfile}>
                  <CardContent className="p-6 sm:p-8 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-xs font-semibold text-ink">
                          First Name <span className="text-status-rejected">*</span>
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={profileData.firstName}
                          onChange={handleProfileChange}
                          className="h-11 px-4 rounded-xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-xs font-semibold text-ink">
                          Last Name <span className="text-status-rejected">*</span>
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={profileData.lastName}
                          onChange={handleProfileChange}
                          className="h-11 px-4 rounded-xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold text-ink">
                          College Email <span className="text-status-rejected">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={profileData.email}
                            onChange={handleProfileChange}
                            className="pl-10 h-11 rounded-xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phoneNumber" className="text-xs font-semibold text-ink">
                          Mobile Phone Number
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            value={profileData.phoneNumber}
                            onChange={handleProfileChange}
                            placeholder="10-digit number"
                            className="pl-10 h-11 rounded-xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-xs font-semibold text-ink">
                        Campus or Residential Address
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
                        <Textarea
                          id="address"
                          name="address"
                          value={profileData.address}
                          onChange={handleProfileChange}
                          className="pl-10 min-h-[90px] p-3 rounded-2xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm resize-y leading-relaxed"
                          placeholder="Hostel block, room number, or local address..."
                        />
                      </div>
                    </div>

                    {message.text && (
                      <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-mono ${
                        message.type === 'success'
                          ? 'bg-accent-dim text-accent border border-accent/20'
                          : 'bg-status-rejected/10 text-status-rejected border border-status-rejected/20'
                      }`}>
                        {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        <span>{message.text}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="px-6 sm:px-8 pb-6 pt-4 flex justify-end border-t border-line">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 px-6 bg-accent hover:bg-[#234C40] text-white font-mono text-xs font-semibold tracking-wide rounded-xl shadow-xs transition-all"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY & PASSWORD */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Security Advice */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border border-line bg-surface rounded-3xl overflow-hidden shadow-xs">
                <div className="h-2 bg-[#B8862E]" />
                <CardHeader className="p-6 pb-4 border-b border-line">
                  <CardTitle className="text-base font-serif font-bold text-ink flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#B8862E]" />
                    Password Requirements
                  </CardTitle>
                  <CardDescription className="text-xs text-ink-muted">
                    ANITS Information Security Policy guidelines.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-ink">
                    <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>Minimum of 8 characters in length</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-ink">
                    <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>Mix of uppercase, lowercase letters and numbers</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-ink">
                    <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>Never share credentials with other students or staff</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-ink">
                    <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>Passwords expire every 180 days per college policy</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Password Change Form */}
            <div className="lg:col-span-8">
              <Card className="border border-line bg-surface rounded-3xl overflow-hidden shadow-xs">
                <CardHeader className="p-6 sm:p-8 pb-4 border-b border-line">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#B8862E]/10 text-[#B8862E] flex items-center justify-center">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-serif font-bold text-ink">Change Portal Password</CardTitle>
                      <CardDescription className="text-xs text-ink-muted">
                        Update your authentication passphrase to protect your grievance records.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <form onSubmit={onChangePassword}>
                  <CardContent className="p-6 sm:p-8 space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="oldPassword" className="text-xs font-semibold text-ink">
                        Current Password <span className="text-status-rejected">*</span>
                      </Label>
                      <Input
                        id="oldPassword"
                        name="oldPassword"
                        type="password"
                        placeholder="Enter your current active password"
                        value={passwordData.oldPassword}
                        onChange={handlePasswordChange}
                        className="h-11 px-4 rounded-xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="newPassword" className="text-xs font-semibold text-ink">
                          New Password <span className="text-status-rejected">*</span>
                        </Label>
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          placeholder="Min 8 characters"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="h-11 px-4 rounded-xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-xs font-semibold text-ink">
                          Confirm New Password <span className="text-status-rejected">*</span>
                        </Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="Repeat new password"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="h-11 px-4 rounded-xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm"
                          required
                        />
                      </div>
                    </div>

                    {passwordMessage.text && (
                      <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-mono ${
                        passwordMessage.type === 'success'
                          ? 'bg-accent-dim text-accent border border-accent/20'
                          : 'bg-status-rejected/10 text-status-rejected border border-status-rejected/20'
                      }`}>
                        {passwordMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        <span>{passwordMessage.text}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="px-6 sm:px-8 pb-6 pt-4 flex justify-end border-t border-line">
                    <Button
                      type="submit"
                      disabled={passwordLoading}
                      className="h-11 px-6 bg-accent hover:bg-[#234C40] text-white font-mono text-xs font-semibold tracking-wide rounded-xl shadow-xs transition-all"
                    >
                      {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="mr-2 h-4 w-4" />}
                      Update Password
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfilePage;
