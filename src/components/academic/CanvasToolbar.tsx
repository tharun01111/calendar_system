import { MousePointer2, Hand, Plus, Link2, Trash2, Undo2, Redo2 } from 'lucide-react';

export type CanvasTool = 'select' | 'move' | 'add' | 'connect' | 'delete';

interface CanvasToolbarProps {
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const tools: { id: CanvasTool; icon: typeof MousePointer2; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'move', icon: Hand, label: 'Move' },
  { id: 'add', icon: Plus, label: 'Add Block' },
  { id: 'connect', icon: Link2, label: 'Connect' },
  { id: 'delete', icon: Trash2, label: 'Delete' },
];

export function CanvasToolbar({ activeTool, onToolChange, onUndo, onRedo }: CanvasToolbarProps) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1 p-1.5 bg-card/95 backdrop-blur-sm rounded-xl shadow-elevated border border-border">
      {tools.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => onToolChange(id)}
          className={`p-2 rounded-lg transition-all duration-150 ${
            activeTool === id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
      <div className="h-px bg-border my-1" />
      <button
        title="Undo"
        onClick={onUndo}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        title="Redo"
        onClick={onRedo}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
      >
        <Redo2 className="w-4 h-4" />
      </button>
    </div>
  );
}
