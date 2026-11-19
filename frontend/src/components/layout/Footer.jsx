import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  ShieldAlert, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink, 
  ChevronDown,
  Building2,
  FileCheck2
} from 'lucide-react';
import { Separator } from "@/components/ui/separator";

const FooterSection = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center cursor-pointer md:cursor-default py-2 md:py-0 md:pointer-events-none text-left"
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 md:hidden transition-transform duration-200 text-muted-foreground ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>
      <div
        className={`accordion-grid-wrapper md:!grid-template-rows-[1fr] ${isOpen ? 'is-open' : ''}`}
        data-state={isOpen ? 'open' : 'closed'}
      >
        <div className="accordion-grid-content pt-3 md:pt-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { user } = useSelector((state) => state.auth);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Role-appropriate internal navigation links
  const getNavLinks = () => {
    const role = user?.role?.toUpperCase();
    if (role === 'ADMIN') {
      return [
        { label: 'Admin Dashboard', path: '/dashboard' },
        { label: 'Institutional Archive', path: '/admin/grievances' },
        { label: 'Community Feed', path: '/recent-grievances' },
        { label: 'Profile & Access', path: '/profile' }
      ];
    }
    if (role === 'OFFICER') {
      return [
        { label: 'Officer Console', path: '/dashboard' },
        { label: 'Community Feed', path: '/recent-grievances' },
        { label: 'Profile & Security', path: '/profile' }
      ];
    }
    // Student / Public
    return [
      { label: 'Student Dashboard', path: '/dashboard' },
      { label: 'My Grievances', path: '/grievances' },
      { label: 'Lodge Grievance', path: '/grievances/new' },
      { label: 'Campus Community', path: '/recent-grievances' },
      { label: 'Profile Settings', path: '/profile' }
    ];
  };

  const navLinks = getNavLinks();

  return (
    <footer className="w-full border-t border-line bg-surface/80 text-ink pt-12 pb-8 px-4 sm:px-6 transition-colors">
      <div className="container max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          
          {/* Brand & Campus Identity */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/dashboard" className="flex items-center gap-2.5 group w-fit">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-white shadow-xs transition-transform group-hover:scale-105">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-lg text-ink leading-tight tracking-tight">
                  ResolveDesk
                </span>
                <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-accent">
                  ANITS Campus Portal
                </span>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed font-sans">
              Official student grievance redressal portal of Anil Neerukonda Institute of Technology & Sciences (Autonomous). Providing structured, confidential, and time-bound issue investigation.
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground border border-line bg-paper px-2 py-0.5 rounded-full">
                <Building2 className="w-3 h-3 text-accent" /> Autonomous
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground border border-line bg-paper px-2 py-0.5 rounded-full">
                <FileCheck2 className="w-3 h-3 text-accent" /> AICTE Approved
              </span>
            </div>
          </div>

          {/* Role-Aware Portal Navigation */}
          <FooterSection title="Navigation" defaultOpen={isDesktop}>
            <ul className="space-y-2.5 text-xs">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.path} 
                    className="text-muted-foreground hover:text-ink transition-colors flex items-center gap-2 group py-0.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-line group-hover:bg-accent transition-colors" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </FooterSection>

          {/* Campus Resources (Real Links to ANITS Resources) */}
          <FooterSection title="Campus Resources" defaultOpen={isDesktop}>
            <ul className="space-y-2.5 text-xs">
              {[
                { label: 'Official ANITS Website', url: 'https://www.anits.edu.in' },
                { label: 'Examinations & Results', url: 'https://www.anits.edu.in/examination.php' },
                { label: 'Anti-Ragging Committee', url: 'https://www.anits.edu.in/antiragging.php' },
                { label: 'Central Campus Library', url: 'https://www.anits.edu.in/library.php' }
              ].map((resource) => (
                <li key={resource.label}>
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-ink transition-colors flex items-center gap-2 group py-0.5"
                  >
                    <ExternalLink className="w-3 h-3 text-muted-foreground/60 group-hover:text-accent transition-colors shrink-0" />
                    <span>{resource.label}</span>
                  </a>
                </li>
              ))}
              <li>
                <Link 
                  to="/privacy-policy" 
                  className="text-muted-foreground hover:text-ink transition-colors flex items-center gap-2 group py-0.5"
                >
                  <span className="w-1 h-1 rounded-full bg-line group-hover:bg-accent transition-colors" />
                  <span>Redressal Regulations</span>
                </Link>
              </li>
            </ul>
          </FooterSection>

          {/* Contact & Redressal Cell */}
          <FooterSection title="Grievance Cell" defaultOpen={isDesktop}>
            <ul className="space-y-3.5 text-xs">
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-paper border border-line flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Redressal Email</p>
                  <a 
                    href="mailto:grievance@anits.edu.in" 
                    className="font-mono text-ink hover:text-accent transition-colors break-all"
                  >
                    grievance@anits.edu.in
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-paper border border-line flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Campus Helpline</p>
                  <a 
                    href="tel:+918933225083" 
                    className="font-mono text-ink hover:text-accent transition-colors"
                  >
                    +91 8933 225083
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-paper border border-line flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Campus Location</p>
                  <p className="text-muted-foreground leading-snug">
                    Sangivalasa, Bheemunipatnam Mandal, Visakhapatnam – 531162
                  </p>
                </div>
              </li>
            </ul>
          </FooterSection>
        </div>

        <Separator className="bg-line" />

        {/* Bottom Metadata & Legal Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span>&copy; {currentYear} ResolveDesk · Anil Neerukonda Institute of Technology & Sciences (ANITS)</span>
          </div>
          <div className="flex items-center gap-6">
            <Link 
              to="/privacy-policy" 
              className="hover:text-ink transition-colors"
            >
              Privacy Policy
            </Link>
            <a 
              href="https://www.anits.edu.in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-ink transition-colors inline-flex items-center gap-1"
            >
              <span>anits.edu.in</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
