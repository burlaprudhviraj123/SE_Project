import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card, CardContent,
    CardHeader, CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    AlertCircle,
    ArrowLeft, Building2,
    Calendar,
    CheckCircle2,
    Clock,
    History,
    Image as ImageIcon,
    MessageSquare,
    ShieldCheck, Star,
    User,
    XCircle
} from "lucide-react";
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from "sonner";
import ConfirmDialog from '../components/ConfirmDialog';
import EvidenceDownload from '../components/EvidenceDownload';
import PublicationControls from '../components/PublicationControls';
import api from '../lib/api';
import { getOfficerName } from '../lib/privacy';

const GrievanceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [grievance, setGrievance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [closing, setClosing] = useState(false);
  const [modal, setModal] = useState({ 
    isOpen: false, 
    title: "", 
    description: "", 
    type: "warning", 
    onConfirm: null 
  });
  const [officers, setOfficers] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [localPriority, setLocalPriority] = useState("");
  const [localOfficerId, setLocalOfficerId] = useState("");
  const [isInternal, setIsInternal] = useState(true);

  // Feedback states
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchDetails = useCallback(async (signal) => {
    try {
      setLoading(true);
      setLoadError('');
      setGrievance(null);
      setHistory([]);
      setFeedback(null);
      setOfficers([]);
      window.scrollTo(0, 0); // Reset scroll position to top
      const detailsRes = await api.get(`/grievances/${id}`, { signal });
      if (signal?.aborted) return;
      const historyRes = await api.get(`/grievances/${id}/history`, { signal });
      if (signal?.aborted) return;
      setGrievance(detailsRes.data);
      setLocalPriority(detailsRes.data.priority);
      setLocalOfficerId(String(detailsRes.data.assignedOfficerId || ''));
      setHistory(historyRes.data || []);

      if (detailsRes.data.status === 'RESOLVED' || detailsRes.data.status === 'CLOSED_BY_USER') {
        try {
          setLoadingFeedback(true);
          const feedbackRes = await api.get(`/feedback/grievance/${id}`, { signal });
          if (signal?.aborted) return;
          if (feedbackRes.data && feedbackRes.data.length > 0) {
            setFeedback(feedbackRes.data[0]);
          } else {
            setFeedback(null);
          }
        } catch (err) {
          if (signal?.aborted) return;
          console.error("Failed to fetch feedback", err);
          setFeedback(null);
        } finally {
          setLoadingFeedback(false);
        }
      } else {
        setFeedback(null);
      }

      if (user?.role === 'ADMIN' || user?.role === 'OFFICER') {
        try {
          const officersRes = await api.get('/grievances/officers', { signal });
          if (signal?.aborted) return;
          setOfficers(officersRes.data || []);
        } catch (err) {
          console.error("Failed to fetch officers", err);
        }
      }
    } catch (err) {
      if (signal?.aborted) return;
      setGrievance(null);
      setHistory([]);
      setFeedback(null);
      setLoadError(err.response?.status === 403
        ? 'This case is private. Only its owner, assigned department officer, and administrators can open it.'
        : err.response?.status === 404
          ? 'This grievance could not be found.'
          : 'The private case could not be loaded. Please try again.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDetails(controller.signal);
    return () => controller.abort();
  }, [fetchDetails]);

  const handleClose = () => {
    setModal({
      isOpen: true,
      title: "Close Grievance",
      description: "Are you sure you want to close this grievance? This action signifies your satisfaction with the resolution or that you no longer require assistance.",
      type: "warning",
      onConfirm: executeClose
    });
  };

  const executeClose = async () => {
    try {
      setClosing(true);
      setModal(prev => ({ ...prev, isOpen: false })); // Close confirm modal
      
      await api.put(`/grievances/${id}/close`, { remarks: "Closed by user via portal" });
      const detailsRes = await api.get(`/grievances/${id}`);
      setGrievance(detailsRes.data);
      
      // Success notification
      setModal({
        isOpen: true,
        title: "Protocol Archived",
        description: "Grievance has been successfully closed by you. The record remains in the system for administrative audit, but no further escalation will occur.",
        type: "success",
        confirmText: "Acknowledge",
        onConfirm: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          fetchDetails(); // Refresh to show new status
        }
      });
    } catch (err) {
      console.error("Failed to close grievance", err);
      // Backend returns ApiError { message, status, timestamp, path }
      const errorData = err.response?.data;
      const errorMsg = errorData?.message || 
                      (typeof errorData === 'string' ? errorData : null) ||
                      "The secure uplink encountered a logic failure or permission mismatch.";

      setModal({
        isOpen: true,
        title: "Access Restricted",
        description: `Command Refused: ${errorMsg}. Please verify you are logged in as the original author.`,
        type: "error",
        confirmText: "Return",
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setClosing(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (feedbackRating < 1 || feedbackRating > 5) {
      toast.error("Please select a rating between 1 and 5 stars.");
      return;
    }
    try {
      setSubmittingFeedback(true);
      const res = await api.post('/feedback', {
        grievanceId: parseInt(id),
        rating: feedbackRating,
        comments: feedbackComments.trim()
      });
      toast.success("Feedback submitted successfully. Thank you!");
      setFeedback(res.data);
    } catch (err) {
      console.error("Failed to submit feedback", err);
      toast.error(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handlePriorityChange = (newPriority) => {
    setLocalPriority(newPriority);
  };

  const handleAssignOfficer = (officerId) => {
    setLocalOfficerId(officerId);
  };

  const handleUpdateTicket = async () => {
    try {
      setLoading(true);
      const promises = [];
      let updated = false;

      // 1. Update priority if changed
      if (localPriority !== grievance.priority) {
        promises.push(api.put(`/grievances/${id}/priority?priority=${localPriority}`));
        updated = true;
      }

      // 2. Update assignee if changed
      const currentOfficerId = String(grievance.assignedOfficerId || "");
      if (localOfficerId !== currentOfficerId) {
        const url = user.role === 'ADMIN' 
          ? `/admin/grievances/${id}/assign/${localOfficerId}`
          : `/officer/grievances/${id}/assign/${localOfficerId}`;
        if (localOfficerId) {
          promises.push(api.post(url));
          updated = true;
        }
      }

      // 3. Add remarks if entered
      if (remarks.trim()) {
        promises.push(api.put(`/grievances/${id}/status`, {
          status: grievance.status,
          remarks: remarks.trim(),
          visibility: isInternal ? 'INTERNAL' : 'PARTICIPANTS'
        }));
        updated = true;
      }

      if (updated) {
        await Promise.all(promises);
        setRemarks("");
        toast.success("Changes saved successfully");
        await fetchDetails();
      } else {
        toast.info("No modifications detected");
      }
    } catch (err) {
      console.error("Failed to update ticket", err);
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus, statusRemarks = "") => {
    try {
      setLoading(true);
      
      if (newStatus === 'IN_PROGRESS' && user.role === 'OFFICER' && grievance.status === 'PENDING') {
        await api.put(`/grievances/${id}/accept`);
      } else {
        await api.put(`/grievances/${id}/status`, {
          status: newStatus,
          remarks: statusRemarks.trim() || `Status transitioned to ${newStatus}`,
          visibility: isInternal ? 'INTERNAL' : 'PARTICIPANTS'
        });
      }
      setRemarks("");
      await fetchDetails();
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error(err.response?.status === 403 ? 'You no longer have permission to update this case.' : 'Status could not be updated.');
    } finally {
      setLoading(false);
    }
  };

  const displayHistory = history;

  const formatRemark = (remark) => {
    if (!remark) return "";
    if (remark.startsWith('[INTERNAL]')) {
      return remark.substring('[INTERNAL]'.length).trim();
    }
    if (remark.startsWith('[PUBLIC]')) {
      return remark.substring('[PUBLIC]'.length).trim();
    }
    return remark;
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'RESOLVED': return { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 };
      case 'PENDING': return { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle };
      case 'IN_PROGRESS': return { label: 'In Progress', color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: Clock };
      case 'CLOSED_BY_USER': return { label: 'Closed by User', color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: XCircle };
      case 'REJECTED': return { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle };
      default: return { label: status, color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-border', icon: History };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Decrypting Records...</p>
      </div>
    );
  }

  if (!grievance) {
    return (
      <div className="container max-w-4xl mx-auto p-10 text-center space-y-6">
        <XCircle className="w-16 h-16 text-destructive mx-auto opacity-20" />
        <h2 className="text-2xl font-bold tracking-tight">Private Case Unavailable</h2>
        <p role="alert" className="text-muted-foreground">{loadError || 'The requested grievance record could not be retrieved.'}</p>
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="px-8 rounded-full">Return to dashboard</Button>
      </div>
    );
  }

  const s = getStatusInfo(grievance.status);

  return (
    <div className="min-h-screen bg-paper pb-20 selection:bg-accent/20">
      <div className="container max-w-5xl mx-auto p-4 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Breadcrumbs & Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)} 
            className="group gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-ink hover:bg-surface px-3 py-1.5 rounded-xl transition-all"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Button>
          
          <div className="flex items-center gap-2">
            {user?.id === grievance.citizenId && grievance.status !== 'CLOSED_BY_USER' && grievance.status !== 'RESOLVED' && grievance.status !== 'REJECTED' && (
              <Button 
                onClick={handleClose} 
                disabled={closing}
                variant="outline"
                className="rounded-full h-10 px-5 border-status-rejected/30 text-status-rejected hover:bg-status-rejected/10 font-mono text-xs font-semibold transition-all shadow-xs"
              >
                {closing ? 'Processing...' : 'Close Grievance'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Context - Left Col */}
          <div className="lg:col-span-2 space-y-8">
            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`rounded-full px-4 py-1.5 font-mono text-xs font-semibold ${s.bg} ${s.color} ${s.border}`}>
                  <s.icon className="w-3.5 h-3.5 mr-2" />
                  {s.label}
                </Badge>
                <Badge variant="outline" className="rounded-full px-4 py-1.5 font-mono text-xs font-semibold border-line text-ink">
                  {grievance.priority} Priority
                </Badge>
                <span className="text-xs font-mono font-bold text-ink-muted ml-auto bg-surface border border-line px-3 py-1 rounded-full">
                  #GRV-{String(id).padStart(4, '0')}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink tracking-tight leading-tight">{grievance.title}</h1>
              <div className="flex items-center gap-6 text-xs font-mono text-ink-muted">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-accent" />
                  {grievance.departmentName}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  {new Date(grievance.createdAt).toLocaleDateString()}
                </div>
              </div>
            </header>

            <Card className="border border-line shadow-sm rounded-3xl bg-surface p-6 sm:p-8">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Detailed Statement</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="text-base text-ink leading-relaxed font-sans whitespace-pre-wrap">
                  {grievance.description}
                </div>
              </CardContent>
            </Card>

            {/* Attachments Section */}
            <Card className="border border-line shadow-sm rounded-3xl bg-surface p-6 sm:p-8">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-accent" />
                  Attachments & Evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {grievance.attachmentUrl || grievance.imageUrl ? (
                  <EvidenceDownload key={id} caseId={id} />
                ) : (
                  <div className="py-6 text-center text-xs font-mono text-muted-foreground italic">
                    No attachments or evidence files uploaded.
                  </div>
                )}
              </CardContent>
            </Card>

            {user?.role === 'ADMIN' && (
              <PublicationControls
                key={`${id}-${grievance.published}-${grievance.publicTitle}-${grievance.publicSummary}`}
                grievance={grievance}
                onUpdated={fetchDetails}
              />
            )}

            {/* Feedback & Ratings Section */}
            {(grievance.status === 'RESOLVED' || grievance.status === 'CLOSED_BY_USER') && (
              <Card className="border border-line shadow-sm rounded-3xl bg-surface p-6 sm:p-8">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    Resolution Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  {loadingFeedback ? (
                    <div className="py-4 text-center text-xs font-mono text-muted-foreground animate-pulse">
                      Retrieving feedback data...
                    </div>
                  ) : feedback ? (
                    // Read-only Feedback Card
                    <div className="p-5 rounded-2xl bg-paper border border-line space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-2xl bg-accent-dim flex items-center justify-center text-accent">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-ink">{feedback.userName || 'Citizen'}</p>
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                              Submitted {new Date(feedback.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-4 w-4",
                                star <= feedback.rating
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-muted-foreground/30"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {feedback.comments && (
                        <div className="p-4 rounded-xl bg-surface border border-line text-sm leading-relaxed text-ink italic whitespace-pre-wrap font-sans">
                          "{feedback.comments}"
                        </div>
                      )}
                    </div>
                  ) : user?.id === grievance.citizenId && grievance.status === 'RESOLVED' ? (
                    // Interactive Feedback Submission Form
                    <form onSubmit={handleSubmitFeedback} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                          Rate the Resolution Experience
                        </label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              className="focus:outline-none transition-transform active:scale-95 p-1"
                            >
                              <Star
                                className={cn(
                                  "h-7 w-7 transition-colors duration-200",
                                  star <= feedbackRating
                                    ? "text-yellow-500 fill-yellow-500 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]"
                                    : "text-muted-foreground hover:text-yellow-500/60"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                          Provide Remarks / Review Comments
                        </label>
                        <textarea
                          value={feedbackComments}
                          onChange={(e) => setFeedbackComments(e.target.value)}
                          placeholder="Tell us about your experience with the resolution..."
                          maxLength={1000}
                          rows={3}
                          className="w-full rounded-2xl border border-line bg-paper p-4 font-sans text-sm leading-relaxed text-ink placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/10 focus:outline-none resize-none transition-all"
                        />
                        <div className="text-right text-[10px] font-mono text-muted-foreground">
                          {feedbackComments.length} / 1000 MAX
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={submittingFeedback}
                        className="w-full h-11 bg-accent hover:bg-[#234C40] text-white font-mono text-xs font-semibold uppercase tracking-wider rounded-xl shadow-sm"
                      >
                        {submittingFeedback ? 'Transmitting Feedback...' : 'Submit Resolution Feedback'}
                      </Button>
                    </form>
                  ) : (
                    <div className="py-4 text-center text-xs font-mono text-muted-foreground italic">
                      No feedback submitted yet for this grievance.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Resolution History / Timeline - Hero Section */}
            <Card className="border border-line shadow-sm bg-surface overflow-hidden rounded-3xl">
              <CardHeader className="border-b border-line p-6 bg-paper/40 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent-dim flex items-center justify-center text-accent">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-serif font-bold text-ink">Grievance Case Timeline</CardTitle>
                    <p className="text-xs text-ink-muted">Complete audit trail of institutional reviews, assignments, and status updates</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-ink-muted px-3 py-1 rounded-full bg-surface border border-line shadow-xs">
                  {displayHistory.length} Record{displayHistory.length !== 1 ? 's' : ''}
                </span>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <div className="space-y-0">
                  {displayHistory.length > 0 ? displayHistory.map((item, index) => {
                    const statusDotColor = 
                      item.status === 'RESOLVED' ? 'bg-[#3F6B4A]' :
                      item.status === 'IN_PROGRESS' || item.status === 'ASSIGNED' ? 'bg-[#2B5D4F]' :
                      item.status === 'PENDING' ? 'bg-[#B8862E]' :
                      'bg-[#9B4A3F]';

                    return (
                      <div key={item.id} className="relative pl-8 pb-8 last:pb-2 group">
                        {/* Vertical Rule */}
                        {index !== displayHistory.length - 1 && (
                          <div className="absolute left-[7px] top-4 bottom-0 w-[1px] bg-line" />
                        )}
                        {/* Semantic Status Dot */}
                        <div className={cn(
                          "absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-paper border-2 flex items-center justify-center z-10 transition-transform group-hover:scale-110",
                          item.status === 'RESOLVED' ? 'border-[#3F6B4A]' :
                          item.status === 'IN_PROGRESS' || item.status === 'ASSIGNED' ? 'border-[#2B5D4F]' :
                          item.status === 'PENDING' ? 'border-[#B8862E]' : 'border-[#9B4A3F]'
                        )}>
                          <div className={cn("h-1.5 w-1.5 rounded-full", statusDotColor)} />
                        </div>
                        
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-ink font-serif">
                                {item.status?.replaceAll('_', ' ')}
                              </span>
                              {(item.visibility === 'INTERNAL' || (!item.visibility && item.remarks?.startsWith('[INTERNAL]'))) ? (
                                <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full">
                                  Internal Note
                                </span>
                              ) : item.visibility === 'PARTICIPANTS' ? (
                                <span className="bg-accent-dim text-accent border border-accent/20 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full">
                                  Owner-visible
                                </span>
                              ) : (
                                <span className="bg-paper text-ink-muted border border-line text-[10px] font-mono font-medium px-2 py-0.5 rounded-full">
                                  Public
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-ink-muted">
                              {new Date(item.updatedAt).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {/* Indented Remarks Box */}
                          <div className="p-4 rounded-2xl bg-paper border border-line text-sm text-ink leading-relaxed">
                            <p className="font-normal whitespace-pre-wrap">
                              {formatRemark(item.remarks) || "Status progressed with no supplementary commentary."}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <User className="h-3.5 w-3.5 text-ink-muted" />
                            <span>Action recorded by <strong className="text-ink font-medium">{item.updatedBy || "System Administrator"}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-12 border-2 border-dashed border-line rounded-2xl text-center space-y-1 bg-paper/30">
                      <p className="font-serif text-sm font-semibold text-ink">No timeline events recorded yet</p>
                      <p className="text-xs text-ink-muted">Case history will populate automatically as officers triage this ticket.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info - Right Col */}
          <div className="space-y-6 sticky top-24 self-start">
            <Card className="border border-line shadow-sm bg-surface rounded-3xl overflow-hidden">
              <div className="h-1.5 bg-[#2B5D4F]" />
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  Operational Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-sans font-medium">Grievance ID</span>
                    <span className="font-mono font-bold text-ink bg-paper px-2.5 py-1 rounded-md border border-line">#{id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-sans font-medium">Urgency Level</span>
                    {s && <Badge className={`${s.bg} ${s.color} border-line font-mono uppercase text-[10px] px-2.5 py-0.5 rounded-full`}>{grievance.priority}</Badge>}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-sans font-medium">SLA Window</span>
                    <span className="font-mono font-semibold text-ink">48 Business Hours</span>
                  </div>
                </div>

                <Separator className="bg-line" />

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Assigned Officer</label>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-paper border border-line">
                      <div className="h-8 w-8 rounded-xl bg-accent-dim flex items-center justify-center text-accent">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-ink truncate">{grievance.assignedOfficerName || "Pending Assignment"}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Department Node</label>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-paper border border-line">
                      <div className="h-8 w-8 rounded-xl bg-accent-dim flex items-center justify-center text-accent">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-ink truncate">{grievance.departmentName}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  {grievance.status === 'RESOLVED' ? (
                    <div className="p-4 rounded-2xl bg-[#3F6B4A]/10 border border-[#3F6B4A]/20 text-center space-y-1.5">
                      <p className="text-xs font-bold text-[#3F6B4A]">Case Resolved Successfully</p>
                      <p className="text-[11px] text-[#3F6B4A]/80 leading-relaxed">Please review the resolution and close the grievance if satisfied.</p>
                    </div>
                  ) : grievance.status === 'CLOSED_BY_USER' ? (
                    <div className="p-4 rounded-2xl bg-[#9B4A3F]/10 border border-[#9B4A3F]/20 text-center space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#9B4A3F]">Archived by User</p>
                        <p className="text-[10px] text-[#9B4A3F]/80 font-mono">Read-Only Protocol</p>
                    </div>
                  ) : grievance.status === 'REJECTED' ? (
                    <div className="p-4 rounded-2xl bg-[#9B4A3F]/10 border border-[#9B4A3F]/20 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#9B4A3F]">Case Rejected</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                       <Button className="w-full h-11 bg-accent hover:bg-[#234C40] text-white font-mono text-xs font-semibold uppercase tracking-wider rounded-xl shadow-sm">
                         Download Summary
                       </Button>
                       <p className="text-center text-[11px] text-muted-foreground font-mono">Protocol transmission active</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin / Officer Operational Controls */}
            {(user?.role === 'ADMIN' || user?.role === 'OFFICER') && (
              <Card className="border border-line shadow-sm bg-surface rounded-3xl overflow-hidden">
                <div className="h-1.5 bg-[#B8862E]" />
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#B8862E]" />
                    Operational Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                  {/* Change Priority */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Urgency level</label>
                    <select 
                      value={localPriority} 
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#181C1F] border border-line text-xs font-semibold text-ink dark:text-[#F2EFEB] focus:outline-none focus:ring-2 focus:ring-accent/10"
                    >
                      <option value="LOW" className="bg-white dark:bg-[#181C1F] text-ink dark:text-[#F2EFEB]">LOW</option>
                      <option value="MEDIUM" className="bg-white dark:bg-[#181C1F] text-ink dark:text-[#F2EFEB]">MEDIUM</option>
                      <option value="HIGH" className="bg-white dark:bg-[#181C1F] text-ink dark:text-[#F2EFEB]">HIGH</option>
                    </select>
                  </div>

                  {/* Reassign Officer */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Assign Officer</label>
                    <select 
                      value={localOfficerId} 
                      onChange={(e) => handleAssignOfficer(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#181C1F] border border-line text-xs font-semibold text-ink dark:text-[#F2EFEB] focus:outline-none focus:ring-2 focus:ring-accent/10"
                    >
                      <option value="" className="bg-white dark:bg-[#181C1F] text-ink dark:text-[#F2EFEB]">-- Unassigned --</option>
                      {officers.map(off => (
                        <option key={off.id} value={off.id} className="bg-white dark:bg-[#181C1F] text-ink dark:text-[#F2EFEB]">{getOfficerName(off)} ({off.departmentName || 'No Department'})</option>
                      ))}
                    </select>
                  </div>

                  <Separator className="bg-line" />

                  {/* Status updates with remarks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Update visibility</label>
                      <div className="flex items-center gap-1 bg-paper border border-line p-1 rounded-full text-[10px] font-mono uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => setIsInternal(true)}
                          aria-pressed={isInternal}
                          className={cn(
                            "px-3 py-1 rounded-full transition-all cursor-pointer font-medium",
                            isInternal 
                              ? "bg-accent text-white shadow-xs" 
                              : "text-ink-muted hover:text-ink"
                          )}
                        >
                          Internal
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsInternal(false)}
                          aria-pressed={!isInternal}
                          className={cn(
                            "px-3 py-1 rounded-full transition-all cursor-pointer font-medium",
                            !isInternal 
                              ? "bg-accent text-white shadow-xs" 
                              : "text-ink-muted hover:text-ink"
                          )}
                        >
                          Owner-visible
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Remarks & Note</label>
                      <textarea 
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder={isInternal ? "Type internal triage notes (officers only)..." : "Type reply to citizen..."}
                        className="w-full p-3.5 rounded-2xl bg-paper border border-line text-xs font-sans text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/10 h-24 resize-none leading-relaxed"
                      />
                    </div>

                    <Button
                      onClick={handleUpdateTicket}
                      className="w-full h-11 bg-accent hover:bg-[#234C40] text-white font-mono text-xs font-semibold uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer mt-1"
                    >
                      Update Ticket
                    </Button>

                    <Separator className="bg-line my-2" />

                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Direct Status Actions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {grievance.status === 'PENDING' && (
                        <Button 
                          onClick={() => handleStatusUpdate('IN_PROGRESS')}
                          className="bg-[#2B5D4F] hover:bg-[#234C40] text-white font-mono text-[10px] font-semibold uppercase tracking-wider h-10 rounded-xl cursor-pointer shadow-xs"
                        >
                          Accept Case
                        </Button>
                      )}
                      {grievance.status !== 'RESOLVED' && grievance.status !== 'CLOSED_BY_USER' && grievance.status !== 'REJECTED' && (
                        <>
                          <Button 
                            onClick={() => handleStatusUpdate('RESOLVED', remarks)}
                            className="bg-[#3F6B4A] hover:bg-[#34583d] text-white font-mono text-[10px] font-semibold uppercase tracking-wider h-10 rounded-xl cursor-pointer shadow-xs"
                          >
                            Resolve Case
                          </Button>
                          <Button 
                            onClick={() => handleStatusUpdate('REJECTED', remarks)}
                            className="bg-[#9B4A3F] hover:bg-[#853f35] text-white font-mono text-[10px] font-semibold uppercase tracking-wider h-10 rounded-xl cursor-pointer shadow-xs"
                          >
                            Reject Case
                          </Button>
                        </>
                      )}
                      {grievance.status !== 'CLOSED_BY_USER' && (
                        <Button 
                          onClick={() => handleStatusUpdate('CLOSED_BY_USER', remarks || "Closed by Admin/Officer")}
                          className="col-span-2 bg-ink/80 hover:bg-ink text-white font-mono text-[10px] font-semibold uppercase tracking-wider h-10 rounded-xl cursor-pointer shadow-xs"
                        >
                          Close Grievance
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={modal.isOpen}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        confirmText={modal.confirmText || "Confirm"}
        onConfirm={modal.onConfirm}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        loading={closing && modal.type === 'warning'}
      />
    </div>
  );
};

export default GrievanceDetailsPage;
