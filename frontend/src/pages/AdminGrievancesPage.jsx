import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RefreshCw, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

const PAGE_SIZE = 20;

const formatDate = (value) => {
  const date = Array.isArray(value)
    ? new Date(value[0], value[1] - 1, value[2])
    : new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
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

const AdminGrievancesPage = () => {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPage = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/admin/grievances', {
          params: { page, size: PAGE_SIZE },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (page > 0 && page >= data.totalPages) {
          setPage(Math.max(0, data.totalPages - 1));
          return;
        }
        setResult(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.response?.status === 403
          ? 'You do not have permission to view all cases.'
          : 'Cases could not be loaded. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPage();
    return () => controller.abort();
  }, [page, reload]);

  return (
    <div className="min-h-screen bg-paper text-ink pb-24 transition-colors">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-8">
        
        {/* Header Banner */}
        <header className="border-b border-line pb-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]">
              <ShieldAlert className="h-3.5 w-3.5" /> Institutional Archive · Administrative Console
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-ink tracking-tight">
              All Campus Grievances
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-sans">
              Comprehensive registry of public and confidential student submissions across all university departments.
            </p>
          </div>
        </header>

        {loading ? (
          <div role="status" className="py-20 text-center text-muted-foreground">
            <div className="w-6 h-6 border-2 border-[#2B5D4F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-mono text-xs">Querying campus repository...</p>
          </div>
        ) : error ? (
          <div role="alert" className="py-16 text-center space-y-4 border border-line bg-surface rounded-xl p-8">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={() => setReload(previous => previous + 1)} className="border-line bg-surface text-ink hover:bg-paper">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry Fetch
            </Button>
          </div>
        ) : result.content.length === 0 ? (
          <div role="status" className="py-16 text-center border border-line bg-surface rounded-xl p-8 space-y-2">
            <p className="font-serif text-lg font-bold text-ink">No Records Found</p>
            <p className="text-xs text-muted-foreground">No campus grievances match the current administrative scope.</p>
          </div>
        ) : (
          <div className="border border-line bg-surface rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed text-sm text-left">
                <caption className="sr-only">All private cases, including unpublished cases</caption>
                <thead className="bg-paper border-b border-line text-xs font-mono uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-[36%] px-4 py-3.5 font-medium">Case & Title</th>
                    <th scope="col" className="w-[16%] px-4 py-3.5 font-medium">Status</th>
                    <th scope="col" className="w-[18%] px-4 py-3.5 font-medium">Department</th>
                    <th scope="col" className="w-[15%] px-4 py-3.5 font-medium">Submitted</th>
                    <th scope="col" className="w-[15%] px-4 py-3.5 font-medium text-right">Visibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.content.map(grievance => {
                    const st = getStatusDot(grievance.status);
                    return (
                      <tr key={grievance.id} className="hover:bg-paper/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <Link to={`/grievances/${grievance.id}`} className="font-semibold text-ink hover:text-accent transition-colors block line-clamp-1">
                            {grievance.title}
                          </Link>
                          <div className="mt-0.5 text-xs font-mono text-muted-foreground">
                            {grievance.grievanceNumber || `#${grievance.id}`}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-ink">
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground font-sans">
                          {grievance.departmentName || 'General / Unassigned'}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                          {formatDate(grievance.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${
                            grievance.published 
                              ? 'border-[#2B5D4F]/30 bg-[#2B5D4F]/5 text-[#2B5D4F] dark:text-[#7EB5A6]' 
                              : 'border-line bg-muted/40 text-muted-foreground'
                          }`}>
                            {grievance.published ? 'Public' : 'Confidential'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <nav aria-label="Admin case pages" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line bg-paper">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={loading || page === 0} 
                onClick={() => setPage(previous => previous - 1)}
                className="border-line bg-surface text-ink hover:bg-paper text-xs font-mono"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <span className="text-xs font-mono text-muted-foreground" aria-live="polite">
                {!loading && !error && `Page ${result.totalPages ? page + 1 : 0} of ${result.totalPages} (${result.totalElements} records)`}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={loading || Boolean(error) || page + 1 >= result.totalPages} 
                onClick={() => setPage(previous => previous - 1)}
                className="border-line bg-surface text-ink hover:bg-paper text-xs font-mono"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGrievancesPage;