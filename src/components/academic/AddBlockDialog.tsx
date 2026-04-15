import { useState } from 'react';
import { useAcademicStore } from '@/store/useAcademicStore';
import { BLOCK_TYPE_LABELS, BLOCK_TYPE_COLORS, FREQUENCY_LABELS, ACTIVITY_CATEGORIES } from '@/types/academic';
import type { BlockType, Frequency } from '@/types/academic';
import { toast } from 'sonner';

interface AddBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { x: number; y: number } | null;
}

export function AddBlockDialog({ open, onOpenChange, position }: AddBlockDialogProps) {
  const store = useAcademicStore();
  const [name, setName] = useState('');
  const [blockType, setBlockType] = useState<BlockType>('academic');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('one-time');
  const [showCategories, setShowCategories] = useState(false);

  if (!open) return null;

  const handleCreate = () => {
    const blockName = name.trim() || `New ${BLOCK_TYPE_LABELS[blockType]}`;
    store.addBlock(
      blockName,
      position ?? undefined,
      blockType,
      category || undefined,
      frequency
    );
    toast.success(`Added "${blockName}"`);
    setName('');
    setCategory('');
    setFrequency('one-time');
    onOpenChange(false);
  };

  const handleCategorySelect = (catName: string, items: string[]) => {
    setCategory(catName);
    if (items.length === 1) {
      setName(items[0]);
    }
    setShowCategories(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-xl shadow-elevated border border-border p-5 max-w-sm w-full mx-4 animate-slide-in">
        <h3 className="text-base font-semibold font-display mb-3">Add Block</h3>

        <div className="space-y-3">
          {/* Block Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Block Type</label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as BlockType)}
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
            >
              {Object.entries(BLOCK_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${BLOCK_TYPE_COLORS[blockType]})` }} />
              <span className="text-[10px] text-muted-foreground">Default color for {BLOCK_TYPE_LABELS[blockType]}</span>
            </div>
          </div>

          {/* Activity Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Activity Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={`e.g., ${BLOCK_TYPE_LABELS[blockType]}`}
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Quick Category Picker */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Category</label>
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="text-[10px] text-accent hover:underline"
              >
                {showCategories ? 'Hide' : 'Browse'} categories
              </button>
            </div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., AICTE, NAAC"
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
            />
            {showCategories && (
              <div className="max-h-36 overflow-y-auto border border-border rounded-lg mt-1">
                {ACTIVITY_CATEGORIES.map(group => (
                  <div key={group.groupName}>
                    <div className="px-2 py-1 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase">
                      {group.groupName}
                    </div>
                    {group.categories.map(cat => (
                      <button
                        key={cat.name}
                        onClick={() => handleCategorySelect(cat.name, cat.items)}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted transition-colors flex items-center justify-between"
                      >
                        <span>{cat.name}</span>
                        <span className="text-[9px] text-muted-foreground">{cat.items.length} items</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Frequency */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
            >
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add Block
          </button>
        </div>
      </div>
    </div>
  );
}
