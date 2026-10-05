import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Button } from "@/components/ui/button";
import { Building2, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck, ThumbsUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

const statusDotColors = {
  RESOLVED: { dot: 'bg-[#3F6B4A]', badge: 'border-[#3F6B4A]/30 bg-[#3F6B4A]/10 text-[#3F6B4A] dark:text-[#88C096]' },
  IN_PROGRESS: { dot: 'bg-[#2B5D4F]', badge: 'border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]' },
  PENDING: { dot: 'bg-[#B8862E]', badge: 'border-[#B8862E]/30 bg-[#B8862E]/10 text-[#B8862E]' },
  REJECTED: { dot: 'bg-[#9B4A3F]', badge: 'border-[#9B4A3F]/30 bg-[#9B4A3F]/10 text-[#9B4A3F] dark:text-[#E07A6E]' },
  CLOSED_BY_USER: { dot: 'bg-[#8C827A]', badge: 'border-border bg-muted text-muted-foreground' }
};

export default function RecentGrievancesPage() {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [votingIds, setVotingIds] = useState([]);
  const votesInFlight = useRef(new Set());

  const formatDate = (value) => {
    if (!value) return '';
    const date = Array.isArray(value)
      ? new Date(value[0], value[1] - 1, value[2])
      : new Date(value);
    return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }) : '';
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchPage = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/grievances/all', {
          params: { page, size: PAGE_SIZE },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = response.data;
        if (page > 0 && page >= data.totalPages) {
          setPage(Math.max(0, data.totalPages - 1));
          return;
        }
        setResult(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.response?.status === 403
          ? 'The community feed is not available to your account.'
          : 'Published summaries could not be loaded. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPage();
    return () => controller.abort();
  }, [page, reload]);

  const toggleUpvote = async (publicId) => {
    if (votesInFlight.current.has(publicId)) return;
    votesInFlight.current.add(publicId);
    setVotingIds([...votesInFlight.current]);
    try {
      const { data } = await api.post(`/grievances/public/${encodeURIComponent(publicId)}/upvote`);
      setResult(previous => ({
        ...previous,
        content: previous.content.map(summary => summary.publicId === publicId
          ? { ...summary, upvoteCount: data.upvoteCount, hasUpvoted: data.hasUpvoted }
          : summary),
      }));
    } catch (err) {
      toast.error(err.response?.status === 403 || err.response?.status === 404
        ? 'This summary is no longer available for voting.'
        : 'Your vote could not be saved. Please try again.');
      setReload(previous => previous + 1);
    } finally {
      votesInFlight.current.delete(publicId);
      setVotingIds([...votesInFlight.current]);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF9F6] dark:bg-[#121517] text-[#1C2024] dark:text-[#FAF9F6] py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header Banner */}
        <div className="bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-medium border border-[#2B5D4F]/30 bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6]">
              <ShieldCheck className="w-3.5 h-3.5" /> Campus Institutional Board
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] mt-2">
            Published Community Grievances
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1 leading-relaxed">
            Institutional summaries reviewed and authorized for campus visibility. Original identities, internal evidence, and student records remain protected by confidentiality protocols.
          </p>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl shadow-sm">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2B5D4F]" />
            <p className="font-mono">Loading reviewed summaries...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl p-6 space-y-3 shadow-sm">
            <p className="text-sm text-[#9B4A3F] font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReload(previous => previous + 1)}
              className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] text-xs font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry Connection
            </Button>
          </div>
        ) : result.content.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#1A1D20] border border-dashed border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl p-8 space-y-2">
            <h2 className="font-serif font-bold text-base text-foreground">No Reviewed Summaries Published Yet</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto font-sans">
              Student grievances are private by default. A case summary appears here only after institutional review and formal publication.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {result.content.map((summary) => {
              const statusInfo = statusDotColors[summary.status] || { dot: 'bg-muted-foreground', badge: 'border-border text-muted-foreground' };
              const formattedStatus = summary.status ? summary.status.replace(/_/g, ' ') : 'PENDING';

              return (
                <div
                  key={summary.publicId}
                  className="p-6 bg-white dark:bg-[#1A1D20] border border-[#E4E0D8]/90 dark:border-[#2A2E33]/90 rounded-2xl space-y-3.5 hover:border-[#2B5D4F]/40 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 font-medium text-[#2B5D4F] dark:text-[#7EB5A6]">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      {summary.departmentName}
                    </span>
                    <span className="text-muted-foreground">{formatDate(summary.createdDate)}</span>
                  </div>

                  <h2 className="text-lg font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] leading-snug">
                    {summary.publicTitle}
                  </h2>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans whitespace-pre-wrap">
                    {summary.publicSummary}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E4E0D8] dark:border-[#2A2E33]">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${statusInfo.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      {formattedStatus}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Upvote: ${summary.publicTitle}`}
                      disabled={votingIds.includes(summary.publicId)}
                      onClick={() => toggleUpvote(summary.publicId)}
                      className={`rounded-full h-8 px-3.5 text-xs font-mono gap-1.5 transition-all ${
                        summary.hasUpvoted
                          ? 'bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6] border-[#2B5D4F]/30 font-medium'
                          : 'border-[#E4E0D8] dark:border-[#2A2E33] hover:bg-[#FAF9F6] dark:hover:bg-[#202428]'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${summary.hasUpvoted ? 'fill-current text-[#2B5D4F]' : ''}`} />
                      <span>{summary.upvoteCount ?? 0}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Navigation */}
        <nav aria-label="Community pages" className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl shadow-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page === 0}
            onClick={() => setPage(p => p - 1)}
            className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] text-xs font-mono h-8 px-3"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
          </Button>

          <span className="text-xs font-mono text-muted-foreground">
            {!loading && !error && `Page ${result.totalPages ? page + 1 : 0} of ${result.totalPages} (${result.totalElements} records)`}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={loading || Boolean(error) || page + 1 >= result.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] text-xs font-mono h-8 px-3"
          >
            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </nav>

      </div>
    </div>
  );
}
