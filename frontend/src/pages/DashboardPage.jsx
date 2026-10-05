import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    AlertCircle,
    AlertTriangle,
    ArrowDown,
    ArrowRight,
    ArrowUp,
    ArrowUpDown,
    Bell,
    Building2,
    CheckCircle2,
    Clock,
    Ghost,
    MoreHorizontal,
    Plus,
    Search,
    ThumbsUp,
    TrendingUp,
    UserCheck,
    Users,
    X
} from "lucide-react";
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis
} from 'recharts';
import { toast } from "sonner";
import api from '../lib/api';
import { getOfficerName } from '../lib/privacy';
import { InviteStaffDialog } from '../components/admin/InviteStaffDialog';
import AdminDepartmentsDialog from '../components/AdminDepartmentsDialog';
import AdminUsersDialog from '../components/AdminUsersDialog';

const DashboardPage = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({ 
    totalGrievances: 0, 
    resolvedGrievances: 0, 
    pendingGrievances: 0, 
    inProgressGrievances: 0 
  });
  const [recentGrievances, setRecentGrievances] = useState([]);
  const [allGrievances, setAllGrievances] = useState([]);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [sortField, setSortField] = useState(null); // 'date' or 'priority'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [selectedGrievanceIds, setSelectedGrievanceIds] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [activeQuickViewGrievance, setActiveQuickViewGrievance] = useState(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState("");
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  
  // Real-time Notification simulation
  useEffect(() => {
    if (!loading && recentGrievances.length > 0) {
      const timer = setTimeout(() => {
        toast.info(`System Update: Data Synchronized`, {
          description: `Active records refreshed successfully at ${new Date().toLocaleTimeString()}`,
          icon: <Bell className="w-4 h-4 text-[#2B5D4F]" />
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, recentGrievances.length]);
  
  const parseDate = (date) => {
    if (Array.isArray(date)) {
      return new Date(date[0], date[1] - 1, date[2], date[3] || 0, date[4] || 0, date[5] || 0);
    }
    return new Date(date);
  };

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (isAdmin) {
          const [statsRes, grievancesRes, officersRes] = await Promise.all([
            api.get('/dashboard/admin'),
            api.get('/grievances?page=0&size=50'),
            api.get('/grievances/officers')
          ]);
          setStats(statsRes.data);
          const grievances = grievancesRes.data?.content || grievancesRes.data || [];
          setAllGrievances(grievances);
          setRecentGrievances(grievances.slice(0, 5));
          setOfficers(officersRes.data || []);
        } else {
          const grievancesRes = await api.get('/grievances/my?page=0&size=50');
          const myGrievances = grievancesRes.data?.content || grievancesRes.data || [];
          setAllGrievances(myGrievances);
          setRecentGrievances(myGrievances.slice(0, 5));
          
          const total = myGrievances.length;
          const resolved = myGrievances.filter(g => g.status === 'RESOLVED').length;
          const pending = myGrievances.filter(g => g.status === 'PENDING').length;
          const inProgress = myGrievances.filter(g => g.status === 'IN_PROGRESS' || g.status === 'ASSIGNED').length;
          
          setStats({
            totalGrievances: total,
            resolvedGrievances: resolved,
            pendingGrievances: pending,
            inProgressGrievances: inProgress
          });
        }
      } catch (err) {
        toast.error("Failed to load dashboard data", {
          description: err.response?.data?.message || err.message
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, refreshKey]);

  // SLA Calculation: Tickets pending > 48h
  const escalatedCount = useMemo(() => {
    if (isAdmin && stats.escalatedGrievances !== undefined) {
      return stats.escalatedGrievances;
    }
    const now = new Date().getTime();
    return allGrievances.filter(g => {
      if (g.status === 'RESOLVED' || g.status === 'REJECTED') return false;
      const created = parseDate(g.createdAt).getTime();
      return (now - created) > (48 * 60 * 60 * 1000);
    }).length;
  }, [allGrievances, isAdmin, stats.escalatedGrievances]);

  // Unassigned Pending Count
  const unassignedPendingCount = useMemo(() => {
    if (isAdmin && stats.unassignedGrievances !== undefined) {
      return stats.unassignedGrievances;
    }
    return allGrievances.filter(g => g.status === 'PENDING' && !g.assignedOfficerId).length;
  }, [allGrievances, isAdmin, stats.unassignedGrievances]);

  // Filtering & Sorting
  const processedGrievances = useMemo(() => {
    let result = [...recentGrievances];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(g => 
        g.title?.toLowerCase().includes(term) ||
        g.departmentName?.toLowerCase().includes(term) ||
        g.status?.toLowerCase().includes(term) ||
        g.id?.toString().includes(term)
      );
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        if (sortField === 'date') {
          const dateA = parseDate(a.createdAt).getTime();
          const dateB = parseDate(b.createdAt).getTime();
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (sortField === 'priority') {
          const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          const weightA = priorityWeight[a.priority] || 0;
          const weightB = priorityWeight[b.priority] || 0;
          return sortDirection === 'asc' ? weightA - weightB : weightB - weightA;
        }
        return 0;
      });
    }

    return result;
  }, [recentGrievances, searchTerm, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/60 ml-1 inline" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-[#2B5D4F] ml-1 inline" />
      : <ArrowDown className="w-3 h-3 text-[#2B5D4F] ml-1 inline" />;
  };

  // Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedGrievanceIds(processedGrievances.map(g => g.id));
    } else {
      setSelectedGrievanceIds([]);
    }
  };

  const handleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedGrievanceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = processedGrievances.length > 0 && selectedGrievanceIds.length === processedGrievances.length;

  // Single Upvote Handler
  const handleToggleUpvote = async (grievanceId) => {
    try {
      const response = await api.post(`/grievances/${grievanceId}/upvote`);
      const { upvoteCount, hasUpvoted } = response.data;
      
      setRecentGrievances(prev => prev.map(g => 
        g.id === grievanceId ? { ...g, upvoteCount, hasUpvoted } : g
      ));
      
      toast.success(hasUpvoted ? "Grievance upvoted" : "Upvote removed");
    } catch (err) {
      toast.error("Failed to update upvote", { description: err.response?.data?.message || err.message });
    }
  };

  // Quick View Drawer Action: Assign Officer
  const handleAssignOfficerFromDrawer = async () => {
    if (!activeQuickViewGrievance || !selectedAssigneeId) return;
    try {
      setLoading(true);
      await api.put(`/grievances/${activeQuickViewGrievance.id}/assign?officerId=${selectedAssigneeId}`);
      toast.success("Officer Assigned Successfully", {
        description: `Ticket #GRV-${String(activeQuickViewGrievance.id).padStart(4, '0')} has been assigned.`
      });
      setActiveQuickViewGrievance(null);
      setSelectedAssigneeId("");
      setRefreshKey(Date.now());
    } catch (err) {
      toast.error("Failed to assign officer", { description: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  // Table Row Dropdown Action: Assign Officer
  const handleAssignOfficerFromTable = async (grievanceId, officerId) => {
    try {
      await api.put(`/grievances/${grievanceId}/assign?officerId=${officerId}`);
      toast.success("Officer Assigned", {
        description: `Grievance #${grievanceId} updated.`
      });
      setRefreshKey(Date.now());
    } catch (err) {
      toast.error("Assignment Failed", { description: err.response?.data?.message || err.message });
    }
  };

  // Table Row Dropdown Action: Delete
  const handleDeleteGrievanceFromTable = async (grievanceId) => {
    if (!window.confirm("Are you sure you want to delete this grievance? This action cannot be undone.")) return;
    try {
      await api.delete(`/grievances/${grievanceId}`);
      toast.success("Grievance Deleted", { description: `Ticket #${grievanceId} removed permanently.` });
      setRefreshKey(Date.now());
    } catch (err) {
      toast.error("Delete Failed", { description: err.response?.data?.message || err.message });
    }
  };

  // Officers filtered for selected grievance department
  const displayOfficers = useMemo(() => {
    if (!activeQuickViewGrievance) return officers;
    const deptMatch = officers.filter(o => o.departmentName === activeQuickViewGrievance.departmentName);
    return deptMatch.length > 0 ? deptMatch : officers;
  }, [officers, activeQuickViewGrievance]);

  // Department Workload Data
  const departmentWorkloadData = useMemo(() => {
    const campusPalette = ['#2B5D4F', '#B8862E', '#3F6B4A', '#8C827A', '#9B4A3F', '#4A6B82'];
    if (isAdmin && stats.departmentStats) {
      return Object.values(stats.departmentStats)
        .map((dept, i) => ({
          name: dept.departmentName,
          active: dept.activeGrievanceCount || 0,
          fill: campusPalette[i % campusPalette.length]
        }))
        .sort((a, b) => b.active - a.active);
    }
    const activeStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS'];
    const counts = {};
    allGrievances.forEach(g => {
      if (activeStatuses.includes(g.status) && g.departmentName) {
        counts[g.departmentName] = (counts[g.departmentName] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, active], i) => ({ name, active, fill: campusPalette[i % campusPalette.length] }))
      .sort((a, b) => b.active - a.active);
  }, [isAdmin, stats.departmentStats, allGrievances]);

  // Resolution Trend Data
  const resolutionTrendData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (isAdmin && stats.dailyTrends) {
      const created = stats.dailyTrends || {};
      const resolved = stats.dailyResolvedTrends || {};
      return Object.keys(created).map(day => {
        const d = new Date(day + 'T00:00:00');
        return {
          day: dayNames[d.getDay()],
          created: created[day] || 0,
          resolved: resolved[day] || 0,
        };
      });
    }
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({ date: d, label: dayNames[d.getDay()] });
    }
    return days.map(({ date, label }) => {
      const dayStart = date.getTime();
      const dayEnd = dayStart + 86400000;
      const createdCount = allGrievances.filter(g => {
        const t = parseDate(g.createdAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      const resolvedCount = allGrievances.filter(g => {
        if (g.status !== 'RESOLVED') return false;
        const t = parseDate(g.updatedAt || g.createdAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      return { day: label, created: createdCount, resolved: resolvedCount };
    });
  }, [isAdmin, stats.dailyTrends, stats.dailyResolvedTrends, allGrievances]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[#1A1D20]/95 backdrop-blur-md border border-[#E4E0D8] dark:border-[#2A2E33] p-3 rounded-2xl shadow-xl space-y-1.5 font-sans">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-xs font-mono font-bold text-foreground">
                {item.value} <span className="text-[11px] text-muted-foreground font-normal font-sans">
                  {item.name === 'created' ? 'Tickets Logged' : item.name === 'resolved' ? 'Tickets Resolved' : 'Active Cases'}
                </span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-[#B8862E]/30 bg-[#B8862E]/10 text-[#B8862E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8862E]" />
            Pending
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2B5D4F]" />
            Assigned
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2B5D4F]" />
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-[#3F6B4A]/30 bg-[#3F6B4A]/10 text-[#3F6B4A] dark:text-[#88C096]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A]" />
            Resolved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-[#9B4A3F]/30 bg-[#9B4A3F]/10 text-[#9B4A3F] dark:text-[#E07A6E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9B4A3F]" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-border bg-muted/40 text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8C827A]" />
            {status?.replace('_', ' ') || 'Unknown'}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    const map = {
      HIGH: { dot: 'bg-[#9B4A3F]', border: 'border-[#9B4A3F]/30 bg-[#9B4A3F]/10 text-[#9B4A3F] dark:text-[#E07A6E]' },
      MEDIUM: { dot: 'bg-[#B8862E]', border: 'border-[#B8862E]/30 bg-[#B8862E]/10 text-[#B8862E]' },
      LOW: { dot: 'bg-[#2B5D4F]', border: 'border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]' }
    };
    const current = map[priority] || { dot: 'bg-[#8C827A]', border: 'border-border text-muted-foreground' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${current.border}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
        {priority}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#121517] text-[#1C2024] dark:text-[#FAF9F6] pb-24 transition-colors">
      <main className="container max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#E4E0D8] dark:border-[#2A2E33] pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-medium border border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]">
                Campus Redressal Node
              </span>
              <div className="h-3 w-[1px] bg-[#E4E0D8] dark:bg-[#2A2E33] mx-1" />
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium uppercase tracking-wider text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A]" />
                System Active
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] tracking-tight">
              Welcome back, {user?.firstName || 'User'}!
            </h1>
            <p className="text-sm text-muted-foreground font-sans max-w-xl">
              Your campus grievance console is synchronized. You have{' '}
              <strong className="text-foreground font-mono">{(stats?.pendingGrievances || 0) + (stats?.inProgressGrievances || 0)} active cases</strong>{' '}
              requiring follow-up.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setUsersDialogOpen(true)}
                  className="h-10 px-4 gap-2 border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] hover:bg-[#FAF9F6] dark:hover:bg-[#202428] text-[#1C2024] dark:text-[#FAF9F6] shadow-sm font-mono text-xs font-medium rounded-xl"
                >
                  <Users className="w-4 h-4 text-[#2B5D4F] dark:text-[#7EB5A6]" />
                  <span>Staff & Users</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setDeptDialogOpen(true)}
                  className="h-10 px-4 gap-2 border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] hover:bg-[#FAF9F6] dark:hover:bg-[#202428] text-[#1C2024] dark:text-[#FAF9F6] shadow-sm font-mono text-xs font-medium rounded-xl"
                >
                  <Building2 className="w-4 h-4 text-[#2B5D4F] dark:text-[#7EB5A6]" />
                  <span>Departments</span>
                </Button>
                <InviteStaffDialog onInviteSuccess={() => setRefreshKey(Date.now())} />
                <AdminDepartmentsDialog
                  isOpen={deptDialogOpen}
                  onClose={() => setDeptDialogOpen(false)}
                  onDepartmentUpdated={() => setRefreshKey(Date.now())}
                />
                <AdminUsersDialog
                  isOpen={usersDialogOpen}
                  onClose={() => setUsersDialogOpen(false)}
                  onUserUpdated={() => setRefreshKey(Date.now())}
                />
              </>
            )}
            <Button 
              className="h-10 px-5 gap-2 bg-[#2B5D4F] hover:bg-[#234A3F] text-white shadow-sm font-mono text-xs font-medium rounded-xl transition-all"
              onClick={() => navigate(isAdmin ? '/recent-grievances' : '/grievances/new')}
            >
              {isAdmin ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>
                {isAdmin ? 'Assign Pending Tickets' : 'Register New Grievance'}
              </span>
            </Button>
          </div>
        </header>

        {/* SLA Breach Alert Banner */}
        {isAdmin && escalatedCount > 0 && !alertDismissed && (
          <Alert className="rounded-2xl border border-[#9B4A3F]/30 bg-[#9B4A3F]/10 text-[#9B4A3F] flex items-start gap-3 p-4 relative animate-in fade-in duration-300">
            <AlertTriangle className="h-5 w-5 text-[#9B4A3F] shrink-0 mt-0.5" />
            <div className="flex-1">
              <AlertTitle className="text-xs font-mono font-bold uppercase tracking-wider text-[#9B4A3F]">
                SLA Breached Tickets Warning
              </AlertTitle>
              <AlertDescription className="text-xs text-foreground/90 font-sans mt-0.5">
                There are <span className="font-mono font-bold underline">{escalatedCount} ticket{escalatedCount > 1 ? 's' : ''}</span> exceeding the 48-hour institutional resolution deadline. Immediate officer assignment is advised.
              </AlertDescription>
            </div>
            <button 
              onClick={() => setAlertDismissed(true)} 
              className="p-1 rounded-lg hover:bg-[#9B4A3F]/20 text-[#9B4A3F] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        )}

        {/* Stats Cards (4 KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Escalated */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#9B4A3F]/40 transition-all duration-300">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Escalated Cases</span>
              <div className="p-2.5 rounded-xl bg-[#9B4A3F]/10 text-[#9B4A3F]">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-mono font-bold tracking-tight text-[#9B4A3F]">{escalatedCount}</div>
              {isAdmin && escalatedCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#9B4A3F]/10 text-[#9B4A3F] border border-[#9B4A3F]/20">
                  Critical
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-sans mt-2">Overdue (&gt;48h window)</p>
          </div>

          {/* Card 2: Resolved */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#3F6B4A]/40 transition-all duration-300">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Resolved</span>
              <div className="p-2.5 rounded-xl bg-[#3F6B4A]/10 text-[#3F6B4A]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-mono font-bold tracking-tight text-[#3F6B4A] dark:text-[#88C096]">{stats.resolvedGrievances || 0}</div>
              {isAdmin && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3F6B4A]/10 text-[#3F6B4A] dark:text-[#88C096] border border-[#3F6B4A]/20 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Closed
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-sans mt-2">Successfully addressed</p>
          </div>

          {/* Card 3: In Progress */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#2B5D4F]/40 transition-all duration-300">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">In Progress</span>
              <div className="p-2.5 rounded-xl bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-mono font-bold tracking-tight text-[#2B5D4F] dark:text-[#7EB5A6]">{stats.inProgressGrievances || 0}</div>
              {isAdmin && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6] border border-[#2B5D4F]/20">
                  Active
                </span>
              )}
            </div>
            <div className="mt-3">
              <Progress value={stats.totalGrievances ? (stats.inProgressGrievances / stats.totalGrievances) * 100 : 0} className="h-1.5 rounded-full bg-[#E4E0D8]/60 dark:bg-[#202428]" />
            </div>
          </div>

          {/* Card 4: Pending */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#B8862E]/40 transition-all duration-300">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Pending</span>
              <div className="p-2.5 rounded-xl bg-[#B8862E]/10 text-[#B8862E]">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-mono font-bold tracking-tight text-[#B8862E]">{stats.pendingGrievances || 0}</div>
              {isAdmin && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#B8862E]/10 text-[#B8862E] border border-[#B8862E]/20">
                  {unassignedPendingCount} Unclaimed
                </span>
              )}
            </div>
            <div className="mt-3">
              <Progress value={stats.totalGrievances ? (stats.pendingGrievances / stats.totalGrievances) * 100 : 0} className="h-1.5 rounded-full bg-[#E4E0D8]/60 dark:bg-[#202428]" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Department Workload */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-[#E4E0D8] dark:border-[#2A2E33] pb-4">
              <h3 className="font-serif font-bold text-lg text-[#1C2024] dark:text-[#FAF9F6] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#2B5D4F]" /> Department Workload
              </h3>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">Active cases distributed across departmental nodes</p>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={departmentWorkloadData}
                  margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(228, 224, 216, 0.5)" />
                  <XAxis 
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#8C827A' }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#8C827A' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(43, 93, 79, 0.05)' }}
                    content={<CustomTooltip />}
                  />
                  <Bar 
                    dataKey="active" 
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  >
                    {departmentWorkloadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resolution Trend */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-[#E4E0D8] dark:border-[#2A2E33] pb-4">
              <h3 className="font-serif font-bold text-lg text-[#1C2024] dark:text-[#FAF9F6] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#2B5D4F]" /> Resolution Velocity
              </h3>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">Daily comparison of new reports vs resolved cases (7 days)</p>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={resolutionTrendData}
                  margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(228, 224, 216, 0.5)" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#8C827A' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#8C827A' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    formatter={(value) => <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{value === 'created' ? 'Filed' : 'Resolved'}</span>}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    name="created"
                    stroke="#B8862E" 
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#B8862E' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    name="resolved"
                    stroke="#2B5D4F" 
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2B5D4F' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Grievances List / Table Card */}
        <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#E4E0D8] dark:border-[#2A2E33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF9F6] dark:bg-[#16191C]">
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6]">Recent Grievances</h3>
              <p className="text-xs text-muted-foreground font-sans">Active case queue and recent submissions</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Filter by title, department, ID..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs font-mono rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20]"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:flex text-xs font-mono h-9 rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] hover:bg-white dark:hover:bg-[#1A1D20]" 
                onClick={() => navigate('/recent-grievances')}
              >
                Community Board <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#2B5D4F] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-muted-foreground">Synchronizing campus records...</span>
                </div>
              </div>
            ) : recentGrievances.length > 0 ? (
              <div className="rounded-xl border border-[#E4E0D8] dark:border-[#2A2E33] overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#F4F1EA] dark:bg-[#202428] border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                    <TableRow className="hover:bg-transparent">
                      {isAdmin && (
                        <TableHead className="w-[50px] pl-4">
                          <Checkbox 
                            checked={isAllSelected}
                            onChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead className="font-mono text-xs uppercase text-muted-foreground w-[120px]">Case ID</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-muted-foreground">Subject</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-muted-foreground">Department</TableHead>
                      <TableHead 
                        className="cursor-pointer select-none font-mono text-xs uppercase text-muted-foreground"
                        onClick={() => handleSort('priority')}
                      >
                        <div className="flex items-center gap-1">
                          Priority {getSortIcon('priority')}
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-mono text-xs uppercase text-muted-foreground">Upvotes</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-muted-foreground">Status</TableHead>
                      <TableHead 
                        className="text-right cursor-pointer select-none font-mono text-xs uppercase text-muted-foreground"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Date {getSortIcon('date')}
                        </div>
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="text-right pr-4 font-mono text-xs uppercase text-muted-foreground">Action</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-[#E4E0D8] dark:divide-[#2A2E33]">
                    {processedGrievances.map((g) => (
                      <TableRow 
                        key={g.id} 
                        className="hover:bg-[#FAF9F6]/70 dark:hover:bg-[#22262B] transition-colors cursor-pointer"
                        onClick={() => { if (g.privateDetailsAvailable !== false) navigate(`/grievances/${g.id}`); }}
                      >
                        {isAdmin && (
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedGrievanceIds.includes(g.id)}
                              onChange={(e) => handleSelectRow(g.id, e)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs font-semibold text-[#1C2024] dark:text-[#FAF9F6]">
                          #GRV-{String(g.id).padStart(4, '0')}
                        </TableCell>
                        <TableCell className="font-medium text-xs text-foreground max-w-[220px] truncate">{g.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-sans">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {g.departmentName || 'General'}
                          </div>
                        </TableCell>
                        <TableCell>{getPriorityBadge(g.priority)}</TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {g.published && g.privateDetailsAvailable !== false ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 px-2 gap-1 rounded-full text-xs font-mono transition-all",
                                g.hasUpvoted 
                                  ? "text-[#2B5D4F] bg-[#2B5D4F]/10 border border-[#2B5D4F]/30"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => handleToggleUpvote(g.id)}
                              aria-label={`Upvote: ${g.title}`}
                              aria-pressed={Boolean(g.hasUpvoted)}
                            >
                              <ThumbsUp className={cn("h-3 w-3", g.hasUpvoted && "fill-current")} />
                              <span>{g.upvoteCount || 0}</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] font-mono text-muted-foreground">Private</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(g.status)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs font-mono whitespace-nowrap">
                          {parseDate(g.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2.5 text-xs font-mono rounded-lg border-[#E4E0D8] dark:border-[#2A2E33] hover:bg-white dark:hover:bg-[#1A1D20]"
                                onClick={() => {
                                  setActiveQuickViewGrievance(g);
                                  setSelectedAssigneeId(g.assignedOfficerId?.toString() || "");
                                }}
                                disabled={g.privateDetailsAvailable === false}
                              >
                                View
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl shadow-xl p-1.5 font-sans">
                                  <DropdownMenuItem disabled={g.privateDetailsAvailable === false} onClick={() => navigate(`/grievances/${g.id}`)} className="cursor-pointer text-xs font-mono rounded-xl">
                                    Full Details
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="cursor-pointer text-xs font-mono rounded-xl">
                                      Assign Officer
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl shadow-xl max-h-60 overflow-y-auto w-56 p-1.5">
                                      {officers.length > 0 ? (
                                        officers.map(off => (
                                          <DropdownMenuItem 
                                            key={off.id} 
                                            onClick={() => handleAssignOfficerFromTable(g.id, off.id)}
                                            className="cursor-pointer text-xs font-mono rounded-xl"
                                          >
                                            {getOfficerName(off)} ({off.departmentName || 'No Dept'})
                                          </DropdownMenuItem>
                                        ))
                                      ) : (
                                        <div className="p-2 text-center text-xs text-muted-foreground font-mono">No officers available</div>
                                      )}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>

                                  <DropdownMenuSeparator className="my-1 border-t border-[#E4E0D8] dark:border-[#2A2E33]" />
                                  
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteGrievanceFromTable(g.id)}
                                    className="text-[#9B4A3F] focus:text-[#9B4A3F] hover:bg-[#9B4A3F]/10 cursor-pointer text-xs font-mono rounded-xl"
                                  >
                                    Delete Ticket
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 border border-dashed rounded-2xl border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6]/40 dark:bg-[#16191C]/40 p-8">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] shadow-sm">
                  <Ghost className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-lg text-foreground">No Grievances Found</h3>
                  <p className="text-muted-foreground text-xs max-w-sm mx-auto font-sans">
                    {searchTerm ? "No grievances match your search query." : "The campus queue is currently clear."}
                  </p>
                </div>
                {!searchTerm && (
                  <Button variant="outline" className="gap-2 border-[#E4E0D8] dark:border-[#2A2E33] text-xs font-mono rounded-xl" onClick={() => navigate('/grievances/new')}>
                    <Plus className="h-3.5 w-3.5" /> Register New Grievance
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Quick View Drawer Sheet */}
      <Sheet open={!!activeQuickViewGrievance} onOpenChange={(open) => {
        if (!open) {
          setActiveQuickViewGrievance(null);
          setSelectedAssigneeId("");
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full justify-between pb-8 bg-white dark:bg-[#1A1D20] border-l border-[#E4E0D8] dark:border-[#2A2E33] rounded-l-3xl">
          <div className="space-y-6 overflow-y-auto pr-2 flex-1">
            <SheetHeader className="border-b border-[#E4E0D8] dark:border-[#2A2E33] pb-4">
              <div className="flex items-center justify-between gap-4 mt-2">
                <span className="text-xs font-mono font-bold text-[#1C2024] dark:text-[#FAF9F6] border border-[#E4E0D8] dark:border-[#2A2E33] px-2 py-0.5 rounded-lg">
                  #GRV-{activeQuickViewGrievance ? String(activeQuickViewGrievance.id).padStart(4, '0') : ""}
                </span>
                {activeQuickViewGrievance && getStatusBadge(activeQuickViewGrievance.status)}
              </div>
              <SheetTitle className="text-xl font-serif font-bold tracking-tight mt-3 text-foreground">
                {activeQuickViewGrievance?.title}
              </SheetTitle>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-1">
                <Building2 className="w-3.5 h-3.5 text-[#2B5D4F]" /> {activeQuickViewGrievance?.departmentName || 'General'}
              </div>
            </SheetHeader>

            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Description Statement</h4>
              <p className="text-xs text-foreground/90 leading-relaxed bg-[#FAF9F6] dark:bg-[#16191C] border border-[#E4E0D8] dark:border-[#2A2E33] p-4 rounded-2xl whitespace-pre-wrap font-sans">
                {activeQuickViewGrievance?.description}
              </p>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                <span className="text-muted-foreground font-mono">Date Filed</span>
                <span className="font-mono text-foreground">
                  {activeQuickViewGrievance && parseDate(activeQuickViewGrievance.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                <span className="text-muted-foreground font-mono">Priority</span>
                <span>
                  {activeQuickViewGrievance && getPriorityBadge(activeQuickViewGrievance.priority)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                <span className="text-muted-foreground font-mono">Assigned Officer</span>
                <span className="font-medium text-foreground">
                  {activeQuickViewGrievance?.assignedOfficerName || "Pending Assignment"}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment Dropdown and Submit */}
          {isAdmin && activeQuickViewGrievance && (
            <div className="space-y-3 pt-4 border-t border-[#E4E0D8] dark:border-[#2A2E33]">
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Assign To Officer</label>
                <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] text-xs font-mono">
                    <SelectValue placeholder="Select an officer..." />
                  </SelectTrigger>
                  <SelectContent className="border-[#E4E0D8] dark:border-[#2A2E33] rounded-xl">
                    {displayOfficers.map(off => (
                      <SelectItem key={off.id} value={off.id.toString()} className="text-xs font-mono">
                        {getOfficerName(off)} ({off.departmentName || 'No Dept'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAssignOfficerFromDrawer}
                disabled={loading || !selectedAssigneeId}
                className="w-full h-10 bg-[#2B5D4F] hover:bg-[#234A3F] text-white font-mono text-xs rounded-xl shadow-sm cursor-pointer"
              >
                {loading ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DashboardPage;
