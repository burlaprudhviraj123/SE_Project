import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Bell,
    Globe,
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    PlusCircle,
    ShieldAlert,
    Sun,
    User,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { logout } from '../../store/authSlice';

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Synchronize theme with document class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['USER', 'OFFICER', 'ADMIN'] },
    { name: 'Community', path: '/recent-grievances', icon: Globe, roles: ['USER', 'OFFICER', 'ADMIN'] },
    { name: 'My Grievances', path: '/grievances', icon: ShieldAlert, roles: ['USER'] },
    { name: 'New Grievance', path: '/grievances/new', icon: PlusCircle, roles: ['USER'] },
    { name: 'All Cases', path: '/admin/grievances', icon: ShieldAlert, roles: ['ADMIN'] },
  ];

  const filteredLinks = navLinks.filter(link => 
    link.roles.includes(user?.role?.toUpperCase())
  );

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#E4E0D8]/80 dark:border-[#2A2E33]/80 bg-[#FAF9F6]/85 dark:bg-[#121517]/85 backdrop-blur-md transition-all duration-300">
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4 sm:px-6">
        {/* Left: Branding */}
        <div className="flex items-center gap-3 md:gap-8">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2B5D4F] text-[#FAF9F6] shadow-sm transition-all group-hover:scale-105 group-hover:bg-[#234A3F]">
               <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-lg md:text-xl text-[#1C2024] dark:text-[#FAF9F6] leading-none tracking-tight">
                ResolveDesk
              </span>
              <span className="text-[9px] font-mono font-medium uppercase tracking-[0.25em] text-[#2B5D4F] dark:text-[#7EB5A6] mt-0.5">ANITS Campus Portal</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden xl:flex items-center gap-1.5 ml-4">
            {filteredLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                  isActive(link.path) 
                  ? 'text-[#2B5D4F] dark:text-[#7EB5A6] bg-[#2B5D4F]/10 border border-[#2B5D4F]/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-[#E4E0D8]/40 dark:hover:bg-[#22262B]'
                }`}
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-[#E4E0D8]/50 dark:hover:bg-[#22262B] transition-colors h-9 w-9"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#2B5D4F]" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            title="System Synchronization"
            className="relative rounded-full text-muted-foreground hover:text-foreground hover:bg-[#E4E0D8]/50 dark:hover:bg-[#22262B] transition-colors h-9 w-9"
            onClick={() => {
              if (window.location.pathname === '/dashboard') {
                window.location.reload();
              } else {
                toast.info("System Sync", {
                  description: "Dashboard state and credentials are up to date."
                });
              }
            }}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#2B5D4F]" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 rounded-full p-0 overflow-hidden border border-[#E4E0D8] dark:border-[#2A2E33] hover:border-[#2B5D4F]/50 transition-all focus-visible:outline-none">
                <div className="flex h-full w-full items-center justify-center bg-[#FAF9F6] dark:bg-[#1A1D20] text-[#2B5D4F] dark:text-[#7EB5A6] font-mono font-bold text-sm">
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0)}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mt-2 rounded-2xl border border-[#E4E0D8] dark:border-[#2A2E33] bg-white dark:bg-[#1A1D20] shadow-xl p-2" align="end">
              <DropdownMenuLabel className="font-normal py-2 px-2">
                <div className="flex flex-col space-y-1">
                  <p className="font-serif font-bold text-sm text-[#1C2024] dark:text-[#FAF9F6] leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs font-mono text-muted-foreground leading-none">{user?.email || user?.username}</p>
                  <div className="pt-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#2B5D4F]/10 border border-[#2B5D4F]/20 text-[10px] font-mono uppercase tracking-wider text-[#2B5D4F] dark:text-[#7EB5A6]">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 border-t border-[#E4E0D8] dark:border-[#2A2E33]" />
              <Link to="/profile">
                <DropdownMenuItem className="py-2 px-2.5 rounded-xl font-sans text-xs cursor-pointer hover:bg-[#FAF9F6] dark:hover:bg-[#22262B] transition-colors">
                  <User className="mr-2.5 h-3.5 w-3.5 text-muted-foreground" /> Profile Details
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="my-1 border-t border-[#E4E0D8] dark:border-[#2A2E33]" />
              <DropdownMenuItem 
                className="py-2 px-2.5 rounded-xl font-sans text-xs cursor-pointer text-[#9B4A3F] hover:bg-[#9B4A3F]/10 transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="mr-2.5 h-3.5 w-3.5" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="xl:hidden rounded-full"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#121517] p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-1.5">
            {filteredLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-mono font-medium transition-all ${
                  isActive(link.path) 
                  ? 'text-[#2B5D4F] dark:text-[#7EB5A6] bg-[#2B5D4F]/10 border border-[#2B5D4F]/20' 
                  : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <link.icon className="h-4 w-4" />
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
