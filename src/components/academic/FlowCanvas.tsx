import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAcademicStore } from '@/store/useAcademicStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import BlockNode from './BlockNode';
import { CanvasToolbar, type CanvasTool } from './CanvasToolbar';
import { AddBlockDialog } from './AddBlockDialog';
import { toast } from 'sonner';

const nodeTypes = { block: BlockNode };

function blocksToNodes(template: ReturnType<typeof useAcademicStore.getState>['templates'][0] | undefined): Node[] {
  if (!template) return [];
  return template.blocks.map(block => ({
    id: block.id,
    type: 'block',
    position: block.position,
    data: {
      name: block.name,
      duration: block.duration,
      active: block.active,
      color: block.color,
      state: block.state,
      blockId: block.id,
      locked: block.locked,
      blockType: block.blockType,
      category: block.category,
      frequency: block.frequency,
    },
    draggable: true,
  }));
}

function connectionsToEdges(template: ReturnType<typeof useAcademicStore.getState>['templates'][0] | undefined): Edge[] {
  if (!template) return [];
  return template.connections.map(conn => ({
    id: conn.id,
    source: conn.source,
    target: conn.target,
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { strokeWidth: 2 },
    sourceHandle: null,
    targetHandle: null,
  }));
}

export function FlowCanvas() {
  const store = useAcademicStore();
  const history = useHistoryStore();
  const template = store.getActiveTemplate();
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addPosition, setAddPosition] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const templateId = template?.id;
  const blockCount = template?.blocks.length ?? 0;
  const connCount = template?.connections.length ?? 0;

  // Save snapshot before mutating operations
  const saveSnapshot = useCallback(() => {
    const s = useAcademicStore.getState();
    history.pushState({
      templates: JSON.parse(JSON.stringify(s.templates)),
      activeTemplateId: s.activeTemplateId,
    });
  }, [history]);

  useEffect(() => {
    if (isDragging.current) return;
    setNodes(blocksToNodes(template));
  }, [templateId, blockCount, template?.blocks.map(b => `${b.id}:${b.name}:${b.color}:${b.active}:${b.state}:${b.locked}:${b.blockType}:${b.category}:${b.frequency}`).join(',')]);

  useEffect(() => {
    setEdges(connectionsToEdges(template));
  }, [templateId, connCount]);

  const onNodeDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    isDragging.current = false;
    saveSnapshot();
    store.updateBlockPosition(node.id, node.position);
  }, [store, saveSnapshot]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    saveSnapshot();
    const error = store.addConnection(connection.source, connection.target);
    if (error) {
      toast.error(error);
    }
  }, [store, saveSnapshot]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (activeTool === 'delete') {
      const block = template?.blocks.find(b => b.id === node.id);
      if (block?.locked) {
        toast.error('Cannot delete start/end blocks');
        return;
      }
      saveSnapshot();
      store.removeBlock(node.id);
      toast.info('Block removed');
    }
  }, [activeTool, store, template, saveSnapshot]);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    if (activeTool === 'delete') {
      saveSnapshot();
      store.removeConnection(edge.id);
      toast.info('Connection removed');
    }
  }, [activeTool, store, saveSnapshot]);

  const handleUndo = useCallback(() => {
    // Save current state to future
    const current = useAcademicStore.getState();
    const prev = history.undo();
    if (!prev) return;
    // Push current to redo implicitly handled by store
    useAcademicStore.setState({
      templates: prev.templates,
      activeTemplateId: prev.activeTemplateId,
    });
    toast.info('Undone');
  }, [history]);

  const handleRedo = useCallback(() => {
    const next = history.redo();
    if (!next) return;
    useAcademicStore.setState({
      templates: next.templates,
      activeTemplateId: next.activeTemplateId,
    });
    toast.info('Redone');
  }, [history]);

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (activeTool === 'add' && template) {
      const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      setAddPosition({
        x: event.clientX - reactFlowBounds.left - 90,
        y: event.clientY - reactFlowBounds.top - 40,
      });
      setShowAddDialog(true);
    }
  }, [activeTool, template]);

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="text-center space-y-3 animate-fade-in px-6">
          <div className="text-4xl">🎯</div>
          <h3 className="font-display font-semibold text-foreground">No Template Selected</h3>
          <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
            Create or select a template to start building your workflow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <CanvasToolbar activeTool={activeTool} onToolChange={setActiveTool} onUndo={handleUndo} onRedo={handleRedo} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        connectOnClick={activeTool === 'connect'}
        nodesDraggable={activeTool !== 'connect'}
        panOnDrag={activeTool === 'move'}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        minZoom={0.5}
        maxZoom={1.5}
        selectionOnDrag={activeTool === 'select'}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-muted/20"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>

      {/* Block count badge */}
      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-card/90 backdrop-blur-sm rounded-lg shadow-card border border-border text-[10px] text-muted-foreground">
        {template.blocks.filter(b => !b.locked).length} blocks · {template.connections.length} connections
      </div>

      {/* Add Block Dialog */}
      <AddBlockDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        position={addPosition}
      />
    </div>
  );
}
