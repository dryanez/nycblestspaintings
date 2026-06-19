import React, { useState, useEffect } from 'react';
import { Project, Category, Photo } from '../types';
import BeforeAfterSlider from './BeforeAfterSlider';
import LazyImage from './LazyImage';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  Brush, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sliders, 
  Calculator, 
  Calendar,
  CheckCircle,
  Clock,
  Camera,
  Paperclip
} from 'lucide-react';
import { supabase } from '../supabase';

interface ShowcaseViewProps {
  projects: Project[];
  onAddLead: (lead: any) => void;
}

export function isVideoUrl(url: string, mediaType?: string): boolean {
  if (mediaType === 'video') return true;
  const lowercase = url.toLowerCase();
  return (
    lowercase.endsWith('.mp4') || 
    lowercase.endsWith('.webm') || 
    lowercase.endsWith('.mov') || 
    lowercase.endsWith('.ogg') ||
    url.startsWith('data:video/')
  );
}

export default function ShowcaseView({ projects, onAddLead }: ShowcaseViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  
  // Swipe logic states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(false);
  const minSwipeDistance = 50;
  
  // Detailed Quote Formulator State (Replaces simple cost calculator)
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [calcStep, setCalcStep] = useState(1);
  const [calcName, setCalcName] = useState('');
  const [calcPhone, setCalcPhone] = useState('');
  const [calcEmail, setCalcEmail] = useState('');
  const [calcCategory, setCalcCategory] = useState<Category>('Interior');
  
  // Custom formulation state fields
  const [scopeOptions, setScopeOptions] = useState<string[]>([]); // E.g. Wall painting, trims/doors, lacquer, woodwork, other
  const [otherScopeText, setOtherScopeText] = useState('');
  const [descriptionText, setDescriptionText] = useState(''); // Text describing what they want to do
  const [timeframe, setTimeframe] = useState<string>('Flexible'); // ASAP, 1 Month, Flexible
  const [attachedPhotoUrl, setAttachedPhotoUrl] = useState<string>(''); // Customer picture uploaded path
  const [isPhotoUploading, setIsPhotoUploading] = useState<boolean>(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);

  // Filter projects by selected category
  const filteredProjects = selectedCategory === 'All' 
    ? projects 
    : projects.filter(p => p.category === selectedCategory);

  // Group before/after pairs for the standalone showcase section
  const beforeAfterPairs = projects.reduce((acc: Array<{ before: Photo; after: Photo; projectName: string }>, proj) => {
    const beforePhoto = proj.photos.find(p => p.type === 'Before');
    const afterPhoto = proj.photos.find(p => p.type === 'After');
    if (beforePhoto && afterPhoto) {
      acc.push({
        before: beforePhoto,
        after: afterPhoto,
        projectName: proj.name
      });
    }
    return acc;
  }, []);

  const handleClientFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsPhotoUploading(true);
    const file = files[0];
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });

      const extension = file.name.split('.').pop() || 'jpg';
      const uniqueName = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${extension}`;
      
      const { error: uploadError } = await supabase.storage.from('uploads').upload(uniqueName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(uniqueName);
      const downloadUrl = publicUrl;
      setAttachedPhotoUrl(downloadUrl);
    } catch (err) {
      console.error('Error uploading customer photo:', err);
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleToggleScopeOption = (opt: string) => {
    setScopeOptions(prev => 
      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
    );
  };

  // Handle quote formulation submission
  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcName || !calcPhone) return;

    // Compile beautiful multiline description detailing the job
    let scopeStr = scopeOptions.join(', ');
    if (scopeOptions.includes('Other') && otherScopeText) {
      scopeStr = scopeStr.replace('Other', `Other (${otherScopeText})`);
    } else if (scopeOptions.length === 0) {
      scopeStr = 'Not specified';
    }

    let compiledDetails = `Service Category Needed: ${calcCategory}\n`;
    compiledDetails += `Scope Specifications: ${scopeStr}\n`;
    compiledDetails += `Timeframe Goal: ${timeframe}\n\n`;
    compiledDetails += `Project Goals & Description:\n${descriptionText || 'No custom description provided.'}`;
    
    if (attachedPhotoUrl) {
      compiledDetails += `\n\n[Attached Photo: ${attachedPhotoUrl}]`;
    }

    const newLead = {
      id: `lead-${Date.now()}`,
      clientName: calcName,
      phone: calcPhone,
      email: calcEmail || 'frank@blestspaintings.com',
      serviceType: calcCategory,
      details: compiledDetails,
      estimatedPrice: 0, // Formulation leads have 0 or TBD pricing until Frank reviews
      createdAt: new Date().toISOString()
    };

    onAddLead(newLead);
    setQuoteSuccess(true);
    setTimeout(() => {
      setQuoteOpen(false);
      setQuoteSuccess(false);
      
      // Reset forms
      setCalcStep(1);
      setCalcName('');
      setCalcPhone('');
      setCalcEmail('');
      setCalcCategory('Interior');
      setScopeOptions([]);
      setOtherScopeText('');
      setDescriptionText('');
      setTimeframe('Flexible');
      setAttachedPhotoUrl('');
    }, 4500);
  };

  const openProjectGallery = (proj: Project) => {
    setActiveProject(proj);
    setActivePhotoIndex(0);
    setShowSwipeHint(true);
    setTimeout(() => setShowSwipeHint(false), 3000); // Hide hint after 3 seconds
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNextPhoto();
    }
    if (isRightSwipe) {
      handlePrevPhoto();
    }
  };

  const handleNextPhoto = () => {
    if (!activeProject) return;
    setActivePhotoIndex((prev) => (prev + 1) % activeProject.photos.length);
  };

  const handlePrevPhoto = () => {
    if (!activeProject) return;
    setActivePhotoIndex((prev) => (prev - 1 + activeProject.photos.length) % activeProject.photos.length);
  };

  return (
    <div id="showcase-view-container" className="py-4 font-sans text-neutral-800">
      
      {/* 🚀 HIGHLIGHT STICKY TOP BRAND REEL */}
      <section className="relative overflow-hidden py-16 md:py-24 bg-white border border-neutral-200/75 rounded-3xl mb-12 shadow-xs">
        <div className="absolute inset-0 bg-radial-at-t from-brand-gold/5 via-transparent to-transparent opacity-80" />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-gold/10 text-neutral-900 text-xs font-mono tracking-widest uppercase border border-brand-gold/20 mb-6 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-spin" style={{ animationDuration: '6s' }} />
            <span>Master Craftsmen of New York</span>
          </div>
          
          {/* Logo brand central integration */}
          <div className="flex justify-center mb-6">
            <img 
              src="https://images.squarespace-cdn.com/content/v1/66a77acb211ac10e3bf86bec/1722251981226-SYQVHO5AJ0PF4EJWRTDQ/Company+Logo.png?format=1500w" 
              alt="NYC Blest Logo" 
              className="h-28 sm:h-36 md:h-48 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="mt-6 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto font-light leading-relaxed">
            Uncompromising quality. Furniture-grade spraying, interior detailing, and historic brownstone restoration across Manhattan and Brooklyn.
          </p>
          
          <div className="mt-10 flex flex-wrap gap-4 items-center justify-center">
            <a 
              href="tel:646-706-1238" 
              className="flex items-center gap-2 bg-neutral-900 text-white hover:bg-neutral-800 px-6 py-3.5 rounded-xl font-bold transition-all text-sm shadow-md"
            >
              <Phone className="w-4 h-4 fill-white text-white" />
              <span>Call 646-706-1238</span>
            </a>
            <button 
              onClick={() => setQuoteOpen(true)}
              className="flex items-center gap-2 bg-white text-neutral-950 border border-neutral-350 hover:bg-neutral-50 px-6 py-3.5 rounded-xl font-bold transition-all text-sm shadow-sm"
            >
              <Calculator className="w-4 h-4 text-brand-gold" />
              <span>Instant Cost Estimate</span>
            </button>
          </div>
        </div>
      </section>

      {/* 🌟 REVOLUTIONARY BEFORE & AFTER INTERACTIVE SLIDER FEATURE REEL (Preserved in code but hidden by user request) */}
      {false && beforeAfterPairs.length > 0 && (
        <section id="interactive-comparisons" className="mb-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-brand-gold text-xs font-mono uppercase tracking-widest mb-1 font-semibold">
                <Sliders className="w-4 h-4" />
                <span>Interactive Transformations</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-medium text-neutral-900">Before & After Slider Demo</h2>
            </div>
            <p className="text-xs text-neutral-550 mt-2 md:mt-0 max-w-md">
              Drag the golden slider dynamically to closely observe our premium primers, surface leveling, and precision topcoats.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {beforeAfterPairs.slice(0, 2).map((pair, idx) => (
              <div key={idx} className="bg-white p-4 border border-neutral-200/80 rounded-2xl shadow-xs">
                <h3 className="text-sm font-semibold tracking-wide text-neutral-800 mb-3 flex items-center justify-between">
                  <span>{pair.projectName}</span>
                  <span className="text-[10px] bg-brand-gold/10 border border-brand-gold/20 text-neutral-900 px-2.5 py-0.5 rounded font-mono font-medium">Slide comparison</span>
                </h3>
                <BeforeAfterSlider 
                  beforeUrl={pair.before.url} 
                  afterUrl={pair.after.url}
                  beforeLabel={pair.before.caption || 'Before Restoration'}
                  afterLabel={pair.after.caption || 'After Blest Finish'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 🔮 CORE ALBUMS FILTER & LANDING GRID */}
      <section id="portfolio-galleries" className="my-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-brand-gold text-xs font-mono uppercase tracking-widest mb-1 font-semibold">
              <Brush className="w-4 h-4" />
              <span>Job Showcase</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-medium text-neutral-900">Our Masterwork Portfolio</h2>
          </div>

          {/* Elegant pill categories filters */}
          <div className="flex flex-wrap gap-2">
            {(['All', 'Interior', 'Exterior', 'Cabinets', 'Commercial'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-semibold tracking-wide rounded-full transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-brand-gold text-neutral-950 shadow-xs'
                    : 'bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-200/80 hover:text-neutral-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry or Grid Display of Projects Cover Cards */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-24 bg-white border border-neutral-200 rounded-2xl">
            <Brush className="w-10 h-10 text-neutral-400 mx-auto mb-4 animate-bounce" />
            <p className="text-lg text-neutral-800 font-display font-semibold">No projects found in this category.</p>
            <p className="text-sm text-neutral-500 mt-1">Check back later or view all categories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {filteredProjects.map((proj) => {
              // Get standard or After cover image, fallback to first photo
              const coverPhoto = proj.photos.find(p => p.type === 'After') || proj.photos.find(p => p.type === 'Standard') || proj.photos[0];
              const beforeCount = proj.photos.filter(p => p.type === 'Before').length;
              const hasBeforeAfter = beforeCount > 0 && proj.photos.some(p => p.type === 'After');

              return (
                <div
                  id={`project-card-${proj.id}`}
                  key={proj.id}
                  onClick={() => openProjectGallery(proj)}
                  className="group bg-white border border-neutral-200/90 hover:border-brand-gold/30 rounded-2xl overflow-hidden cursor-pointer shadow-xs transition-all duration-300 hover:translate-y-[-4px]"
                >
                  <div className="relative overflow-hidden w-full h-[280px]">
                    <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent z-10" />
                    
                    {coverPhoto ? (
                      isVideoUrl(coverPhoto.url, coverPhoto.mediaType) ? (
                        <video 
                          src={coverPhoto.url} 
                          className="w-full h-full object-cover group-hover:scale-105 duration-700 transition-transform" 
                          muted 
                          loop 
                          playsInline 
                          autoPlay
                        />
                      ) : (
                        <LazyImage 
                          src={coverPhoto.url} 
                          alt={proj.name}
                          aspectRatio="h-full w-full"
                          className="group-hover:scale-105 duration-700" 
                        />
                      )
                    ) : (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                        <Brush className="w-12 h-12 text-neutral-350" />
                      </div>
                    )}

                    {/* Tags Layer */}
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                      <span className="text-[10px] bg-neutral-900/95 text-brand-gold px-3 py-1 rounded-full border border-neutral-700 font-mono font-medium uppercase tracking-wider">
                        {proj.category}
                      </span>
                      {hasBeforeAfter && (
                        <span className="text-[10px] bg-red-900/95 text-red-200 px-3 py-1 rounded-full border border-red-700/60 font-mono font-medium uppercase tracking-wider flex items-center gap-1">
                          <Sliders className="w-2.5 h-2.5" />
                          <span>Before & After Included</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata Layer */}
                    <div className="absolute bottom-4 left-4 right-4 z-20">
                      <h3 className="text-xl font-display font-semibold text-white tracking-tight group-hover:text-brand-gold transition-colors">
                        {proj.name}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-neutral-200 mt-1 font-mono">
                        <span>{proj.photos.length} item{proj.photos.length !== 1 ? 's' : ''} (photo/video)</span>
                        <span className="flex items-center gap-1 text-white font-sans group-hover:text-brand-gold duration-200">
                          View details <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle card summary details */}
                  <div className="p-5 border-t border-neutral-100 min-h-[90px] flex items-center">
                    <p className="text-sm text-neutral-600 line-clamp-2 md:line-clamp-3 font-light leading-relaxed">
                      {proj.description || 'Pristine professional painting services by Blest Paintings specialists.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 🖼️ SWIPEABLE RICH LIGHTBOX OVERLAY / GALLERY MODAL */}
      {activeProject && (
        <div id="gallery-lightbox-modal" className="fixed inset-0 bg-[#070708]/98 backdrop-blur-lg z-50 overflow-y-auto flex flex-col justify-between">
          
          {/* Header Bar */}
          <div className="sticky top-0 p-4 bg-[#070708]/80 backdrop-blur-xs border-b border-neutral-900 flex items-center justify-between z-10">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37]">
                Currently Viewing: {activeProject.category}
              </span>
              <h4 className="text-lg md:text-xl font-display font-bold text-white leading-tight">
                {activeProject.name}
              </h4>
            </div>
            
            <button
              onClick={() => setActiveProject(null)}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-850 rounded-full border border-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Showcase Swiper Stage */}
          <div className="my-auto py-6 px-4 max-w-6xl mx-auto w-full flex flex-col items-center">
            
            {/* Interactive sliders or standard render */}
            <div className="w-full relative flex flex-col md:flex-row gap-8 items-center justify-center">
              
              {/* Previous Photo Button - Hidden on mobile in favor of swipe */}
              {activeProject.photos.length > 1 && (
                <button
                  onClick={handlePrevPhoto}
                  className="hidden md:block absolute left-2 md:relative md:left-0 z-25 p-3 rounded-full bg-neutral-900/80 border border-neutral-850 text-white hover:bg-brand-gold hover:text-black hover:border-transparent transition-all cursor-pointer shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Central Dynamic Stage Element */}
              <div className="w-full max-w-3xl flex flex-col items-center">
                {/* Check if current photo is Before/After and we can construct a slider, or show it simply */}
                {activeProject.photos[activePhotoIndex].type === 'Before' && 
                 activeProject.photos.some(p => p.type === 'After') ? (
                  // Offer Before/After Slider instead of normal image if pair exists
                  <div className="w-full bg-neutral-950 p-3 rounded-2xl border border-neutral-900">
                    <div className="flex justify-between items-center text-xs text-neutral-400 mb-2 font-mono">
                      <span>Before / After Transformation Slider</span>
                      <span className="text-brand-gold">Drag Line</span>
                    </div>
                    <BeforeAfterSlider 
                      beforeUrl={activeProject.photos[activePhotoIndex].url}
                      afterUrl={activeProject.photos.find(p => p.type === 'After')?.url || activeProject.photos[activePhotoIndex].url}
                      beforeLabel={activeProject.photos[activePhotoIndex].caption || 'Before Restoration'}
                      afterLabel={activeProject.photos.find(p => p.type === 'After')?.caption || 'After Blest Finish'}
                    />
                  </div>
                ) : (
                  // Simple high resolution slide display
                  <div 
                    className="w-full flex flex-col items-center bg-neutral-950 p-2 md:p-2 rounded-2xl md:border md:border-neutral-900 relative"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEndHandler}
                  >
                    
                    {/* Animated Swipe Hint Overlay on Mobile */}
                    {showSwipeHint && activeProject.photos.length > 1 && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none md:hidden">
                        <div className="bg-black/60 text-white px-4 py-2 rounded-full font-mono text-xs flex items-center gap-2 animate-pulse">
                          <ChevronLeft className="w-4 h-4 animate-bounce-x" />
                          Swipe
                          <ChevronRight className="w-4 h-4 animate-bounce-x-reverse" />
                        </div>
                      </div>
                    )}

                    <div className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden rounded-xl animate-fade-in" key={activePhotoIndex}>
                      {isVideoUrl(activeProject.photos[activePhotoIndex].url, activeProject.photos[activePhotoIndex].mediaType) ? (
                        <video
                          src={activeProject.photos[activePhotoIndex].url}
                          className="w-full h-full object-contain bg-[#070708]"
                          controls
                          playsInline
                          autoPlay
                          muted
                        />
                      ) : (
                        <img
                          id="lightbox-main-active-image"
                          src={activeProject.photos[activePhotoIndex].url}
                          alt={activeProject.photos[activePhotoIndex].caption || activeProject.name}
                          className="w-full h-full object-contain bg-[#070708]"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      {/* Photo Type Badge */}
                      <span className={`absolute top-4 left-4 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                        activeProject.photos[activePhotoIndex].type === 'Before' 
                          ? 'bg-red-950/80 text-red-300 border-red-900/60'
                          : activeProject.photos[activePhotoIndex].type === 'After'
                            ? 'bg-brand-gold/20 text-brand-gold border-brand-gold/45'
                            : 'bg-neutral-850/85 text-neutral-300 border-neutral-700/60'
                      }`}>
                        {activeProject.photos[activePhotoIndex].type}
                      </span>
                    </div>
                    
                    {/* Caption underneath */}
                    <div className="w-full p-4 mt-2 border-t border-neutral-900/60 text-center">
                      <p className="text-sm text-neutral-200 leading-relaxed font-light">
                        {activeProject.photos[activePhotoIndex].caption || 'Professional custom finishes crafted gracefully.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Next Photo Button - Hidden on mobile */}
              {activeProject.photos.length > 1 && (
                <button
                  onClick={handleNextPhoto}
                  className="hidden md:block absolute right-2 md:relative md:right-0 z-25 p-3 rounded-full bg-neutral-900/80 border border-neutral-850 text-white hover:bg-brand-gold hover:text-black hover:border-transparent transition-all cursor-pointer shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

            </div>
          </div>

          {/* Footer Thumbnails row */}
          <div className="bg-[#070708] p-4 border-t border-neutral-900">
            <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
              
              {/* Thumbnail Items */}
              {activeProject.photos.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto py-1 max-w-full justify-start md:justify-center">
                  {activeProject.photos.map((ph, idx) => (
                    <button
                      key={ph.id}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-16 h-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                        activePhotoIndex === idx ? 'border-brand-gold scale-105' : 'border-neutral-800 hover:border-neutral-650 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {isVideoUrl(ph.url, ph.mediaType) ? (
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center relative">
                          <video src={ph.url} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-[8px] font-mono font-medium text-white bg-black/60 px-1 rounded-sm">VIDEO</span>
                          </div>
                        </div>
                      ) : (
                        <img src={ph.url} alt="thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                      
                      <div className="absolute top-0.5 right-0.5 text-[7px] px-1 py-0.2 bg-black/75 text-white scale-[0.8] rounded uppercase">
                        {ph.type[0]}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Project description box */}
              <div className="text-center text-xs text-neutral-450 font-light max-w-2xl px-4 leading-relaxed">
                {activeProject.description}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 🧾 ACCOUNTABLE DETAILED PROJECT FORMULATION CONSULTATION MODAL */}
      {quoteOpen && (
        <div id="cost-estimate-lead-modal" className="fixed inset-0 min-h-screen bg-neutral-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl transition-all my-8">
            
            {/* Header */}
            <div className="p-5 border-b border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-gold">
                <Brush className="w-5 h-5 text-brand-gold" />
                <h5 className="font-display font-bold text-neutral-900 text-lg">Detailed Project Consultation</h5>
              </div>
              <button 
                onClick={() => setQuoteOpen(false)}
                className="text-neutral-400 hover:text-neutral-800 p-1.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Shield */}
            {quoteSuccess ? (
              <div className="p-8 text-center animate-fade-in flex flex-col items-center justify-center">
                <CheckCircle className="w-16 h-16 text-brand-gold mb-4 animate-bounce" />
                <h6 className="text-xl font-display font-extrabold text-[#121416]">Formulation Request Received!</h6>
                <p className="text-sm text-neutral-600 mt-3 max-w-sm font-light">
                  Your project specifications and photos have been compiled and sent to Frank Blest's administrative lead dashboard. 
                </p>
                <div className="bg-neutral-50 border border-neutral-150 rounded-lg p-4 my-5 w-full text-left space-y-1 font-mono text-xs text-neutral-600">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-1.5 mb-1.5 font-bold">Consolidated Specifications</div>
                  <div><span className="font-bold text-neutral-800">Client:</span> {calcName}</div>
                  <div><span className="font-bold text-neutral-800">Phone:</span> {calcPhone}</div>
                  <div><span className="font-bold text-neutral-800">Category:</span> {calcCategory}</div>
                  <div><span className="font-bold text-neutral-800">Timeframe:</span> {timeframe}</div>
                  {attachedPhotoUrl && (
                    <div className="text-[#3b82f6] font-semibold mt-1">✔ Photo Attachment Attached!</div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 italic leading-normal">
                  Thank you! Frank will review your specifications and contact you shortly at <span className="text-brand-gold font-bold">{calcPhone}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitQuote} className="p-5 space-y-4 text-neutral-800 max-h-[80vh] overflow-y-auto w-full">
                
                {/* Step indicator */}
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-2 font-mono">
                  <span>STEP {calcStep} OF 2</span>
                  <div className="flex gap-1.5">
                    <span className={`w-3.5 h-1.5 rounded-full ${calcStep >= 1 ? 'bg-brand-gold' : 'bg-neutral-200'}`} />
                    <span className={`w-3.5 h-1.5 rounded-full ${calcStep >= 2 ? 'bg-brand-gold' : 'bg-neutral-200'}`} />
                  </div>
                </div>

                {calcStep === 1 ? (
                  <div className="space-y-4">
                    
                    {/* General Category Needed */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5 font-mono">
                        Service Category Needed
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                        {(['Interior', 'Exterior', 'Cabinets', 'Commercial'] as const).map((cat) => (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setCalcCategory(cat)}
                            className={`p-2 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                              calcCategory === cat
                                ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-semibold'
                                : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Specific Job Scope Choices */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5 font-mono">
                        Select Options to Describe Your Job
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Interior Walls & Ceilings',
                          'Door & Crown Trims',
                          'Cabinet Spray Restorations',
                          'Exterior Siding/Stucco',
                          'Skim-Coating & Repair',
                          'Other'
                        ].map((opt) => {
                          const isSelected = scopeOptions.includes(opt);
                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => handleToggleScopeOption(opt)}
                              className={`px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-neutral-900 border-neutral-900 text-white font-medium'
                                  : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '} {opt}
                            </button>
                          );
                        })}
                      </div>
                      
                      {scopeOptions.includes('Other') && (
                        <input
                          type="text"
                          required
                          value={otherScopeText}
                          onChange={(e) => setOtherScopeText(e.target.value)}
                          placeholder="Please specify other option..."
                          className="w-full mt-2 bg-white border border-neutral-250 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-brand-gold"
                        />
                      )}
                    </div>

                    {/* Timeline goals */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5 font-mono">
                        Desired Project Timeline
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                        {[
                          'Immediate / ASAP',
                          'Within 1 month',
                          'Flexible / Later',
                          'Planning Phase'
                        ].map((timeOpt) => (
                          <button
                            type="button"
                            key={timeOpt}
                            onClick={() => setTimeframe(timeOpt)}
                            className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                              timeframe === timeOpt
                                ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-semibold'
                                : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                            }`}
                          >
                            {timeOpt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Specifications Textarea */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5 font-mono">
                        Describe What You Want To Do
                      </label>
                      <textarea
                        value={descriptionText}
                        onChange={(e) => setDescriptionText(e.target.value)}
                        placeholder="e.g. We want to paint our living room, master bed, and restore the kitchen cabinets to a satin lacquer. Include colors or current wall conditions if possible..."
                        className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-xs text-neutral-800 focus:outline-none focus:border-brand-gold h-24 resize-none"
                      />
                    </div>

                    {/* High Quality Customer attachment upload */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5 font-mono">
                        Attach Photo of the Job (If any)
                      </label>
                      
                      {attachedPhotoUrl ? (
                        <div className="border border-neutral-200 p-2 rounded-xl flex items-center justify-between bg-neutral-50">
                          <div className="flex items-center gap-2.5">
                            <img src={attachedPhotoUrl} alt="Customer upload preview" className="w-12 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                            <span className="text-xs text-neutral-500 font-mono truncate max-w-[200px]">Photo Uploaded!</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachedPhotoUrl('')}
                            className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleClientFileSelect}
                            className="hidden"
                            id="customer-photo-input"
                            disabled={isPhotoUploading}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('customer-photo-input')?.click()}
                            disabled={isPhotoUploading}
                            className="w-full border border-dashed border-neutral-200 hover:border-brand-gold/55 p-4 rounded-xl flex flex-col items-center justify-center gap-1 bg-white hover:bg-neutral-50/60 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isPhotoUploading ? (
                              <span className="text-xs text-brand-gold font-medium animate-pulse">Uploading visual references...</span>
                            ) : (
                              <>
                                <Camera className="w-5 h-5 text-neutral-400" />
                                <span className="text-xs text-neutral-800 font-semibold">Attach Project Photo Reference</span>
                                <span className="text-[10px] text-neutral-400 font-light">Optional helper reference. Supports standard image formats.</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Next actions row */}
                    <button
                      type="button"
                      onClick={() => setCalcStep(2)}
                      className="w-full bg-brand-gold hover:bg-brand-gold text-black hover:opacity-90 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs font-mono"
                    >
                      <span>Continue: Add Contact Credentials</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    <p className="text-xs text-neutral-550 leading-relaxed text-center font-light mb-1">
                      Provide your contact credentials so Frank can crosscheck your requested specifications and follow up with a bespoke estimate package.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1 font-mono">
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={calcName}
                        onChange={(e) => setCalcName(e.target.value)}
                        placeholder="e.g. Frank Sinatra"
                        className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1 font-mono">
                        Phone Number (For Consultation Callback)
                      </label>
                      <input
                        type="tel"
                        required
                        value={calcPhone}
                        onChange={(e) => setCalcPhone(e.target.value)}
                        placeholder="e.g. 646-706-1238"
                        className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1 font-mono">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={calcEmail}
                        onChange={(e) => setCalcEmail(e.target.value)}
                        placeholder="e.g. customer@blestpaintings.com"
                        className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20"
                      />
                    </div>

                    {/* Actions bar */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setCalcStep(1)}
                        className="w-1/3 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 py-3.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!calcName || !calcPhone || !calcEmail}
                        className="w-2/3 bg-brand-gold disabled:bg-neutral-100 disabled:text-neutral-400 text-black py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs font-mono"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Submit Project Spec</span>
                      </button>
                    </div>

                  </div>
                )}

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
