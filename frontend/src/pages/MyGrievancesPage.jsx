import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  ChevronRight,
  Plus,
  Search,
  Loader2,
  Inbox
} from "lucide-react";

const statusConfig = {
  PENDING: { label: 'Pending Review', dot: 'bg-[#B8862E]', badge: 'border-[#B8862E]/30 bg-[#B8862E]/10 text-[#B8862E]' },
  ASSIGNED: { label: 'Assigned', dot: 'bg-[#2B5D4F]', badge: 'border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-[#2B5D4F]', badge: 'border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]' },
  RESOLVED: { label: 'Resolved', dot: 'bg-[#3F6B4A]', badge: 'border-[#3F6B4A]/30 bg-[#3F6B4A]/10 text-[#3F6B4A] dark:text-[#88C096]' },
  REJECTED: { label: 'Rejected', dot: 'bg-[#9B4A3F]', badge: 'border-[#9B4A3F]/30 bg-[#9B4A3F]/10 text-[#9B4A3F] dark:text-[#E07A6E]' },
  CLOSED_BY_USER: { label: 'Closed', dot: 'bg-[#8C827A]', badge: 'border-border bg-muted text-muted-foreground' }
};

const priorityConfig = {
  HIGH: { label: 'High Priority', dot: 'bg-[#9B4A3F]' },
  MEDIUM: { label: 'Medium', dot: 'bg-[#B8862E]' },
  LOW: { label: 'Routine / Low', dot: 'bg-[#2B5D4F]' }
};

export default function MyGrievancesPage() {
  const navigate = useNavigate();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const parseDate = (date) => {
    if (!date) return '';
    if (Array.isArray(date)) {
      return new Date(date[0], date[1] - 1, date[2], date[3] || 0, date[4] || 0, date[5] || 0).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    }
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        setLoading(true);
        const res = await api.get('/grievances/my');
        setGrievances(res.data || []);
      } catch (err) {
        console.error("Failed to fetch grievances", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrievances();
  }, []);

  const filteredGrievances = grievances.filter(g => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      g.title?.toLowerCase().includes(q) ||
      g.id?.toString().includes(q) ||
      g.departmentName?.toLowerCase().includes(q);
    const matchesFilter = filterStatus === 'ALL' || g.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF9F6] dark:bg-[#121517] text-[#1C2024] dark:text-[#FAF9F6] py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header Banner */}
        <div className="bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Student Redressal Registry
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] mt-1">
              My Lodged Grievances
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1 max-w-2xl leading-relaxed">
              Track real-time case progression, assigned departmental nodal officers, and resolution audit records.
            </p>
          </div>
          <Button
            onClick={() => navigate('/grievances/new')}
            className="rounded-xl bg-[#2B5D4F] text-white hover:bg-[#234A3F] h-10 px-5 text-xs font-mono font-medium gap-2 shrink-0 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Lodge Grievance</span>
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-3" />
              <Input
                placeholder="Filter by subject, ticket ID, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] text-xs font-mono pl-9 h-9"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
              {[
                { key: 'ALL', label: 'All Cases' },
                { key: 'PENDING', label: 'Pending' },
                { key: 'IN_PROGRESS', label: 'In Progress' },
                { key: 'RESOLVED', label: 'Resolved' },
                { key: 'REJECTED', label: 'Rejected' },
                { key: 'CLOSED_BY_USER', label: 'Closed' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap text-xs transition-all ${
                    filterStatus === key
                      ? 'bg-[#2B5D4F] text-white font-medium shadow-sm'
                      : 'border border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Grievances List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 text-center text-xs text-muted-foreground bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2B5D4F]" />
              <p className="font-mono">Loading your grievance register...</p>
            </div>
          ) : filteredGrievances.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-white dark:bg-[#1A1D20] border border-dashed border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl p-8 space-y-3">
              <Inbox className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-serif font-bold text-base text-foreground">No Grievances Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto font-sans">
                No formal grievances match your current search or status filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearchTerm(''); setFilterStatus('ALL'); }}
                className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] text-xs font-mono"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            filteredGrievances.map((g) => {
              const statusInfo = statusConfig[g.status] || { label: g.status, dot: 'bg-muted-foreground', badge: 'border-border text-muted-foreground' };
              const priorityInfo = priorityConfig[g.priority] || { label: g.priority, dot: 'bg-muted-foreground' };

              return (
                <div
                  key={g.id}
                  onClick={() => navigate(`/grievances/${g.id}`)}
                  className="p-5 bg-white dark:bg-[#1A1D20] border border-[#E4E0D8]/90 dark:border-[#2A2E33]/90 rounded-2xl hover:border-[#2B5D4F]/40 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  {/* Left Column: Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-[#1C2024] dark:text-[#FAF9F6]">
                        {g.ticketNumber || `#GRV-${String(g.id).padStart(4, '0')}`}
                      </span>
                      <span className="text-muted-foreground/40">•</span>
                      <div className="inline-flex items-center gap-1 text-muted-foreground font-sans text-xs">
                        <Building2 className="w-3.5 h-3.5 text-[#2B5D4F]" />
                        <span>{g.departmentName || 'General Dept'}</span>
                      </div>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-muted-foreground text-xs font-mono">
                        Lodged {parseDate(g.createdAt)}
                      </span>
                    </div>

                    <h2 className="font-serif font-bold text-base text-[#1C2024] dark:text-[#FAF9F6] group-hover:text-[#2B5D4F] dark:group-hover:text-[#7EB5A6] transition-colors truncate">
                      {g.title}
                    </h2>

                    <p className="text-xs text-muted-foreground line-clamp-1 font-sans leading-relaxed">
                      {g.description}
                    </p>
                  </div>

                  {/* Right Column: Status & Urgency */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E4E0D8] dark:border-[#2A2E33]">
                    
                    {/* Status Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${statusInfo.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>

                    {/* Urgency and Navigation */}
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span className="text-[11px]">{priorityInfo.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#2B5D4F] group-hover:translate-x-0.5 transition-all" />
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
