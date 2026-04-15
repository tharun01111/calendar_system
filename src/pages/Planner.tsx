import { useState, useCallback } from 'react';
import { TemplateHeader } from '@/components/academic/TemplateHeader';
import { FlowCanvas } from '@/components/academic/FlowCanvas';
import { BlockPropertiesPanel } from '@/components/academic/BlockPropertiesPanel';
import { TemplateListView } from '@/components/academic/TemplateListView';
import { useAcademicStore } from '@/store/useAcademicStore';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, LogOut, List, ChevronRight, Workflow, FileText, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function WorkflowSummary() {
  const template = useAcademicStore(s => s.getActiveTemplate());
  if (!template) return null;

  const activeBlocks = template.blocks.filter(b => !b.locked && b.active);
  const scheduledCount = template.scheduledEvents.length;

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      <div className="flex items-center gap-2 mb-1">
        <List className="w-4 h-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow Summary</h3>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div>
          <h4 className="font-display font-semibold text-sm text-foreground">{template.name}</h4>
          {template.description && <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>}
        </div>

        <div className="flex gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-muted text-xs font-medium">
            {activeBlocks.length} events
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-muted text-xs font-medium">
            {scheduledCount} scheduled
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-muted text-xs font-medium">
            {template.academicStartDate} → {template.academicEndDate}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Event Sequence</h4>
        {activeBlocks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No activity blocks yet. Add blocks in the flow canvas.</p>
        ) : (
          activeBlocks.map((block, idx) => {
            const event = template.scheduledEvents.find(e => e.blockId === block.id);
            return (
              <div key={block.id} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border text-xs">
                  <span className="font-medium text-foreground">{block.name}</span>
                  <div className="flex items-center gap-2">
                    {block.category && <span className="text-muted-foreground">{block.category}</span>}
                    {event && (
                      <span className="text-accent text-[10px] bg-accent/10 px-1.5 py-0.5 rounded">{event.date}</span>
                    )}
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function Planner() {
  const { signOut } = useAuth();
  const selectedBlockId = useAcademicStore(s => s.selectedBlockId);
  const template = useAcademicStore(s => s.getActiveTemplate());
  const selectedBlock = template?.blocks.find(b => b.id === selectedBlockId);
  const showPanel = selectedBlock && !selectedBlock.locked;
  const [showSummary, setShowSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');

  const switchToBuilder = useCallback(() => {
    setActiveTab('builder');
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm z-20 flex-shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            <span className="font-display font-bold text-lg">AcadFlow</span>
          </div>
          <nav className="flex items-center gap-1">
            {activeTab === 'builder' && (
              <button
                onClick={() => setShowSummary(!showSummary)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1",
                  showSummary ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <List className="w-3.5 h-3.5" />
                Summary
              </button>
            )}
            <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-2">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card/50 px-4">
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            <TabsTrigger
              value="builder"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
            >
              <Workflow className="w-4 h-4" />
              Flow Builder
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
            >
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="drafts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
            >
              <FileEdit className="w-4 h-4" />
              Drafts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="builder" className="flex-1 flex overflow-hidden mt-0">
          {/* Flow Canvas (main area) */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <TemplateHeader />
            <div className="flex-1 min-h-0">
              <FlowCanvas />
            </div>
          </div>

          {/* Workflow Summary Panel */}
          {showSummary && (
            <div className="w-[300px] flex-shrink-0 border-l border-border overflow-y-auto bg-background">
              <WorkflowSummary />
            </div>
          )}

          {/* Properties Panel */}
          {showPanel && <BlockPropertiesPanel />}
        </TabsContent>

        <TabsContent value="templates" className="flex-1 overflow-y-auto mt-0">
          <TemplateListView filter="template" onSwitchToBuilder={switchToBuilder} />
        </TabsContent>

        <TabsContent value="drafts" className="flex-1 overflow-y-auto mt-0">
          <TemplateListView filter="draft" onSwitchToBuilder={switchToBuilder} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
