import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Calendar, Layers, FileText, LogOut, LayoutDashboard, Play, Building2, Users, User } from 'lucide-react';
import { TEMPLATE_PRESETS } from '@/types/academic';
import { useAcademicStore } from '@/store/useAcademicStore';
import { format, parseISO } from 'date-fns';

type FlowTemplate = {
  id: string;
  name: string;
  description: string | null;
  applicable_to: string[];
  created_by: string;
  created_at: string;
};

const TARGET_ICONS: Record<string, typeof Building2> = {
  institution: Building2,
  department: Users,
  faculty: User,
};

export default function Dashboard() {
  const { user, role, signOut } = useAuth();
  const { templates } = useAcademicStore();
  const navigate = useNavigate();
  const [flowTemplates, setFlowTemplates] = useState<FlowTemplate[]>([]);
  const [finalizedCalendars, setFinalizedCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('flow_templates').select('*').order('created_at', { ascending: false });
      if (data) setFlowTemplates(data as FlowTemplate[]);

      const { data: finalized } = await supabase
        .from('generated_calendars')
        .select(`
          id,
          start_date,
          target_type,
          created_at,
          flow_templates ( name, description )
        `)
        .eq('status', 'finalized')
        .order('created_at', { ascending: false });
      if (finalized) setFinalizedCalendars(finalized);

      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            <span className="font-display font-bold text-lg">AcadFlow</span>
          </div>
          <nav className="flex items-center gap-1">
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-accent-foreground">
              <LayoutDashboard className="w-3.5 h-3.5 inline mr-1" />Dashboard
            </span>
            <Link to="/calendar" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Calendar</Link>
            <Link to="/final-calendar" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Final Calendar</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium uppercase tracking-wider">{role || 'admin'}</span>
            <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Select a flow template to begin scheduling</p>
        </div>

        {/* Flow Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold">Flow Templates</h2>
            <span className="text-xs text-muted-foreground">{flowTemplates.length} templates available</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading templates...</div>
          ) : flowTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {flowTemplates.map(flow => (
                <div key={flow.id} className="p-4 rounded-xl border border-border bg-card hover:border-accent/30 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{flow.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{flow.description || 'No description'}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {flow.applicable_to?.map(target => {
                          const Icon = TARGET_ICONS[target] || Building2;
                          return (
                            <span key={target} className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Icon className="w-2.5 h-2.5" />{target}
                            </span>
                          );
                        })}
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                          {format(parseISO(flow.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/finalize/${flow.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors"
                    >
                      <Play className="w-3 h-3" /> Finalize
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground">No flow templates yet. Contact your Super Admin to create flows.</p>
            </div>
          )}
        </div>

        {/* Local Templates */}
        {templates.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-semibold mb-4">Local Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(t => (
                <div key={t.id} className="p-4 rounded-xl border border-border bg-card hover:border-accent/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description || 'No description'}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{t.blocks.length} blocks</span>
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{t.scheduledEvents.length} events</span>
                      </div>
                    </div>
                    <Link to="/confirmations" className="text-xs text-accent hover:underline flex items-center gap-1">
                      Open <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finalized Calendars */}
        {finalizedCalendars.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-semibold mb-4">Finalized Calendars</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {finalizedCalendars.map(cal => {
                const Icon = TARGET_ICONS[cal.target_type] || Building2;
                const flowName = cal.flow_templates?.name || 'Unknown Template';
                const flowDesc = cal.flow_templates?.description;
                return (
                  <div key={cal.id} className="p-4 rounded-xl border border-accent bg-accent/5 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{flowName}</h3>
                        {flowDesc && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{flowDesc}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            Finalized
                          </span>
                          <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Icon className="w-2.5 h-2.5" />{cal.target_type}
                          </span>
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                            Starts {format(parseISO(cal.start_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <Link to="/final-calendar" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/20 bg-background text-accent text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors">
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Presets */}
        <div>
          <h2 className="text-lg font-display font-semibold mb-4">Compliance Presets</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TEMPLATE_PRESETS.slice(0, 6).map(p => (
              <div key={p.id} className="p-4 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-sm">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{p.blocks.length} activities</span>
                  {p.hasOffsetRules && <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">Auto-schedule</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
