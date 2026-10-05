import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Copy, Mail, UserPlus } from "lucide-react";
import api, { inviteStaff, getAdminDepartments } from '@/lib/api';
import { toast } from "sonner";

export const InviteStaffDialog = ({ onInviteSuccess }) => {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OFFICER');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);

  useEffect(() => {
    if (open) {
      getAdminDepartments()
        .then(res => setDepartments(res.data || []))
        .catch(err => console.error("Failed to fetch departments", err));
    } else {
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('OFFICER');
      setDepartmentId('');
      setError('');
      setInviteResult(null);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@anits.edu.in')) {
      setError('Staff email must belong to the ANITS domain (@anits.edu.in)');
      return;
    }

    if (role === 'OFFICER' && !departmentId) {
      setError('Please select a department for the Grievance Officer');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        role,
        departmentId: role === 'OFFICER' ? Number(departmentId) : null
      };

      const response = await inviteStaff(payload);
      setInviteResult(response.data);
      toast.success("Staff invitation dispatched successfully");
      if (onInviteSuccess) onInviteSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || 'Failed to dispatch staff invitation';
      setError(typeof errMsg === 'string' ? errMsg : 'Invitation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (inviteResult?.inviteToken) {
      const link = `${window.location.origin}/accept-invite?token=${inviteResult.inviteToken}`;
      navigator.clipboard.writeText(link);
      toast.success("Activation link copied to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 text-xs font-mono font-medium gap-2 border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] hover:bg-[#FAF9F6] dark:hover:bg-[#202428] text-[#1C2024] dark:text-[#FAF9F6] rounded-xl shadow-sm">
          <UserPlus className="w-4 h-4 text-[#2B5D4F] dark:text-[#7EB5A6]" />
          <span>Invite Staff</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-white dark:bg-[#1A1D20] border border-[#E4E0D8] dark:border-[#2A2E33] rounded-3xl p-6 sm:p-7 shadow-2xl text-[#1C2024] dark:text-[#FAF9F6]">
        <DialogHeader>
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Privileged Access</span>
          <DialogTitle className="text-xl font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6] mt-0.5">
            {inviteResult ? "Staff Invitation Dispatched" : "Invite Campus Staff"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-sans mt-1">
            {inviteResult
              ? "A 48-hour secure activation link has been generated."
              : "Provision an Officer or Admin account with an ANITS college email."}
          </DialogDescription>
        </DialogHeader>

        {inviteResult ? (
          <div className="space-y-4 py-2 font-sans">
            <div className="p-3.5 bg-[#2B5D4F]/10 border border-[#2B5D4F]/30 rounded-2xl flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#2B5D4F] dark:text-[#7EB5A6] flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-foreground">Invite created for {inviteResult.email}</p>
                <p className="text-muted-foreground">Role: <strong className="text-foreground">{inviteResult.role}</strong> (Valid for 48 hours)</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Activation Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/accept-invite?token=${inviteResult.inviteToken}`}
                  className="h-10 text-xs font-mono bg-[#FAF9F6] dark:bg-[#16191C] border-[#E4E0D8] dark:border-[#2A2E33] rounded-xl"
                />
                <Button size="sm" onClick={copyLink} className="h-10 px-4 bg-[#2B5D4F] hover:bg-[#234A3F] text-white gap-1.5 rounded-xl text-xs font-mono shadow-sm">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                (Mock delivery: invitation details are logged in backend server console).
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => setOpen(false)} className="w-full h-10 bg-[#2B5D4F] hover:bg-[#234A3F] text-white text-xs font-mono rounded-xl shadow-sm">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 py-2 font-sans">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="staffFirstName" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">First Name *</Label>
                <Input
                  id="staffFirstName"
                  placeholder="e.g. Ramesh"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-10 text-xs border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] rounded-xl focus:border-[#2B5D4F]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffLastName" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Last Name *</Label>
                <Input
                  id="staffLastName"
                  placeholder="e.g. Kumar"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-10 text-xs border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] rounded-xl focus:border-[#2B5D4F]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staffEmail" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">ANITS College Email *</Label>
              <Input
                id="staffEmail"
                type="email"
                placeholder="staff@anits.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] rounded-xl font-mono focus:border-[#2B5D4F]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Assigned Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-10 text-xs border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] rounded-xl font-mono">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="border-[#E4E0D8] dark:border-[#2A2E33] rounded-xl">
                    <SelectItem value="OFFICER" className="text-xs font-mono">Grievance Officer</SelectItem>
                    <SelectItem value="ADMIN" className="text-xs font-mono">Campus Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === 'OFFICER' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Department *</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className="h-10 text-xs border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] rounded-xl font-mono">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="border-[#E4E0D8] dark:border-[#2A2E33] rounded-xl">
                      {departments.filter(d => d.isActive !== false).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)} className="text-xs font-mono">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#9B4A3F]/10 border border-[#9B4A3F]/30 flex items-center gap-2 text-[#9B4A3F] text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={loading} className="w-full h-10 bg-[#2B5D4F] hover:bg-[#234A3F] text-white text-xs font-mono rounded-xl shadow-sm">
                {loading ? "Generating Invitation..." : "Send Staff Invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default InviteStaffDialog;
