import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle, FileText, ArrowRight, X } from "lucide-react";
import ConfirmDialog from '../components/ConfirmDialog';

const departmentTemplates = {
  "Hostel & Accommodation": "Block / Room No:\nIssue Details:\nDate Observed:\nUrgency / Special Concerns:\n",
  "IT & Infrastructure": "Lab / Classroom No:\nEquipment / System ID:\nIssue Description:\nImpact on Studies / Lab Sessions:\n",
  "Academics & Examinations": "Course & Semester:\nDepartment / Section:\nSubject of Concern:\nSummary of Request:\n",
  "Canteen & Mess": "Mess / Canteen Facility:\nDate & Time:\nHygiene or Quality Observation:\n",
  "Administration": "Office / Counter:\nDocument / Service Requested:\nApplication or Ref Number (if applicable):\nDetails:\n"
};

const NewGrievancePage = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDeps, setFetchingDeps] = useState(true);
  const [submittedGrievance, setSubmittedGrievance] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    departmentId: '',
    imageUrl: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [evidenceType, setEvidenceType] = useState('upload'); // 'upload' or 'link'
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    description: "",
    type: "warning"
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/grievances/departments');
        setDepartments(response.data);
      } catch (err) {
        console.error("Failed to fetch departments", err);
      } finally {
        setFetchingDeps(false);
      }
    };
    fetchDepartments();
  }, []);

  const handleDepartmentChange = (deptId) => {
    setFormData(prev => ({ ...prev, departmentId: deptId }));
    const selected = departments.find(d => d.id.toString() === deptId.toString());
    if (selected && departmentTemplates[selected.name] && (!formData.description || formData.description.trim() === '')) {
      setFormData(prev => ({ ...prev, description: departmentTemplates[selected.name] }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setModal({
          isOpen: true,
          title: "File Exceeds Limit",
          description: "Evidence attachments must not exceed 5MB in size.",
          type: "error"
        });
        return;
      }
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const clearAttachment = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.title.trim()) {
      setModal({
        isOpen: true,
        title: "Validation Error",
        description: "Please specify a clear subject line for your grievance.",
        type: "error"
      });
      return;
    }
    if (!formData.departmentId) {
      setModal({
        isOpen: true,
        title: "Validation Error",
        description: "Please select the responsible college department.",
        type: "error"
      });
      return;
    }
    if (!formData.description || !formData.description.trim() || formData.description.trim().length < 10) {
      setModal({
        isOpen: true,
        title: "Validation Error",
        description: "Please provide a detailed description (minimum 10 characters) explaining the concern.",
        type: "error"
      });
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();

      let finalDescription = formData.description;
      if (evidenceType === 'link' && formData.imageUrl && formData.imageUrl.trim()) {
        finalDescription += `\n\n[Supporting Evidence Reference]: ${formData.imageUrl.trim()}`;
      }

      const grievancePayload = {
        title: formData.title.trim(),
        description: finalDescription.trim(),
        departmentId: Number(formData.departmentId),
        priority: formData.priority,
      };

      data.append('data', new Blob([JSON.stringify(grievancePayload)], { type: 'application/json' }));
      if (evidenceType === 'upload' && file) {
        data.append('file', file);
      }

      const response = await api.post('/grievances', data);
      setSubmittedGrievance(response.data);
    } catch (err) {
      console.error("Submission failed", err);
      const errMsg = err.response?.data?.message || "Unable to register grievance. Please verify your connection and try again.";
      setModal({
        isOpen: true,
        title: "Submission Error",
        description: errMsg,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Institutional Success Receipt
  if (submittedGrievance) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-paper py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-xl bg-surface border border-line rounded-3xl p-8 sm:p-10 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3 pb-6 border-b border-line">
            <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center text-accent">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-muted">Institutional Receipt</span>
              <h1 className="text-2xl font-serif font-bold text-ink">Grievance Lodged Successfully</h1>
            </div>
          </div>

          <div className="py-6 space-y-4">
            <p className="text-sm text-ink/80 leading-relaxed">
              Your grievance has been assigned to the department review pool. An institutional tracking number has been generated and dispatched to your college email address.
            </p>

            <div className="p-5 bg-paper border border-line rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-sans">Reference Token:</span>
                <span className="font-mono font-bold text-ink bg-surface px-2.5 py-1 rounded-md border border-line">
                  {submittedGrievance.ticketNumber || `GRV-#${submittedGrievance.id}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-sans">Current Status:</span>
                <div className="flex items-center gap-1.5 font-medium text-ink bg-surface px-2.5 py-1 rounded-full border border-line">
                  <span className="w-2 h-2 rounded-full bg-[#B8862E]" />
                  <span>Pending Department Review</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-sans">Subject:</span>
                <span className="font-sans font-medium text-ink truncate max-w-[260px]">
                  {submittedGrievance.title}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate(`/grievances/${submittedGrievance.id}`)}
              className="flex-1 bg-accent text-white hover:bg-[#234C40] rounded-xl h-11 text-xs font-semibold shadow-sm"
            >
              View Case Timeline <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedGrievance(null);
                setFormData({
                  title: '',
                  description: '',
                  priority: 'MEDIUM',
                  departmentId: '',
                  imageUrl: '',
                });
                clearAttachment();
              }}
              className="rounded-xl border-line text-ink hover:bg-paper h-11 text-xs font-semibold"
            >
              Lodge Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-paper py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header Banner */}
        <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-ink/60 uppercase tracking-wider">
                ANITS Campus Redressal Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink mt-1">
                Lodge a Formal Grievance
              </h1>
              <p className="text-sm text-ink/80 mt-1 max-w-2xl leading-relaxed">
                Submissions are logged into the college audit register and routed directly to the designated department nodal officer for redressal.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <span className="inline-block px-3.5 py-1.5 text-xs font-mono border border-line bg-paper text-ink/70 rounded-full shadow-xs">
                SLA: 48h Resolution Window
              </span>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-sans font-semibold text-ink">
              Subject Line <span className="text-status-rejected">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Electrical fault in Lab 3 or Course registration portal discrepancy"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="rounded-xl border-line bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 text-sm h-11 px-4"
              maxLength={150}
              required
            />
            <p className="text-[11px] text-muted">
              Summarize the nature of the issue concisely (5 to 150 characters).
            </p>
          </div>

          {/* Department & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Department Selection */}
            <div className="space-y-2">
              <Label htmlFor="department" className="text-xs font-sans font-semibold text-ink">
                Responsible Department <span className="text-status-rejected">*</span>
              </Label>
              <Select
                value={formData.departmentId}
                onValueChange={handleDepartmentChange}
                required
              >
                <SelectTrigger id="department" className="rounded-xl border-line bg-paper text-ink text-sm h-11 px-4">
                  <SelectValue placeholder={fetchingDeps ? "Loading departments..." : "Select College Department"} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-line bg-surface text-ink shadow-xl">
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()} className="text-sm py-2 cursor-pointer focus:bg-accent-dim rounded-lg">
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted">
                Select the campus administrative or academic unit.
              </p>
            </div>

            {/* Priority Level */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-xs font-sans font-semibold text-ink">
                Urgency Classification <span className="text-status-rejected">*</span>
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData({ ...formData, priority: val })}
                required
              >
                <SelectTrigger id="priority" className="rounded-xl border-line bg-paper text-ink text-sm h-11 px-4">
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-line bg-surface text-ink shadow-xl">
                  <SelectItem value="LOW" className="text-sm py-2 cursor-pointer focus:bg-accent-dim rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#3F6B4A]" />
                      <span>Routine / Low</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM" className="text-sm py-2 cursor-pointer focus:bg-accent-dim rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#B8862E]" />
                      <span>Escalated / Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH" className="text-sm py-2 cursor-pointer focus:bg-accent-dim rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#9B4A3F]" />
                      <span>Critical / Immediate Attention</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted">
                Classify based on campus safety or academic deadlines.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-xs font-sans font-semibold text-ink">
                Detailed Statement of Grievance <span className="text-status-rejected">*</span>
              </Label>
              <span className="text-[11px] font-mono text-muted">
                {formData.description.length} / 5000 characters
              </span>
            </div>
            <textarea
              id="description"
              rows={7}
              placeholder="State the facts clearly. Mention dates, classroom/hostel block numbers, faculty or staff involved, and specific impact on your academic or campus routine..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-4 rounded-2xl border border-line bg-paper text-ink text-sm font-sans focus:border-accent focus:ring-2 focus:ring-accent/10 focus:outline-none leading-relaxed resize-y min-h-[140px]"
              required
            />
            <p className="text-[11px] text-muted">
              Provide sufficient factual context to allow the nodal officer to investigate promptly without unnecessary back-and-forth.
            </p>
          </div>

          {/* Supporting Evidence Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-sans font-semibold text-ink">
                Supporting Documentation / Evidence (Optional)
              </Label>
              <div className="flex border border-line bg-paper text-xs rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setEvidenceType('upload')}
                  className={`px-3 py-1 font-medium text-xs transition-colors rounded-lg ${
                    evidenceType === 'upload'
                      ? 'bg-surface text-ink font-semibold shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenceType('link')}
                  className={`px-3 py-1 font-medium text-xs transition-colors rounded-lg ${
                    evidenceType === 'link'
                      ? 'bg-surface text-ink font-semibold shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  External URL
                </button>
              </div>
            </div>

            {evidenceType === 'upload' ? (
              <div className="border-2 border-dashed border-line bg-paper/60 hover:bg-paper rounded-2xl p-6 text-center transition-colors">
                {file ? (
                  <div className="flex items-center justify-between p-3.5 bg-surface border border-line rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {preview ? (
                        <img src={preview} alt="Evidence Preview" className="w-12 h-12 object-cover border border-line rounded-lg" />
                      ) : (
                        <FileText className="w-8 h-8 text-accent shrink-0" />
                      )}
                      <div className="text-left truncate">
                        <p className="text-xs font-semibold text-ink truncate">{file.name}</p>
                        <p className="text-[10px] font-mono text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAttachment}
                      className="text-status-rejected hover:bg-paper h-8 w-8 p-0 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-4">
                    <Upload className="w-7 h-7 text-muted mx-auto mb-2" />
                    <span className="text-xs font-medium text-accent hover:underline">
                      Click to choose a document or image
                    </span>
                    <span className="text-xs text-muted block mt-1">
                      PDF, PNG, JPG up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="p-5 border border-line bg-paper rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <LinkIcon className="w-4 h-4 text-accent" />
                  <span>Publicly accessible document link (Google Drive, OneDrive, campus server)</span>
                </div>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="rounded-xl border-line bg-surface text-ink text-sm h-11 px-4"
                />
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted">
              By lodging this complaint, you affirm that the information submitted is factual and related to ANITS campus operations.
            </p>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-w-[200px] bg-accent text-white hover:bg-[#234C40] rounded-xl h-11 text-xs font-semibold tracking-wide shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Grievance...
                </span>
              ) : (
                <span>Submit Grievance</span>
              )}
            </Button>
          </div>

        </form>
      </div>

      <ConfirmDialog
        isOpen={modal.isOpen}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        confirmText="Acknowledge"
        onConfirm={() => setModal(prev => ({ ...prev, isOpen: false }))}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default NewGrievancePage;
