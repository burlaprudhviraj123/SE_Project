import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, Plus, Edit2, Loader2, CheckCircle2, AlertCircle, PowerOff } from "lucide-react";

export default function AdminDepartmentsDialog({ isOpen, onClose, onDepartmentUpdated }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'
  const [editingDept, setEditingDept] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to load departments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      setActiveTab('list');
      setEditingDept(null);
      setFormData({ name: '', contactEmail: '', description: '' });
      setStatusMessage(null);
    }
  }, [isOpen]);

  const handleEditClick = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      contactEmail: dept.contactEmail || '',
      description: dept.description || ''
    });
    setActiveTab('new');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      if (editingDept) {
        await api.put(`/admin/departments/${editingDept.id}`, formData);
        setStatusMessage({ type: 'success', text: `Department "${formData.name}" updated successfully.` });
      } else {
        await api.post('/admin/departments', formData);
        setStatusMessage({ type: 'success', text: `Department "${formData.name}" created successfully.` });
      }
      setEditingDept(null);
      setFormData({ name: '', contactEmail: '', description: '' });
      fetchDepartments();
      if (onDepartmentUpdated) onDepartmentUpdated();
      setTimeout(() => {
        setActiveTab('list');
        setStatusMessage(null);
      }, 1200);
    } catch (err) {
      console.error("Department save failed", err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || "Failed to save department. Please verify fields and try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate department "${name}"? Existing tickets remain in the archive.`)) return;
    try {
      await api.put(`/admin/departments/${id}/deactivate`);
      fetchDepartments();
      if (onDepartmentUpdated) onDepartmentUpdated();
    } catch (err) {
      console.error("Failed to deactivate department", err);
      alert("Failed to deactivate department.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] p-0 rounded-3xl shadow-2xl text-[#1C2024] dark:text-[#FAF9F6] overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Campus Administration</span>
              <DialogTitle className="text-xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] mt-0.5">
                Department Management
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans mt-1">
                Configure academic and operational units responsible for grievance review and SLA resolution.
              </DialogDescription>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] p-1 rounded-xl mt-4 text-xs font-mono">
            <button
              type="button"
              onClick={() => { setActiveTab('list'); setEditingDept(null); }}
              className={`flex-1 py-2 font-medium text-center rounded-lg transition-all ${
                activeTab === 'list' 
                  ? 'bg-[#2B5D4F] text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active Departments ({departments.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('new'); setEditingDept(null); setFormData({ name: '', contactEmail: '', description: '' }); }}
              className={`flex-1 py-2 font-medium text-center rounded-lg transition-all ${
                activeTab === 'new' 
                  ? 'bg-[#2B5D4F] text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {editingDept ? "Edit Department" : "+ Add Department"}
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {statusMessage && (
            <div className={`p-3.5 mb-4 text-xs rounded-xl flex items-center gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-[#2B5D4F]/10 border-[#2B5D4F]/30 text-[#2B5D4F] dark:text-[#7EB5A6] font-medium'
                : 'bg-[#9B4A3F]/10 border-[#9B4A3F]/30 text-[#9B4A3F]'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'list' ? (
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2B5D4F]" />
                  Loading institutional departments...
                </div>
              ) : departments.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl">
                  No departments found. Click "+ Add Department" to create one.
                </div>
              ) : (
                departments.map(dept => (
                  <div key={dept.id} className="p-4 border border-[#E4E0D8]/80 dark:border-[#2A2E33]/80 bg-[#FAF9F6]/50 dark:bg-[#202428]/40 rounded-2xl flex items-start justify-between gap-4 hover:border-[#2B5D4F]/30 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-[#1C2024] dark:text-[#FAF9F6]">{dept.name}</span>
                        {dept.isActive !== false ? (
                          <span className="text-[10px] px-2.5 py-0.5 font-mono rounded-full bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6] border border-[#2B5D4F]/30">Active</span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 font-mono rounded-full bg-muted text-muted-foreground border border-border">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-sans line-clamp-2">{dept.description || "No description provided."}</p>
                      {dept.contactEmail && (
                        <p className="text-[11px] font-mono text-muted-foreground">Email: {dept.contactEmail}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(dept)}
                        className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] hover:bg-white dark:hover:bg-[#1A1D20] h-8 px-3 text-xs font-mono"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1 text-muted-foreground" /> Edit
                      </Button>
                      {dept.isActive !== false && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(dept.id, dept.name)}
                          className="rounded-xl text-[#9B4A3F] hover:bg-[#9B4A3F]/10 h-8 px-2.5 text-xs font-mono"
                          title="Deactivate Department"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <Label htmlFor="deptName" className="text-xs font-mono uppercase tracking-wider text-[#1C2024] dark:text-[#FAF9F6]">
                  Department Name <span className="text-[#9B4A3F]">*</span>
                </Label>
                <Input
                  id="deptName"
                  placeholder="e.g. Electrical & Electronics Engineering"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] text-sm h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactEmail" className="text-xs font-mono uppercase tracking-wider text-[#1C2024] dark:text-[#FAF9F6]">
                  Official Contact / Liaison Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="e.g. eee-dept@anits.edu.in"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] text-sm h-10 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deptDesc" className="text-xs font-mono uppercase tracking-wider text-[#1C2024] dark:text-[#FAF9F6]">
                  Description / Jurisdiction Scope
                </Label>
                <textarea
                  id="deptDesc"
                  rows={3}
                  placeholder="Describe the issues, classrooms, or services managed by this departmental unit..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] text-xs font-sans focus:border-[#2B5D4F] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E4E0D8] dark:border-[#2A2E33] flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setActiveTab('list'); setEditingDept(null); }}
                  className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] h-10 text-xs font-mono"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#2B5D4F] text-white hover:bg-[#234A3F] h-10 text-xs font-mono px-5 shadow-sm"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </span>
                  ) : (
                    <span>{editingDept ? "Update Department" : "Create Department"}</span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
