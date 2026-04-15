import { useState, useCallback, useRef, useEffect } from 'react';
import { useAcademicStore } from '@/store/useAcademicStore';
import { ChevronDown, Plus, Pencil, Save, Copy, BookTemplate, Trash2, Zap, Layers, Calendar } from 'lucide-react';
import { CreateTemplateDialog } from './CreateTemplateDialog';
import { CALENDAR_LAYER_LABELS } from '@/types/academic';
import { toast } from 'sonner';

export function TemplateHeader() {
  const { templates, activeTemplateId, setActiveTemplate, renameTemplate, getActiveTemplate, isDirty, markSaved, duplicateTemplate, saveAsTemplate, deleteTemplate, autoSchedulePreset } = useAcademicStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTemplate = getActiveTemplate();
  const calendarLayers = useAcademicStore(s => s.calendarLayers);
  const layer = activeTemplate?.layerId
    ? calendarLayers.find(l => l.id === activeTemplate.layerId)
    : undefined;

  // Click outside to close dropdown
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const handleRenameStart = useCallback(() => {
    if (activeTemplate) {
      setRenameName(activeTemplate.name);
      setIsRenaming(true);
    }
  }, [activeTemplate]);

  const handleRenameBlur = useCallback(() => {
    setIsRenaming(false);
    if (renameName.trim() && activeTemplateId && renameName !== activeTemplate?.name) {
      renameTemplate(activeTemplateId, renameName.trim());
    }
  }, [renameName, activeTemplateId, activeTemplate?.name, renameTemplate]);

  const handleSave = useCallback(() => {
    markSaved();
    toast.success('Template saved successfully.');
  }, [markSaved]);

  const handleDuplicate = useCallback(() => {
    if (activeTemplateId) {
      duplicateTemplate(activeTemplateId);
      toast.success('Template duplicated');
      setShowDropdown(false);
    }
  }, [activeTemplateId, duplicateTemplate]);

  const handleSaveAs = useCallback(() => {
    if (saveAsName.trim()) {
      saveAsTemplate(saveAsName.trim());
      toast.success(`Saved as "${saveAsName.trim()}"`);
      setShowSaveAs(false);
      setSaveAsName('');
      setShowDropdown(false);
    }
  }, [saveAsName, saveAsTemplate]);

  const handleDelete = useCallback((id: string, name: string) => {
    deleteTemplate(id);
    toast.success(`Deleted "${name}"`);
    setShowDropdown(false);
  }, [deleteTemplate]);

  const handleAutoSchedule = useCallback(() => {
    if (activeTemplateId) {
      autoSchedulePreset(activeTemplateId);
      toast.success('Auto-scheduled events from preset rules');
    }
  }, [activeTemplateId, autoSchedulePreset]);

  return (
    <>
      {/* Compact flow header — this belongs to the flow canvas, not the calendar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card/90 backdrop-blur-sm border-b border-border flex-shrink-0">
        {/* Template Name */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isRenaming ? (
            <input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onBlur={handleRenameBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="text-sm font-bold font-display bg-transparent border-b-2 border-accent outline-none w-full max-w-[200px]"
            />
          ) : (
            <h2
              className="text-sm font-bold font-display truncate cursor-text hover:text-accent transition-colors"
              onDoubleClick={handleRenameStart}
              title={activeTemplate?.name || 'No Template'}
            >
              {activeTemplate?.name || 'No Template'}
            </h2>
          )}
          {activeTemplate && !isRenaming && (
            <button
              onClick={handleRenameStart}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Layer badge */}
        {layer && (
          <span
            className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `hsl(${layer.color} / 0.15)`,
              color: `hsl(${layer.color.split(' ')[0]} 50% 35%)`,
            }}
          >
            <Layers className="w-2 h-2" />
            {layer.entityName}
          </span>
        )}

        {/* Date range */}
        {activeTemplate && (
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
            <Calendar className="w-3 h-3" />
            {activeTemplate.academicStartDate} → {activeTemplate.academicEndDate}
          </div>
        )}

        {/* Auto-schedule */}
        {activeTemplate && (
          <button
            onClick={handleAutoSchedule}
            className="p-1.5 rounded-md border border-border hover:bg-accent/10 hover:border-accent/30 transition-colors text-muted-foreground hover:text-accent flex-shrink-0"
            title="Auto-schedule events"
          >
            <Zap className="w-3 h-3" />
          </button>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
            isDirty
              ? 'bg-accent text-accent-foreground hover:bg-accent/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          title="Save"
        >
          <Save className="w-3 h-3" />
        </button>

        {/* Template Dropdown */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-border text-xs hover:bg-muted transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-card rounded-xl shadow-elevated border border-border z-50 animate-slide-in overflow-hidden">
              {/* Template list */}
              <div className="max-h-52 overflow-y-auto">
                {templates.length === 0 && (
                  <div className="px-3 py-4 text-center">
                    <div className="text-2xl mb-1">📋</div>
                    <div className="text-xs text-muted-foreground">No templates yet</div>
                  </div>
                )}
                {templates.map(t => {
                  const tLayer = t.layerId ? calendarLayers.find(l => l.id === t.layerId) : undefined;
                  const isActive = t.id === activeTemplateId;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer group ${
                        isActive
                          ? 'bg-accent/10 border-l-2 border-l-accent'
                          : 'hover:bg-muted border-l-2 border-l-transparent'
                      }`}
                      onClick={() => { setActiveTemplate(t.id); setShowDropdown(false); }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`truncate ${isActive ? 'font-semibold text-accent' : ''}`}>{t.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tLayer && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: `hsl(${tLayer.color})` }} />
                              {tLayer.entityName}
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground">
                            {t.blocks.filter(b => !b.locked).length} blocks
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.name); }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="border-t border-border p-1">
                <button
                  onClick={() => { setShowCreate(true); setShowDropdown(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-accent hover:bg-accent/10 transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Template
                </button>
                {activeTemplate && (
                  <>
                    <button
                      onClick={handleDuplicate}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => { setShowSaveAs(true); setSaveAsName(activeTemplate.name + ' (Saved)'); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                      <BookTemplate className="w-3.5 h-3.5" />
                      Save As...
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          title="Create Template"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Save As modal */}
      {showSaveAs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-xl shadow-elevated border border-border p-5 max-w-sm w-full mx-4 animate-slide-in">
            <h3 className="text-base font-semibold font-display mb-3">Save As Template</h3>
            <input
              autoFocus
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveAs()}
              placeholder="Template name..."
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveAs(false)}
                className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAs}
                disabled={!saveAsName.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateTemplateDialog open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
