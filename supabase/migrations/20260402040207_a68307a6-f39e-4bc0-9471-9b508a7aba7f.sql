
-- Create applicable_to type
CREATE TYPE public.applicable_target AS ENUM ('institution', 'department', 'faculty');

-- Flow Templates table
CREATE TABLE public.flow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  applicable_to applicable_target[] NOT NULL DEFAULT '{institution}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view flow templates"
  ON public.flow_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create flow templates"
  ON public.flow_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own flow templates"
  ON public.flow_templates FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own flow templates"
  ON public.flow_templates FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE TRIGGER update_flow_templates_updated_at
  BEFORE UPDATE ON public.flow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Flow Activities table
CREATE TABLE public.flow_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_template_id UUID NOT NULL REFERENCES public.flow_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage TEXT,
  duration_days INTEGER NOT NULL DEFAULT 1,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view flow activities"
  ON public.flow_activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage flow activities"
  ON public.flow_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.flow_templates WHERE id = flow_template_id AND created_by = auth.uid()));

CREATE POLICY "Users can update flow activities"
  ON public.flow_activities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.flow_templates WHERE id = flow_template_id AND created_by = auth.uid()));

CREATE POLICY "Users can delete flow activities"
  ON public.flow_activities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.flow_templates WHERE id = flow_template_id AND created_by = auth.uid()));

-- Generated Calendars table
CREATE TABLE public.generated_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_template_id UUID NOT NULL REFERENCES public.flow_templates(id) ON DELETE CASCADE,
  target_type applicable_target NOT NULL DEFAULT 'institution',
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view generated calendars"
  ON public.generated_calendars FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create generated calendars"
  ON public.generated_calendars FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own generated calendars"
  ON public.generated_calendars FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE TRIGGER update_generated_calendars_updated_at
  BEFORE UPDATE ON public.generated_calendars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generated Calendar Events table
CREATE TABLE public.generated_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_calendar_id UUID NOT NULL REFERENCES public.generated_calendars(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.flow_activities(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view calendar events"
  ON public.generated_calendar_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage calendar events"
  ON public.generated_calendar_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.generated_calendars WHERE id = generated_calendar_id AND created_by = auth.uid()));

CREATE POLICY "Users can update calendar events"
  ON public.generated_calendar_events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.generated_calendars WHERE id = generated_calendar_id AND created_by = auth.uid()));
