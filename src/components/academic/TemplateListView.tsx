import { useAcademicStore } from '@/store/useAcademicStore';
import { TemplateCard } from './TemplateCard';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

interface TemplateListViewProps {
  filter: 'template' | 'draft';
  onSwitchToBuilder: () => void;
}

export function TemplateListView({ filter, onSwitchToBuilder }: TemplateListViewProps) {
  const store = useAcademicStore();
  const templates = store.templates;

  // For now, templates with status='published' in name or those that have been "saved" (isDirty=false when they were saved)
  // We use a simple heuristic: templates with >0 non-locked blocks that have connections = "template", others = "draft"
  const filtered = templates.filter(t => {
    const blockCount = t.blocks.filter(b => !b.locked).length;
    const isComplete = blockCount > 0 && t.connections.length > 0;
    return filter === 'template' ? isComplete : !isComplete;
  });

  const handleView = (id: string) => {
    store.setActiveTemplate(id);
    onSwitchToBuilder();
  };

  const handleEdit = (id: string) => {
    store.setActiveTemplate(id);
    onSwitchToBuilder();
  };

  const handleDuplicate = (id: string) => {
    store.duplicateTemplate(id);
    toast.success('Template duplicated');
  };

  const handleDelete = (id: string) => {
    const t = templates.find(t => t.id === id);
    store.deleteTemplate(id);
    toast.success(`Deleted "${t?.name}"`);
  };

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold text-foreground mb-1">
          No {filter === 'template' ? 'Templates' : 'Drafts'} Yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {filter === 'template'
            ? 'Create a workflow in the Flow Builder and publish it to see it here.'
            : 'Incomplete workflows will appear here as drafts.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(t => (
          <TemplateCard
            key={t.id}
            template={t}
            status={filter}
            onView={handleView}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
