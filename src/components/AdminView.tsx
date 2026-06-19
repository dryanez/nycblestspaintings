import React, { useState, useRef } from 'react';
import { Project, Category, Photo, PhotoType } from '../types';
import { 
  Plus, 
  Trash2, 
  Upload, 
  FileText, 
  Tag, 
  CheckCircle, 
  Lock, 
  Unlock, 
  Folder, 
  Mail, 
  Phone, 
  Inbox, 
  Sparkles,
  Layers,
  ChevronRight,
  User,
  Clock,
  ExternalLink,
  ShieldAlert,
  Pencil,
  Edit3
} from 'lucide-react';
import { supabase } from '../supabase';

interface AdminViewProps {
  projects: Project[];
  leads: any[];
  onAddProject: (project: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
}

export default function AdminView({
  projects,
  leads,
  onAddProject,
  onDeleteProject,
  onDeleteLead,
}: AdminViewProps) {
  // Auth state - keeps client secure but easy to demonstrate, passcode is 'blest'
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Project creator states
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<Category>('Interior');
  const [tempPhotos, setTempPhotos] = useState<Array<{ id: string; url: string; type: PhotoType; caption: string; mediaType?: 'image' | 'video' }>>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'fail'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.toLowerCase() === 'blest') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid system passcode. Try "blest".');
    }
  };

  // Convert files to base64 and upload to Firebase Storage
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedPhotos: Array<{ id: string; url: string; type: PhotoType; caption: string; mediaType?: 'image' | 'video' }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64String = await fileToBase64(file);
        
        // Upload to Supabase Storage
        const extension = file.name.split('.').pop() || 'jpg';
        const uniqueName = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${extension}`;
        
        const { error: uploadError } = await supabase.storage.from('uploads').upload(uniqueName, file);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(uniqueName);
        const downloadUrl = publicUrl;
        
        // Predict standard type, before/after flags if filename includes telltales
        let predictedType: PhotoType = 'Standard';
        const lowercaseName = file.name.toLowerCase();
        if (lowercaseName.includes('before') || lowercaseName.includes('prev') || lowercaseName.includes('old')) {
          predictedType = 'Before';
        } else if (lowercaseName.includes('after') || lowercaseName.includes('post') || lowercaseName.includes('new')) {
          predictedType = 'After';
        }

        // Clean caption representing file
        const cleanCaption = file.name.split('.')[0]
          .replace(/[_-]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        const isVideo = file.type.startsWith('video/') || 
                        lowercaseName.endsWith('.mp4') || 
                        lowercaseName.endsWith('.mov') || 
                        lowercaseName.endsWith('.webm');

        uploadedPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          url: downloadUrl,
          type: predictedType,
          caption: cleanCaption,
          mediaType: isVideo ? 'video' : 'image'
        });
      } catch (err) {
        console.error('Error uploading file:', err);
      }
    }

    setTempPhotos((prev) => [...prev, ...uploadedPhotos]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const updatePhotoType = (photoId: string, newType: PhotoType) => {
    setTempPhotos((prev) =>
      prev.map((photo) => (photo.id === photoId ? { ...photo, type: newType } : photo))
    );
  };

  const updatePhotoCaption = (photoId: string, text: string) => {
    setTempPhotos((prev) =>
      prev.map((photo) => (photo.id === photoId ? { ...photo, caption: text } : photo))
    );
  };

  const removePhotoFromTemp = (photoId: string) => {
    setTempPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  const handleEditProjectClick = (proj: Project) => {
    setEditingProjectId(proj.id);
    setName(proj.name);
    setDescription(proj.description);
    setCategory(proj.category);
    setTempPhotos(proj.photos.map(p => ({
      id: p.id,
      url: p.url,
      type: p.type,
      caption: p.caption || '',
      mediaType: p.mediaType
    })));
    // Scroll smoothly to creation/edit form
    const formElement = document.getElementById('album-editor-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setName('');
    setDescription('');
    setCategory('Interior');
    setTempPhotos([]);
    setSaveStatus('idle');
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || tempPhotos.length === 0) {
      setSaveStatus('fail');
      return;
    }

    setSaveStatus('saving');
    try {
      const targetId = editingProjectId || crypto.randomUUID();
      
      // Preserve existing createdAt if editing
      let originalCreatedAt = new Date().toISOString();
      if (editingProjectId) {
        const existingProject = projects.find(p => p.id === editingProjectId);
        if (existingProject) {
          originalCreatedAt = existingProject.createdAt;
        }
      }

      const savedAlbum: Project = {
        id: targetId,
        name,
        description,
        category,
        photos: tempPhotos.map((p) => ({ id: p.id, url: p.url, type: p.type, caption: p.caption, mediaType: p.mediaType })),
        createdAt: originalCreatedAt,
      };

      await onAddProject(savedAlbum);
      setSaveStatus('success');
      
      // Reset forms
      setEditingProjectId(null);
      setName('');
      setDescription('');
      setCategory('Interior');
      setTempPhotos([]);
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('fail');
    }
  };

  // --- LOGIN PANEL SHIELD ---
  if (!isAuthenticated) {
    return (
      <div id="admin-auth-shield" className="max-w-md mx-auto my-16 bg-white border border-neutral-200 rounded-2xl p-7 text-center shadow-xs">
        <div className="w-14 h-14 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-5">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-2xl font-display font-medium text-neutral-900">NYC Blest Console</h3>
        <p className="text-xs text-neutral-600 mt-2 max-w-sm mx-auto leading-relaxed font-light">
          Administrative control center for uploading portfolio projects, tagging album slides, and viewing incoming inquiries.
        </p>

        <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4 text-left">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 font-mono">
              Secure Staff Passcode
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="e.g. blest"
              className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 text-center tracking-widest"
              required
            />
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2 text-xs text-red-650 font-mono">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-brand-gold hover:opacity-95 text-black font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
          >
            Authenticate Console
          </button>
        </form>

        <div className="mt-6 border-t border-neutral-100 pt-4">
          <p className="text-[10px] text-neutral-400 italic">
            Hint: Use standard developer code word <span className="text-brand-gold font-bold font-mono">blest</span> to access.
          </p>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED BOARD PANEL ---
  return (
    <div id="admin-dashboard-panel" className="space-y-12 py-4">
      
      {/* HEADER HUD BAR */}
      <section className="bg-white border border-neutral-200/90 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-brand-gold text-xs font-bold font-mono uppercase tracking-widest">
            <Unlock className="w-3.5 h-3.5" />
            <span>Staff Console Active</span>
          </div>
          <h2 className="text-2xl font-display font-medium text-neutral-900 mt-1">Frank Blest Painting Workspace</h2>
        </div>
        
        <button
          onClick={() => setIsAuthenticated(false)}
          className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-800 rounded-xl text-xs transition-colors font-mono cursor-pointer"
        >
          Lock Console
        </button>
      </section>

      {/* METRIC ANALYTICS CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-neutral-200/95 p-5 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-neutral-500 font-bold font-mono uppercase tracking-wider block">Portfolios</span>
            <span className="text-3xl font-display font-extrabold text-neutral-900 mt-1 block">{projects.length}</span>
          </div>
          <div className="p-3 bg-neutral-50 border border-neutral-150 rounded-lg text-brand-gold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200/95 p-5 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-neutral-500 font-bold font-mono uppercase tracking-wider block">Customer Leads</span>
            <span className="text-3xl font-display font-extrabold text-brand-gold mt-1 block">{leads.length}</span>
          </div>
          <div className="p-3 bg-neutral-50 border border-neutral-150 rounded-lg text-brand-gold">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200/95 p-5 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-neutral-500 font-bold font-mono uppercase tracking-wider block">Total Items</span>
            <span className="text-3xl font-display font-extrabold text-neutral-900 mt-1 block">
              {projects.reduce((acc, p) => acc + p.photos.length, 0)}
            </span>
          </div>
          <div className="p-3 bg-neutral-50 border border-neutral-150 rounded-lg text-brand-gold">
            <Folder className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* CUSTOMER ESTIMATE LEADS INBOX */}
      <section className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-5">
          <Inbox className="w-5 h-5 text-brand-gold" />
          <h3 className="text-lg font-display font-bold text-neutral-900">Client Consultation Inbox ({leads.length})</h3>
        </div>

        {leads.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl">
            <Clock className="w-8 h-8 text-neutral-400 mx-auto mb-3 animate-spin" style={{ animationDuration: '8s' }} />
            <p className="text-sm text-neutral-600 font-mono">Leads box is currently clean</p>
            <p className="text-xs text-neutral-400 mt-1">Estimator submissions appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-105">
            {leads.map((lead) => (
              <div key={lead.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-800 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-neutral-450" />
                      {lead.clientName}
                    </span>
                    <span className="text-[10px] font-mono bg-neutral-50 border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded">
                      {lead.serviceType}
                    </span>
                  </div>
                  
                  {/* Descriptions with multiline and photo attachment support */}
                  <div className="space-y-3 mt-1.5">
                    <p className="text-xs text-neutral-700 font-light leading-relaxed whitespace-pre-wrap">
                      {lead.details ? lead.details.replace(/\[Attached Photo:\s*([^\]]+)\]/, '').trim() : 'No specifications entered.'}
                    </p>
                    
                    {lead.details && lead.details.match(/\[Attached Photo:\s*([^\]]+)\]/) && (
                      <div className="mt-3 bg-neutral-100/60 border border-neutral-200 rounded-xl p-2.5 max-w-xs overflow-hidden">
                        <span className="text-[9px] font-mono text-neutral-400 block mb-1 uppercase tracking-wider">Client Attachment Ref:</span>
                        <a 
                          href={lead.details.match(/\[Attached Photo:\s*([^ ]+)\]/)?.[1] || '#'} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="block relative group overflow-hidden rounded-lg border border-neutral-200"
                        >
                          <img 
                            src={lead.details.match(/\[Attached Photo:\s*([^\]]+)\]/)?.[1]} 
                            alt="Customer space reference" 
                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="bg-white/90 text-black text-[10px] font-bold px-2.5 py-1 rounded-md shadow flex items-center gap-1 font-mono">
                              <ExternalLink className="w-3 h-3" /> View Large File
                            </span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {/* Contact rows */}
                  <div className="flex flex-wrap gap-4 text-[11px] font-mono text-neutral-500 mt-2">
                    <a href={`tel:${lead.phone}`} className="hover:text-brand-gold text-neutral-700 flex items-center gap-1 transition-all">
                      <Phone className="w-3 h-3 fill-neutral-200" />
                      <span>{lead.phone}</span>
                    </a>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="hover:text-brand-gold text-neutral-700 flex items-center gap-1 transition-all">
                        <Mail className="w-3 h-3" />
                        <span>{lead.email}</span>
                      </a>
                    )}
                    <span className="text-neutral-400">Created: {new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Estimate side metrics and delete actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right bg-neutral-50 border border-neutral-150 px-4 py-2 rounded-lg min-w-[110px]">
                    <span className="text-[9px] text-neutral-400 font-mono uppercase block">Estimate Budg</span>
                    <span className="text-sm font-display font-semibold text-brand-gold">${lead.estimatedPrice?.toLocaleString()}</span>
                  </div>
                  
                  <button
                    onClick={() => onDeleteLead(lead.id)}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-50 border border-neutral-100 hover:border-red-200 rounded-xl transition-all cursor-pointer"
                    title="Dismiss lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CREATION/EDIT FORM - ALBUM WORKSPACE */}
      <section id="album-editor-section" className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-4 mb-6 gap-3">
          <div className="flex items-center gap-2">
            {editingProjectId ? (
              <Pencil className="w-5 h-5 text-brand-gold animate-pulse" />
            ) : (
              <Plus className="w-5 h-5 text-brand-gold" />
            )}
            <h3 className="text-lg font-display font-bold text-neutral-900">
              {editingProjectId ? 'Modify Existing Painting Project' : 'Upload New Painting Project'}
            </h3>
          </div>
          {editingProjectId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
            >
              Cancel Edit Mode (Create New)
            </button>
          )}
        </div>

        <form onSubmit={handleSaveAlbum} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Project Details Panel */}
            <div className="space-y-4 text-neutral-800">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5 font-mono">
                  Project Name / Location
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Park Avenue Dining Room"
                  className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5 font-mono">
                  Category Tag
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-brand-gold cursor-pointer"
                >
                  <option value="Interior">Interior Painting</option>
                  <option value="Exterior">Exterior Façade</option>
                  <option value="Cabinets">Cabinet Sprays & Lacquers</option>
                  <option value="Commercial">Commercial/Office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5 font-mono">
                  Job Specifications & Details
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe wall conditions, painting coats, specific colors used (e.g., Benjamin Moore Chantilly Lace) so prospective clients can read about your expertise..."
                  className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-brand-gold h-32 resize-none"
                />
              </div>
            </div>

            {/* Photo Upload Area */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest font-mono">
                High-Resolution Job Photos or Videos
              </label>

              {/* DRAG DROP ZONE */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isUploading 
                    ? 'border-brand-gold bg-brand-gold/5 text-brand-gold'
                    : 'border-neutral-200 hover:border-brand-gold/50 hover:bg-neutral-50/60 text-neutral-500'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Upload className="w-10 h-10 mx-auto mb-3 text-neutral-400 animate-bounce" />
                <span className="text-sm font-bold text-neutral-850 block">
                  {isUploading ? 'Compiling and Uploading media files...' : 'Click to Upload Multiple Photos & Videos'}
                </span>
                <span className="text-xs text-neutral-400 mt-1.5 block font-light">
                  Supports multiple high-res album files. Max 20MB per file.
                </span>
              </div>

              {/* Upload checklist / list */}
              {tempPhotos.length > 0 && (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                    Configure Uploaded Items ({tempPhotos.length})
                  </span>
                  
                  {tempPhotos.map((photo) => (
                    <div 
                      key={photo.id}
                      className="bg-neutral-50/80 border border-neutral-200 p-3 rounded-xl flex items-center gap-3"
                    >
                      {photo.mediaType === 'video' || photo.url.toLowerCase().endsWith('.mp4') || photo.url.toLowerCase().endsWith('.mov') || photo.url.toLowerCase().endsWith('.webm') ? (
                        <div className="w-12 h-10 bg-black rounded overflow-hidden relative flex-shrink-0">
                          <video src={photo.url} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[7px] text-white font-mono bg-black/60 px-0.5 rounded-sm">VID</span>
                          </div>
                        </div>
                      ) : (
                        <img src={photo.url} alt="Uploaded block" className="w-12 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                      )}
                      
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                          placeholder="Photo label (e.g. Kitchen Crown Molding)"
                          className="w-full bg-transparent text-xs text-neutral-800 border-b border-transparent focus:border-neutral-350 pb-0.5 focus:outline-none font-medium"
                        />
                        
                        {/* Selector Row */}
                        <div className="flex items-center gap-4 text-[10px] font-mono">
                          <span className="text-neutral-400">Type:</span>
                          {(['Standard', 'Before', 'After'] as PhotoType[]).map((typeOpt) => (
                            <button
                              type="button"
                              key={typeOpt}
                              onClick={() => updatePhotoType(photo.id, typeOpt)}
                              className={`px-2 py-0.5 rounded cursor-pointer ${
                                photo.type === typeOpt
                                  ? 'bg-brand-gold/20 text-brand-gold font-bold'
                                  : 'text-neutral-500 hover:text-neutral-800'
                              }`}
                            >
                              {typeOpt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removePhotoFromTemp(photo.id)}
                        className="text-neutral-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Form Actions */}
          <div className="border-t border-neutral-100 pt-5 flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-light">
              *Albums require a project name and at least 1 primary item.
            </span>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!name || tempPhotos.length === 0 || isUploading}
                className="bg-brand-gold disabled:bg-neutral-100 disabled:text-neutral-400 text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
              >
                {saveStatus === 'saving' 
                  ? 'Saving changes...' 
                  : editingProjectId 
                    ? 'Save Project Changes' 
                    : 'Publish Album Portfolio'}
              </button>
            </div>
          </div>

          {/* Toast statuses */}
          {saveStatus === 'success' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-mono text-center">
              ✔ Album {editingProjectId ? 'updated' : 'published'} successfully! Synced with visual showcase.
            </div>
          )}
          {saveStatus === 'fail' && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-mono text-center">
              ❌ Publication failed. Confirm Name and Items are configured properly.
            </div>
          )}
        </form>
      </section>

      {/* EXISTENT ALBUM MANAGER (Pruning Section) */}
      <section className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-6">
          <Folder className="w-5 h-5 text-brand-gold" />
          <h3 className="text-lg font-display font-bold text-neutral-900">Existing Album Manager ({projects.length})</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const coverPhoto = proj.photos[0];
            const isVideo = coverPhoto?.mediaType === 'video' || coverPhoto?.url.toLowerCase().endsWith('.mp4') || coverPhoto?.url.toLowerCase().endsWith('.mov');
            return (
              <div 
                key={proj.id}
                className="bg-neutral-50/40 border border-neutral-200/80 p-4 rounded-xl flex items-center justify-between gap-4 group hover:border-brand-gold/30 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden flex-shrink-0">
                    {coverPhoto?.url ? (
                      isVideo ? (
                        <div className="w-full h-full bg-black relative">
                          <video src={coverPhoto.url} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <span className="text-[8px] text-white font-mono bg-black/60 px-0.5 rounded-sm">VID</span>
                          </div>
                        </div>
                      ) : (
                        <img src={coverPhoto.url} alt="Album cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )
                    ) : (
                      <Layers className="w-5 h-5 text-neutral-400 mx-auto mt-3" />
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-neutral-800 truncate max-w-[130px]">{proj.name}</h4>
                    <span className="text-[10px] font-mono text-neutral-500 tracking-wide block uppercase mt-0.5">{proj.category}</span>
                    <span className="text-[9px] font-mono text-neutral-400 block">{proj.photos.length} item{proj.photos.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleEditProjectClick(proj)}
                    className="p-2.5 text-neutral-500 hover:text-brand-gold bg-white border border-neutral-250 rounded-lg shadow-2xs hover:bg-neutral-50 hover:border-brand-gold/30 transition-all cursor-pointer"
                    title="Edit Album Details & Photos"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Confirm deleting album: "${proj.name}"? This deletes all files permanent.`)) {
                        onDeleteProject(proj.id);
                      }
                    }}
                    className="p-2.5 text-neutral-400 hover:text-red-500 bg-white border border-neutral-250 rounded-lg shadow-2xs hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                    title="Delete Album"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
