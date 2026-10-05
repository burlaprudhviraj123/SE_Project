import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Shield, Building2, UserCheck, UserX, Loader2, CheckCircle2, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import ConfirmDialog from './ConfirmDialog';

export default function AdminUsersDialog({ isOpen, onClose, onUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusMessage, setStatusMessage] = useState(null);

  // Reassignment modal state
  const [reassignState, setReassignState] = useState({
    isOpen: false,
    user: null,
    targetDeptId: ''
  });

  // Action confirmation state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    type: 'warning',
    action: null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/admin/users?page=0&size=100'),
        api.get('/admin/departments')
      ]);
      setUsers(usersRes.data.content || usersRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (err) {
      console.error("Failed to load user directory", err);
      setStatusMessage({ type: 'error', text: "Unable to retrieve institutional user directory." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setSearchTerm('');
      setRoleFilter('ALL');
      setStatusFilter('ALL');
      setStatusMessage(null);
    }
  }, [isOpen]);

  const handleToggleActive = (user) => {
    const nextStatus = !user.isActive;
    const actionLabel = nextStatus ? "Reactivate" : "Deactivate";
    setConfirmModal({
      isOpen: true,
      title: `${actionLabel} User Account?`,
      description: nextStatus
        ? `Reactivate account for ${user.fullName || user.username} (${user.email})?`
        : `Deactivating ${user.fullName || user.username} will revoke access. Any currently assigned in-progress grievances will be automatically returned to the departmental queue.`,
      type: nextStatus ? 'info' : 'warning',
      action: async () => {
        try {
          await api.put(`/admin/users/${user.id}/toggle-active?isActive=${nextStatus}`);
          setStatusMessage({
            type: 'success',
            text: `Account for ${user.username} is now ${nextStatus ? 'active' : 'deactivated'}.`
          });
          fetchData();
          if (onUserUpdated) onUserUpdated();
        } catch (err) {
          console.error("Toggle active failed", err);
          setStatusMessage({ type: 'error', text: "Failed to update account active status." });
        }
      }
    });
  };

  const handleChangeRole = (user, newRole) => {
    if (user.role === newRole) return;
    setConfirmModal({
      isOpen: true,
      title: `Modify User Role?`,
      description: `Change role of ${user.fullName || user.username} from ${user.role} to ${newRole}? If changing an active officer, in-progress cases will return to the department pool.`,
      type: 'warning',
      action: async () => {
        try {
          await api.put(`/admin/users/${user.id}/role?role=${newRole}`);
          setStatusMessage({
            type: 'success',
            text: `Role for ${user.username} successfully updated to ${newRole}.`
          });
          fetchData();
          if (onUserUpdated) onUserUpdated();
        } catch (err) {
          console.error("Change role failed", err);
          setStatusMessage({
            type: 'error',
            text: err.response?.data?.message || "Failed to update user role."
          });
        }
      }
    });
  };

  const handleOpenReassign = (user) => {
    setReassignState({
      isOpen: true,
      user,
      targetDeptId: user.departmentId ? String(user.departmentId) : ''
    });
  };

  const handleConfirmReassign = async () => {
    if (!reassignState.user || !reassignState.targetDeptId) return;

    try {
      await api.put(`/admin/users/${reassignState.user.id}/department?departmentId=${reassignState.targetDeptId}`);
      setStatusMessage({
        type: 'success',
        text: `Department for ${reassignState.user.username} reassigned. Active cases returned to previous pool.`
      });
      setReassignState({ isOpen: false, user: null, targetDeptId: '' });
      fetchData();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      console.error("Reassignment failed", err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || "Failed to reassign officer department."
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      user.username?.toLowerCase().includes(term) ||
      user.fullName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.departmentName?.toLowerCase().includes(term);

    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && user.isActive !== false) ||
      (statusFilter === 'DEACTIVATED' && user.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-4xl bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] p-0 rounded-3xl shadow-2xl text-[#1C2024] dark:text-[#FAF9F6] overflow-hidden">
          
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Campus Administration</span>
                <DialogTitle className="text-xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] mt-0.5">
                  Institutional Staff & User Directory
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-sans mt-1">
                  Manage college accounts, department assignments, and audit active user privileges.
                </DialogDescription>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#E4E0D8] dark:border-[#2A2E33]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3.5" />
                <Input
                  placeholder="Search name, username, @anits..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] text-xs pl-8 h-10 font-mono"
                />
              </div>

              <div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] text-xs h-10 font-mono">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20]">
                    <SelectItem value="ALL" className="text-xs font-mono">All Roles ({users.length})</SelectItem>
                    <SelectItem value="OFFICER" className="text-xs font-mono">Officers</SelectItem>
                    <SelectItem value="ADMIN" className="text-xs font-mono">Administrators</SelectItem>
                    <SelectItem value="USER" className="text-xs font-mono">Students (Users)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] text-xs h-10 font-mono">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20]">
                    <SelectItem value="ALL" className="text-xs font-mono">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE" className="text-xs font-mono">Active Only</SelectItem>
                    <SelectItem value="DEACTIVATED" className="text-xs font-mono">Deactivated Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="p-6 max-h-[62vh] overflow-y-auto">
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

            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2B5D4F]" />
                Querying institutional directory...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground border border-dashed border-[#E4E0D8] dark:border-[#2A2E33] rounded-2xl">
                No users match the specified criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="p-4 bg-[#FAF9F6]/50 dark:bg-[#202428]/40 border border-[#E4E0D8]/80 dark:border-[#2A2E33]/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2B5D4F]/30 transition-all">
                    
                    {/* User Identity Info */}
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-[#1C2024] dark:text-[#FAF9F6]">
                          {u.fullName || u.username}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          (@{u.username})
                        </span>
                      </div>
                      
                      <p className="text-xs font-mono text-muted-foreground">{u.email}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Department Badge */}
                        {u.departmentName && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#2B5D4F]/30 bg-[#2B5D4F]/5 text-[#2B5D4F] dark:text-[#7EB5A6]">
                            <Building2 className="w-3 h-3" /> {u.departmentName}
                          </span>
                        )}
                        
                        {/* Role Badge */}
                        {u.role === 'ADMIN' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#9B4A3F]/30 bg-[#9B4A3F]/10 text-[#9B4A3F]">
                            Admin
                          </span>
                        )}
                        {u.role === 'OFFICER' && !u.departmentName && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#B8862E]/30 bg-[#B8862E]/10 text-[#B8862E]">
                            Officer (Unassigned)
                          </span>
                        )}
                        {u.role === 'USER' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground">
                            Student
                          </span>
                        )}

                        {/* Active Indicator */}
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium ml-1">
                          <span className={`w-2 h-2 rounded-full ${u.isActive !== false ? 'bg-[#3F6B4A]' : 'bg-[#9B4A3F]'}`} />
                          <span className="text-muted-foreground text-[10px] font-mono">
                            {u.isActive !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      
                      {/* Department Assignment for Officers */}
                      {u.role === 'OFFICER' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReassign(u)}
                          className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] hover:bg-white dark:hover:bg-[#1A1D20] h-8 px-3 text-xs font-mono"
                        >
                          <Building2 className="w-3.5 h-3.5 mr-1 text-[#2B5D4F]" /> Reassign
                        </Button>
                      )}

                      {/* Role Dropdown */}
                      <Select
                        value={u.role}
                        onValueChange={(newRole) => handleChangeRole(u, newRole)}
                      >
                        <SelectTrigger className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] text-xs font-mono h-8 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20]">
                          <SelectItem value="USER" className="text-xs font-mono">Student</SelectItem>
                          <SelectItem value="OFFICER" className="text-xs font-mono">Officer</SelectItem>
                          <SelectItem value="ADMIN" className="text-xs font-mono">Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Deactivate / Reactivate Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(u)}
                        className={`rounded-xl h-8 px-2.5 text-xs font-mono ${
                          u.isActive !== false
                            ? 'text-[#9B4A3F] hover:bg-[#9B4A3F]/10'
                            : 'text-[#2B5D4F] hover:bg-[#2B5D4F]/10'
                        }`}
                        title={u.isActive !== false ? "Deactivate User" : "Reactivate User"}
                      >
                        {u.isActive !== false ? (
                          <>
                            <UserX className="w-3.5 h-3.5 mr-1" /> Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 mr-1" /> Restore
                          </>
                        )}
                      </Button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Officer Department Sub-Modal */}
      <Dialog open={reassignState.isOpen} onOpenChange={(open) => !open && setReassignState({ isOpen: false, user: null, targetDeptId: '' })}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] p-6 rounded-3xl text-[#1C2024] dark:text-[#FAF9F6] shadow-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="font-serif font-bold text-lg">
              Reassign Officer Department
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Assign {reassignState.user?.fullName || reassignState.user?.username} to a new jurisdiction node.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 font-sans">
            {/* Warning Audit Notice */}
            <div className="p-3.5 rounded-2xl bg-[#B8862E]/10 border border-[#B8862E]/30 text-xs text-[#B8862E] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Audit Notice:</strong>
                Reassigning this officer will automatically unassign their active in-progress grievances and return them to the original department pool for reassignment.
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-[#1C2024] dark:text-[#FAF9F6]">
                Target Department *
              </Label>
              <Select
                value={reassignState.targetDeptId}
                onValueChange={(val) => setReassignState(prev => ({ ...prev, targetDeptId: val }))}
              >
                <SelectTrigger className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] text-xs font-mono h-10">
                  <SelectValue placeholder="Select destination department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33]">
                  {departments.filter(d => d.isActive !== false).map(dept => (
                    <SelectItem key={dept.id} value={String(dept.id)} className="text-xs font-mono">
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-3 border-t border-[#E4E0D8] dark:border-[#2A2E33] flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReassignState({ isOpen: false, user: null, targetDeptId: '' })}
                className="rounded-xl border-[#E4E0D8] dark:border-[#2A2E33] text-xs font-mono h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmReassign}
                disabled={!reassignState.targetDeptId}
                className="rounded-xl bg-[#2B5D4F] text-white hover:bg-[#234A3F] text-xs font-mono h-9 px-4 shadow-sm"
              >
                Confirm Reassignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (confirmModal.action) confirmModal.action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
      />
    </>
  );
}
