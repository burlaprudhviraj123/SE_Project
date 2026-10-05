import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Sheet, SheetContent,
    SheetDescription, SheetFooter,
    SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowUpRight,
    Building2,
    Calendar,
    CheckCircle2,
    CheckSquare,
    Clock,
    Flame,
    Inbox,
    Paperclip,
    PlayCircle,
    RefreshCw,
    Search,
    ShieldCheck,
    User
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import EvidenceDownload from '../components/EvidenceDownload';
import {
    acceptGrievance,
    getAssignedGrievances,
    getGrievanceDetails,
    getOfficerDashboardStats,
    updateGrievanceStatus
} from '../lib/api';

const OfficerDashboardPage = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Stats state
  const [stats, setStats] = useState({
    deptUnassignedCount: 0,
    myActiveTasksCount: 0,
    myResolvedCount: 0,
    slaBreachedCount: 0,
    departmentName: user?.departmentName || ''
  });

  // Table & Tab state
  const [activeTab, setActiveTab] = useState("workload");
  const [deptQueue, setDeptQueue] = useState([]);
  const [myWorkload, setMyWorkload] = useState([]);
  const [resolvedHistory, setResolvedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Resolution Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState("RESOLVED");
  const [resolutionRemarks, setResolutionRemarks] = useState("");
  const [resolutionVisibility, setResolutionVisibility] = useState('INTERNAL');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Fetch Dashboard Stats & Lists
  const loadDashboardData = useCallback(async () => {
    if (user?.role !== 'OFFICER') return;
    try {
      setLoading(true);
      setLoadError('');
      const [statsRes, poolRes, workloadRes, resolvedRes] = await Promise.all([
        getOfficerDashboardStats(),
        getAssignedGrievances('DEPT_POOL'),
        getAssignedGrievances('MY_TASKS'),
        getAssignedGrievances('RESOLVED')
      ]);

      if (statsRes?.data) {
        setStats({
          deptUnassignedCount: statsRes.data.deptUnassignedCount ?? 0,
          myActiveTasksCount: statsRes.data.myActiveTasksCount ?? 0,
          myResolvedCount: statsRes.data.myResolvedCount ?? 0,
          slaBreachedCount: statsRes.data.slaBreachedCount ?? 0,
          departmentName: statsRes.data.departmentName || user?.departmentName || 'Assigned Department'
        });
      }

      setDeptQueue(poolRes.data || []);
      setMyWorkload(workloadRes.data || []);
      setResolvedHistory(resolvedRes.data || []);
    } catch (err) {
      setDeptQueue([]);
      setMyWorkload([]);
      setResolvedHistory([]);
      setLoadError(err.response?.status === 403 ? 'You do not have access to this officer queue.' : 'Officer data could not be loaded. Please retry.');
      toast.error("Failed to load officer data", { description: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Accept & Start action
  const handleAcceptTicket = async (ticketId) => {
    try {
      setActionLoadingId(ticketId);
      await acceptGrievance(ticketId);
      toast.success("Grievance Accepted", { description: "Ticket is now under your Active Workload." });
      navigate(`/grievances/${ticketId}`);
    } catch (err) {
      toast.error("Failed to accept grievance", { description: err.response?.data?.message || err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Resolution Drawer
  const openResolveDrawer = async (ticket) => {
    if (ticket.privateDetailsAvailable === false) return;
    setSelectedTicket(null);
    setDrawerOpen(false);
    setActionLoadingId(ticket.id);
    try {
      const response = await getGrievanceDetails(ticket.id);
      if (response.data.privateDetailsAvailable === false) return;
      setSelectedTicket(response.data);
      setResolutionStatus("RESOLVED");
      setResolutionRemarks("");
      setResolutionVisibility('INTERNAL');
      setDrawerOpen(true);
    } catch (err) {
      toast.error(err.response?.status === 403 ? 'This private case is no longer assigned to you.' : 'The private case could not be opened.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit Resolution / Rejection
  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!selectedTicket || selectedTicket.privateDetailsAvailable === false || submittingResolution) return;
    if (!resolutionRemarks.trim()) {
      toast.error("Validation Error", { description: "Resolution remarks are compulsory." });
      return;
    }

    try {
      setSubmittingResolution(true);
      await updateGrievanceStatus(selectedTicket.id, {
        status: resolutionStatus,
        remarks: resolutionRemarks.trim(),
        visibility: resolutionVisibility
      });
      toast.success(`Ticket ${resolutionStatus === 'RESOLVED' ? 'Resolved' : 'Rejected'}`, {
        description: `Case ${selectedTicket.grievanceNumber} marked as ${resolutionStatus}.`
      });
      setDrawerOpen(false);
      setSelectedTicket(null);
      await loadDashboardData();
    } catch (err) {
      toast.error("Action Failed", { description: err.response?.data?.message || err.message });
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Helpers for formatting
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPriorityBadge = (priority) => {
    const map = {
      HIGH: "border-[#9B4A3F]/30 bg-[#9B4A3F]/10 text-[#9B4A3F]",
      MEDIUM: "border-[#B8862E]/30 bg-[#B8862E]/10 text-[#B8862E]",
      LOW: "border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F]",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${map[priority] || 'border-[#E4E0D8] text-muted-foreground'}`}>
        {priority}
      </span>
    );
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'PENDING':
        return { dot: 'bg-[#B8862E]', label: 'Pending' };
      case 'ASSIGNED':
        return { dot: 'bg-[#2B5D4F]', label: 'Assigned' };
      case 'IN_PROGRESS':
        return { dot: 'bg-[#2B5D4F]', label: 'In Progress' };
      case 'RESOLVED':
        return { dot: 'bg-[#3F6B4A]', label: 'Resolved' };
      case 'REJECTED':
        return { dot: 'bg-[#9B4A3F]', label: 'Rejected' };
      default:
        return { dot: 'bg-[#8C827A]', label: status?.replace('_', ' ') || 'Unknown' };
    }
  };

  // Filter list by search term
  const filterList = (list) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(item => 
      String(item.id).includes(term) ||
      item.departmentName?.toLowerCase().includes(term) ||
      item.status?.toLowerCase().includes(term) ||
      item.grievanceNumber?.toLowerCase().includes(term) ||
      item.title?.toLowerCase().includes(term) ||
      item.citizenName?.toLowerCase().includes(term) ||
      item.priority?.toLowerCase().includes(term)
    );
  };

  const filteredQueue = filterList(deptQueue);
  const filteredWorkload = filterList(myWorkload);
  const filteredHistory = filterList(resolvedHistory);

  if (user?.role !== 'OFFICER') return <p role="alert" className="p-8 font-serif">This console is available to officers only.</p>;

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#121517] text-[#1C2024] dark:text-[#FAF9F6] pb-24 transition-colors">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E4E0D8] dark:border-[#2A2E33] pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]">
                <ShieldCheck className="w-3.5 h-3.5" /> Officer Redressal Console
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono text-muted-foreground border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20]">
                <Building2 className="w-3.5 h-3.5 text-[#2B5D4F]" /> {stats.departmentName}
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] tracking-tight">
              Department Grievance Hub
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              Review, claim, and process grievances submitted under university departmental jurisdiction.
            </p>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDashboardData} 
            disabled={loading}
            className="border-[#E4E0D8] dark:border-[#2A2E33] text-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Console
          </Button>
        </div>

        {/* Top Stat Cards (4 KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Department Pool */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-mono uppercase tracking-wider">Department Pool</span>
              <Inbox className="w-4 h-4 text-[#B8862E]" />
            </div>
            <div className="text-3xl font-mono font-bold text-[#1C2024] dark:text-[#FAF9F6]">{stats.deptUnassignedCount}</div>
            <p className="text-xs text-muted-foreground mt-1 font-sans">Unassigned tickets in department pool</p>
          </div>

          {/* KPI 2: My Active Tasks */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-mono uppercase tracking-wider">My Active Tasks</span>
              <Clock className="w-4 h-4 text-[#2B5D4F]" />
            </div>
            <div className="text-3xl font-mono font-bold text-[#2B5D4F] dark:text-[#7EB5A6]">{stats.myActiveTasksCount}</div>
            <p className="text-xs text-muted-foreground mt-1 font-sans">Cases claimed under active investigation</p>
          </div>

          {/* KPI 3: Resolved by Me */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-mono uppercase tracking-wider">Resolved by Me</span>
              <CheckCircle2 className="w-4 h-4 text-[#3F6B4A]" />
            </div>
            <div className="text-3xl font-mono font-bold text-[#3F6B4A] dark:text-[#88C096]">{stats.myResolvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1 font-sans">Closed & resolved cases</p>
          </div>

          {/* KPI 4: SLA Warnings */}
          <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-mono uppercase tracking-wider">SLA Warnings</span>
              <Flame className="w-4 h-4 text-[#9B4A3F]" />
            </div>
            <div className="text-3xl font-mono font-bold text-[#9B4A3F] dark:text-[#E07A6E]">{stats.slaBreachedCount}</div>
            <p className="text-xs text-muted-foreground mt-1 font-sans">Overdue / SLA threshold alerts</p>
          </div>
        </div>

        {/* Main Workspace Tabs */}
        {loadError && <p role="alert" className="text-sm font-medium text-destructive">{loadError}</p>}
        <div className="border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="bg-[#E4E0D8]/50 dark:bg-[#202428] p-1 rounded-lg w-full sm:w-auto grid grid-cols-3">
                <TabsTrigger value="queue" className="rounded font-mono text-xs uppercase data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A1D20] data-[state=active]:shadow-sm">
                  Dept Queue ({deptQueue.length})
                </TabsTrigger>
                <TabsTrigger value="workload" className="rounded font-mono text-xs uppercase data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A1D20] data-[state=active]:shadow-sm">
                  My Workload ({myWorkload.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded font-mono text-xs uppercase data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A1D20] data-[state=active]:shadow-sm">
                  Resolved History ({resolvedHistory.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Quick Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder={activeTab === 'queue' ? 'Filter department queue...' : 'Filter grievances...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs font-mono bg-white dark:bg-[#1A1D20] border-[#E4E0D8] dark:border-[#2A2E33]"
              />
            </div>
          </div>

          {/* Tab 1: Department Queue */}
          {activeTab === "queue" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F4F1EA] dark:bg-[#202428] border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Ticket ID</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Department</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Subject</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Priority</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Submitted</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E4E0D8] dark:divide-[#2A2E33]">
                  {filteredQueue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Inbox className="w-6 h-6 opacity-40 text-muted-foreground" />
                          <p className="text-sm font-serif font-bold">No unassigned tickets in departmental pool.</p>
                          <p className="text-xs text-muted-foreground font-sans">All incoming grievances have been assigned or resolved.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQueue.map((ticket) => {
                      const st = getStatusDot(ticket.status);
                      return (
                        <TableRow key={ticket.id} className="hover:bg-[#FAF9F6]/60 dark:hover:bg-[#22262B] transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-[#1C2024] dark:text-[#FAF9F6]">
                            {ticket.id}
                          </TableCell>
                          <TableCell className="text-xs text-foreground font-sans">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              {ticket.departmentName}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="font-medium text-xs text-foreground">Private grievance</div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {formatDate(ticket.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium">
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              disabled={actionLoadingId === ticket.id}
                              onClick={() => handleAcceptTicket(ticket.id)}
                              className="bg-[#2B5D4F] hover:bg-[#234A3F] text-[#FAF9F6] font-mono text-xs rounded shadow-none"
                            >
                              <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                              {actionLoadingId === ticket.id ? "Assigning..." : "Accept & Start"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Tab 2: My Active Workload */}
          {activeTab === "workload" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F4F1EA] dark:bg-[#202428] border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Ticket ID</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Citizen</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Subject</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Priority</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Status</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Assigned Date</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E4E0D8] dark:divide-[#2A2E33]">
                  {filteredWorkload.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Clock className="w-6 h-6 opacity-40 text-[#2B5D4F]" />
                          <p className="text-sm font-serif font-bold">No active workload tasks assigned.</p>
                          <p className="text-xs text-muted-foreground font-sans">Switch to 'Dept Queue' to claim unassigned grievances.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWorkload.map((ticket) => {
                      const st = getStatusDot(ticket.status);
                      return (
                        <TableRow key={ticket.id} className="hover:bg-[#FAF9F6]/60 dark:hover:bg-[#22262B] transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-[#1C2024] dark:text-[#FAF9F6]">
                            {ticket.grievanceNumber}
                          </TableCell>
                          <TableCell className="text-xs text-foreground font-sans">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              {ticket.citizenName || "Anonymous"}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="font-medium text-xs text-foreground truncate" title={ticket.title}>{ticket.title}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{ticket.description}</div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium">
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {formatDate(ticket.updatedAt || ticket.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              onClick={() => openResolveDrawer(ticket)}
                              disabled={ticket.privateDetailsAvailable === false || actionLoadingId !== null}
                              className="border border-[#2B5D4F] bg-[#2B5D4F]/10 hover:bg-[#2B5D4F]/20 text-[#2B5D4F] dark:text-[#7EB5A6] font-mono text-xs rounded shadow-none"
                            >
                              <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Resolve / Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Tab 3: Resolved History */}
          {activeTab === "history" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F4F1EA] dark:bg-[#202428] border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Ticket ID</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Citizen</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Subject</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Outcome</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Closed Date</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Description</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase text-muted-foreground">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E4E0D8] dark:divide-[#2A2E33]">
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <CheckCircle2 className="w-6 h-6 opacity-40 text-[#3F6B4A]" />
                          <p className="text-sm font-serif font-bold">No resolved cases found in history.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((ticket) => {
                      const st = getStatusDot(ticket.status);
                      return (
                        <TableRow key={ticket.id} className="hover:bg-[#FAF9F6]/60 dark:hover:bg-[#22262B] transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-[#1C2024] dark:text-[#FAF9F6]">
                            {ticket.grievanceNumber}
                          </TableCell>
                          <TableCell className="text-xs text-foreground font-sans">
                            {ticket.citizenName || "Anonymous"}
                          </TableCell>
                          <TableCell className="max-w-xs font-medium text-xs text-foreground truncate">
                            {ticket.title}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium">
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {formatDate(ticket.updatedAt)}
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-muted-foreground italic truncate">
                            {ticket.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openResolveDrawer(ticket)}
                              disabled={ticket.privateDetailsAvailable === false || actionLoadingId !== null}
                              aria-label="Open private case"
                              title="Open private case"
                              className="rounded text-xs font-mono hover:bg-[#FAF9F6] dark:hover:bg-[#22262B]"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Resolution Slide-over Drawer / Modal */}
        <Sheet open={drawerOpen} onOpenChange={(open) => { setDrawerOpen(open); if (!open) setSelectedTicket(null); }}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col justify-between bg-white dark:bg-[#1A1D20] border-l border-[#E4E0D8] dark:border-[#2A2E33]">
            <div>
              <SheetHeader className="mb-6 border-b border-[#E4E0D8] dark:border-[#2A2E33] pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#1C2024] dark:text-[#FAF9F6] border border-[#E4E0D8] dark:border-[#2A2E33] px-2 py-0.5 rounded">
                    {selectedTicket?.grievanceNumber}
                  </span>
                  {selectedTicket && getPriorityBadge(selectedTicket.priority)}
                </div>
                <SheetTitle className="text-xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] mt-2">
                  {selectedTicket?.status === 'RESOLVED' || selectedTicket?.status === 'REJECTED' 
                    ? "Case Resolution Record" 
                    : "Official Case Resolution"}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground font-sans">
                  Review student statement, examine evidence, and file departmental finding.
                </SheetDescription>
              </SheetHeader>

              {/* Ticket Details Summary */}
              <div className="space-y-4 text-xs font-sans">
                <div className="p-4 rounded-lg bg-[#FAF9F6] dark:bg-[#16191C] border border-[#E4E0D8] dark:border-[#2A2E33] space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground pb-2 border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                    <span className="flex items-center gap-1 font-medium"><User className="w-3.5 h-3.5" /> Submitter:</span>
                    <span className="font-semibold text-foreground">{selectedTicket?.citizenName || 'Anonymous'}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground pb-2 border-b border-[#E4E0D8] dark:border-[#2A2E33]">
                    <span className="flex items-center gap-1 font-medium"><Calendar className="w-3.5 h-3.5" /> Date Logged:</span>
                    <span className="font-mono text-foreground">{formatDate(selectedTicket?.createdAt)}</span>
                  </div>
                  <div className="pt-1">
                    <span className="font-mono text-xs text-muted-foreground block mb-1 uppercase tracking-wider">Subject</span>
                    <p className="font-serif font-bold text-foreground text-sm leading-snug">{selectedTicket?.title}</p>
                  </div>
                  <div className="pt-1">
                    <span className="font-mono text-xs text-muted-foreground block mb-1 uppercase tracking-wider">Statement</span>
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{selectedTicket?.description}</p>
                  </div>
                </div>

                {/* Evidence Attachment */}
                {(selectedTicket?.attachmentUrl || selectedTicket?.imageUrl) && (
                  <div className="p-4 rounded-lg bg-[#2B5D4F]/5 border border-[#2B5D4F]/20 space-y-2">
                    <span className="font-mono uppercase tracking-wider text-[11px] text-[#2B5D4F] dark:text-[#7EB5A6] flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" /> Filed Evidence
                    </span>
                    <EvidenceDownload key={selectedTicket.id} caseId={selectedTicket.id} />
                  </div>
                )}

                {/* Status Update Form (Active Workload only) */}
                {selectedTicket && selectedTicket.privateDetailsAvailable !== false && ['ASSIGNED', 'IN_PROGRESS', 'PENDING'].includes(selectedTicket.status) && (
                  <form id="resolution-form" onSubmit={handleSubmitResolution} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs uppercase tracking-wider">Outcome Verdict *</Label>
                      <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
                        <SelectTrigger className="w-full rounded bg-white dark:bg-[#1A1D20] border-[#E4E0D8] dark:border-[#2A2E33] font-mono text-xs">
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                        <SelectContent className="border-[#E4E0D8] dark:border-[#2A2E33]">
                          <SelectItem value="RESOLVED" className="font-mono text-xs text-[#3F6B4A]">
                            RESOLVED — Issue Rectified & Closed
                          </SelectItem>
                          <SelectItem value="REJECTED" className="font-mono text-xs text-[#9B4A3F]">
                            REJECTED — Invalid / Not Departmental Scope
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="resolution-visibility" className="font-mono text-xs uppercase tracking-wider">Visibility Scope</Label>
                      <Select value={resolutionVisibility} onValueChange={setResolutionVisibility}>
                        <SelectTrigger id="resolution-visibility" className="rounded bg-white dark:bg-[#1A1D20] border-[#E4E0D8] dark:border-[#2A2E33] font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[#E4E0D8] dark:border-[#2A2E33]">
                          <SelectItem value="INTERNAL" className="font-mono text-xs">INTERNAL — Campus Staff Only</SelectItem>
                          <SelectItem value="PARTICIPANTS" className="font-mono text-xs">PARTICIPANTS — Disclosed to Student Submitter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="font-mono text-xs uppercase tracking-wider">Findings & Resolution Remarks *</Label>
                        <span className="font-mono text-[10px] text-muted-foreground">{resolutionRemarks.length}/1000</span>
                      </div>
                      <Textarea 
                        required
                        maxLength={1000}
                        rows={4}
                        value={resolutionRemarks}
                        onChange={(e) => setResolutionRemarks(e.target.value)}
                        placeholder="Detail corrective actions taken, university staff findings, or grounds for disposition..."
                        className="rounded bg-white dark:bg-[#1A1D20] border-[#E4E0D8] dark:border-[#2A2E33] text-xs resize-none"
                      />
                    </div>
                  </form>
                )}
              </div>
            </div>

            <SheetFooter className="mt-6 pt-4 border-t border-[#E4E0D8] dark:border-[#2A2E33] gap-2">
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} className="rounded border-[#E4E0D8] dark:border-[#2A2E33] text-xs font-mono">
                Close
              </Button>
              {selectedTicket && selectedTicket.privateDetailsAvailable !== false && ['ASSIGNED', 'IN_PROGRESS', 'PENDING'].includes(selectedTicket.status) && (
                <Button 
                  type="submit" 
                  form="resolution-form"
                  disabled={submittingResolution || !resolutionRemarks.trim()}
                  className={`rounded text-xs font-mono text-[#FAF9F6] shadow-none ${
                    resolutionStatus === 'RESOLVED' ? 'bg-[#3F6B4A] hover:bg-[#32573B]' : 'bg-[#9B4A3F] hover:bg-[#7D3B32]'
                  }`}
                >
                  {submittingResolution ? "Recording..." : `Confirm ${resolutionStatus}`}
                </Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>

      </div>
    </div>
  );
};

export default OfficerDashboardPage;
