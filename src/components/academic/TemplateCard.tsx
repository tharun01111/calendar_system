import { Eye, Pencil, Copy, Trash2, Calendar, Blocks, Link2, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Template } from '@/types/academic';

interface TemplateCardProps {
  template: Template;
  status: 'template' | 'draft';
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TemplateCard({ template, status, onView, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  const blockCount = template.blocks.filter(b => !b.locked).length;
  const connCount = template.connections.length;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{template.name}</h3>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
            )}
          </div>
          <Badge variant={status === 'template' ? 'default' : 'secondary'} className="text-[10px] flex-shrink-0">
            {status === 'template' ? 'Template' : 'Draft'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
            <Blocks className="w-3 h-3" /> {blockCount} blocks
          </span>
          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
            <Link2 className="w-3 h-3" /> {connCount} connections
          </span>
          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
            <Calendar className="w-3 h-3" /> {template.academicStartDate}
          </span>
          {template.layerEntityName && (
            <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
              <User className="w-3 h-3" /> {template.layerEntityName}
            </span>
          )}
        </div>

        <div className="flex gap-1.5 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => onView(template.id)}>
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => onEdit(template.id)}>
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onDuplicate(template.id)}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(template.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
