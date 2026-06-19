import React, { useState, useEffect } from 'react';
import { Project } from './types';
import ShowcaseView from './components/ShowcaseView';
import AdminView from './components/AdminView';
import { supabase } from './supabase';
import { 
  Phone, 
  Mail, 
  Compass, 
  FolderLock, 
  ChevronRight, 
  Sparkles,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function App() {
  // Navigation: 'showcase' (client view) or 'admin' (admin console)
  const [currentView, setCurrentView] = useState<'showcase' | 'admin'>('showcase');
  
  // App core states loaded from database
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load projects and leads from server-side database on startup
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch albums
      const { data: projData, error: projError } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (projError) throw projError;
      setProjects(projData as Project[] || []);

      // Fetch estimate leads
      const { data: leadData, error: leadError } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (leadError) throw leadError;
      setLeads(leadData || []);
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Callback to add project
  const handleAddProject = async (newProject: Project) => {
    try {
      const { error } = await supabase.from('projects').upsert(newProject);
      if (error) throw error;
      
      setProjects((prev) => {
        const index = prev.findIndex((p) => p.id === newProject.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = newProject;
          return updated;
        }
        return [newProject, ...prev];
      });
    } catch (err) {
      console.error('Error saving portfolio album:', err);
    }
  };

  // Callback to delete project
  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting portfolio project:', err);
    }
  };

  // Callback to add estimate lead
  const handleAddLead = async (newLead: any) => {
    try {
      const { error } = await supabase.from('leads').upsert(newLead);
      if (error) throw error;
      setLeads((prev) => [newLead, ...prev]);
    } catch (err) {
      console.error('Error saving client request lead:', err);
    }
  };

  // Callback to delete/clear a lead
  const handleDeleteLead = async (id: string) => {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error('Error dismissing lead:', err);
    }
  };

  return (
    <div id="application-root-container" className="min-h-screen flex flex-col bg-[#FAF9F5] text-neutral-800">
      
      {/* 👑 ELEGANT STICKY PORTAL HEADER */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-neutral-200/70 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          {/* Logo vector icon or name */}
          <div 
            onClick={() => setCurrentView('showcase')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <img 
              src="https://images.squarespace-cdn.com/content/v1/66a77acb211ac10e3bf86bec/1722251981226-SYQVHO5AJ0PF4EJWRTDQ/Company+Logo.png?format=1500w" 
              alt="NYC Blest Paintings" 
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-103"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Quick Hub Navigation Controls */}
          <div className="flex items-center gap-3 sm:gap-6 text-xs font-mono font-medium tracking-wide">
            <button
              onClick={() => setCurrentView('showcase')}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 px-3 rounded-lg font-semibold ${
                currentView === 'showcase' 
                  ? 'text-brand-gold bg-brand-gold/10 border border-brand-gold/30' 
                  : 'text-neutral-500 hover:text-neutral-900 border border-transparent'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">Portfolio Showcase</span>
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 px-3 rounded-lg font-semibold ${
                currentView === 'admin' 
                  ? 'text-brand-gold bg-brand-gold/10 border border-brand-gold/30' 
                  : 'text-neutral-500 hover:text-neutral-900 border border-transparent'
              }`}
            >
              <FolderLock className="w-4 h-4" />
              <span className="hidden sm:inline">Crew Console</span>
            </button>
            
            {/* Quick Contacts Header Actions */}
            <a 
              href="tel:646-706-1238" 
              className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] sm:text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-brand-gold fill-brand-gold/10" />
              <span className="font-mono">646-706-1238</span>
            </a>
          </div>

        </div>
      </header>

      {/* 🚀 PRIMARY ACTIVE AREA */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 w-full py-6">
        
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center my-32 animate-fade-in">
            <div className="w-12 h-12 border-4 border-brand-gold/15 border-t-brand-gold rounded-full animate-spin mb-4" />
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              Connecting NYC Blest Studio...
            </span>
          </div>
        ) : (
          <div className="animate-fade-in duration-300">
            {currentView === 'showcase' && (
              <ShowcaseView 
                projects={projects} 
                onAddLead={handleAddLead} 
              />
            )}
            {currentView === 'admin' && (
              <AdminView 
                projects={projects} 
                leads={leads}
                onAddProject={handleAddProject}
                onDeleteProject={handleDeleteProject}
                onDeleteLead={handleDeleteLead}
              />
            )}
          </div>
        )}

      </main>

      {/* 📞 STICKY FOOTER VISUAL BRANDING BAR */}
      <footer className="bg-white border-t border-neutral-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-neutral-100 pb-10">
            
            {/* Left Col: Core branding details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <img 
                  src="https://images.squarespace-cdn.com/content/v1/66a77acb211ac10e3bf86bec/1722251981226-SYQVHO5AJ0AJ0PF4EJWRTDQ/Company+Logo.png?format=1500w" 
                  onError={(e) => {
                    // Fallback just in case Squarespace hotlink has rendering rules in some frames
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  srcSet="https://images.squarespace-cdn.com/content/v1/66a77acb211ac10e3bf86bec/1722251981226-SYQVHO5AJ0PF4EJWRTDQ/Company+Logo.png?format=1500w"
                  alt="NYC Blest Paintings" 
                  className="h-10 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="font-display font-extrabold tracking-wider text-neutral-900 text-base leading-none">
                  NYC BLEST
                </span>
              </div>
              <p className="text-xs text-neutral-550 font-light leading-relaxed max-w-xs">
                Premium commercial & residential custom painting, cabinet sprays, lacquering, and weatherproofing services across NY. Fully insured, high-end fine finishes.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-neutral-600 font-mono">
                <MapPin className="w-3.5 h-3.5 text-brand-gold" />
                <span>Serving Manhattan, Brooklyn, & Queens</span>
              </div>
            </div>

            {/* Center Col: Contacts */}
            <div className="space-y-4">
              <h6 className="text-xs font-mono font-medium text-brand-gold uppercase tracking-wider">
                Direct Contact Links
              </h6>
              
              <div className="space-y-3 font-mono text-xs">
                <a 
                  href="tel:646-706-1238" 
                  className="flex items-center gap-2.5 text-neutral-600 hover:text-neutral-900 transition-colors font-medium text-sm"
                >
                  <Phone className="w-4 h-4 text-brand-gold fill-brand-gold/10" />
                  <span>646-706-1238</span>
                </a>

                <a 
                  href="mailto:frank@blestspaintings.com" 
                  className="flex items-center gap-2.5 text-neutral-600 hover:text-neutral-900 transition-colors break-all"
                >
                  <Mail className="w-4 h-4 text-brand-gold" />
                  <span>frank@blestspaintings.com</span>
                </a>
                
                <div className="flex items-center gap-2.5 text-neutral-500">
                  <Clock className="w-4 h-4 text-brand-gold" />
                  <span>Mon - Sat: 7:00 AM - 7:00 PM</span>
                </div>
              </div>
            </div>

            {/* Right Col: Certifications & Trust flags */}
            <div className="space-y-4">
              <h6 className="text-xs font-mono font-medium text-brand-gold uppercase tracking-wider">
                Our Guarantee
              </h6>
              <div className="space-y-2.5 text-xs text-neutral-600">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
                  <p className="font-light leading-snug text-neutral-600">
                    <span className="font-bold text-neutral-800">Fully Insured & Licensed</span>: Safety and liability protection guaranteed for high-rise interiors and large-scale facades.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
                  <p className="font-light leading-snug text-neutral-600">
                    <span className="font-bold text-neutral-800">3-Year Workmanship Warranty</span> on all residential cabinetry coating and facade restorations.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Subfooter copyrights row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 font-mono gap-4">
            <p>© {new Date().getFullYear()} NYC Blest Paintings. All rights reserved.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setCurrentView('admin')}
                className="hover:text-black hover:underline cursor-pointer"
              >
                Crew Portal
              </button>
              <span>●</span>
              <a href="tel:646-706-1238" className="hover:text-black hover:underline">
                Call Frank
              </a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
