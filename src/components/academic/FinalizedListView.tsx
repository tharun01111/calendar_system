import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarCheck, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

export function FinalizedListView() {
  const [cals, setCals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCals = async () => {
    const { data } = await supabase
      .from('generated_calendars')
      .select(`
        id, start_date, status, created_at,
        flow_templates ( name )
      `)
      .eq('status', 'finalized')
      .order('created_at', { ascending: false });
    setCals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCals();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this finalized calendar? This action cannot be undone.')) return;
    const { error } = await supabase.from('generated_calendars').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete calendar');
    } else {
      toast.success('Calendar deleted successfully');
      fetchCals();
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground animate-pulse text-sm">Loading finalized calendars...</div>;
  }

  if (cals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <CalendarCheck className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold text-foreground mb-1">No Finalized Calendars</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Once you complete and finalize a workflow on the calendar editor, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start items-start">
        {cals.map(c => (
          <Card key={c.id} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{c.flow_templates?.name || 'Unnamed Flow'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Finalized on {format(parseISO(c.created_at), 'PPP')}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 text-[10px] flex-shrink-0 border-emerald-200">
                  Finalized
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded font-medium text-foreground">
                  <CalendarCheck className="w-3 h-3" /> Start Date: {format(parseISO(c.start_date), 'MMM d, yyyy')}
                </span>
              </div>

              <div className="flex gap-1.5 pt-1">
                <Button size="sm" variant="default" className="h-7 text-xs flex-1 bg-accent hover:bg-accent/90" onClick={() => navigate('/final-calendar')}>
                  <Eye className="w-3 h-3 mr-1" /> View Final Calendar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
