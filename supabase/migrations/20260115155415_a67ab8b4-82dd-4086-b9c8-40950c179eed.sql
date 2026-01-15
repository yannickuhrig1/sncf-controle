-- =============================================
-- SNCF Contrôles - Database Schema
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('agent', 'manager', 'admin');

-- 2. Create location type enum
CREATE TYPE public.location_type AS ENUM ('train', 'gare', 'quai');

-- =============================================
-- BASE TABLES
-- =============================================

-- 3. Create teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    matricule TEXT UNIQUE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    role public.app_role NOT NULL DEFAULT 'agent',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add manager_id to teams (after profiles exists)
ALTER TABLE public.teams 
ADD COLUMN manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Create controls table
CREATE TABLE public.controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    control_date DATE NOT NULL DEFAULT CURRENT_DATE,
    control_time TIME NOT NULL DEFAULT CURRENT_TIME,
    location TEXT NOT NULL,
    location_type public.location_type NOT NULL DEFAULT 'train',
    train_number TEXT,
    
    -- Passenger counts
    nb_passagers INTEGER NOT NULL DEFAULT 0 CHECK (nb_passagers >= 0),
    nb_en_regle INTEGER NOT NULL DEFAULT 0 CHECK (nb_en_regle >= 0),
    
    -- Fraud indicators
    tarifs_controle INTEGER NOT NULL DEFAULT 0 CHECK (tarifs_controle >= 0),
    pv INTEGER NOT NULL DEFAULT 0 CHECK (pv >= 0),
    stt_50 INTEGER NOT NULL DEFAULT 0 CHECK (stt_50 >= 0),
    stt_100 INTEGER NOT NULL DEFAULT 0 CHECK (stt_100 >= 0),
    rnv INTEGER NOT NULL DEFAULT 0 CHECK (rnv >= 0),
    ri_positive INTEGER NOT NULL DEFAULT 0 CHECK (ri_positive >= 0),
    ri_negative INTEGER NOT NULL DEFAULT 0 CHECK (ri_negative >= 0),
    
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- HELPER FUNCTIONS (Security Definer)
-- =============================================

-- 7. Get current user's profile ID
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- 8. Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE user_id = auth.uid()
$$;

-- 9. Get current user's team ID
CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- 10. Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
$$;

-- 11. Check if user is manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'manager'
    )
$$;

-- 12. Check if user is manager of a specific team
CREATE OR REPLACE FUNCTION public.is_manager_of_team(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'manager' 
        AND team_id = p_team_id
    )
$$;

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================

-- Profiles: Everyone can read all profiles (for team display)
CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- Profiles: Users can update their own profile (limited fields via app)
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Profiles: Admins can do everything
CREATE POLICY "profiles_admin_all" ON public.profiles
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =============================================
-- RLS POLICIES - TEAMS
-- =============================================

-- Teams: Everyone can read teams they belong to or manage
CREATE POLICY "teams_select" ON public.teams
FOR SELECT TO authenticated
USING (
    public.is_admin() 
    OR id = public.get_user_team_id()
    OR manager_id = public.get_current_profile_id()
);

-- Teams: Only admins can insert/update/delete
CREATE POLICY "teams_admin_insert" ON public.teams
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "teams_admin_update" ON public.teams
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "teams_admin_delete" ON public.teams
FOR DELETE TO authenticated
USING (public.is_admin());

-- =============================================
-- RLS POLICIES - CONTROLS
-- =============================================

-- Controls: Agents see their own, Managers see team's, Admins see all
CREATE POLICY "controls_select" ON public.controls
FOR SELECT TO authenticated
USING (
    public.is_admin()
    OR agent_id = public.get_current_profile_id()
    OR (public.is_manager() AND team_id = public.get_user_team_id())
);

-- Controls: Agents can insert their own controls
CREATE POLICY "controls_insert" ON public.controls
FOR INSERT TO authenticated
WITH CHECK (
    agent_id = public.get_current_profile_id()
    OR public.is_admin()
);

-- Controls: Agents can update their own, Admins can update all
CREATE POLICY "controls_update" ON public.controls
FOR UPDATE TO authenticated
USING (
    agent_id = public.get_current_profile_id()
    OR public.is_admin()
)
WITH CHECK (
    agent_id = public.get_current_profile_id()
    OR public.is_admin()
);

-- Controls: Agents can delete their own, Admins can delete all
CREATE POLICY "controls_delete" ON public.controls
FOR DELETE TO authenticated
USING (
    agent_id = public.get_current_profile_id()
    OR public.is_admin()
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_controls_updated_at
    BEFORE UPDATE ON public.controls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nouveau'),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Utilisateur'),
        'agent'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_controls_agent_id ON public.controls(agent_id);
CREATE INDEX idx_controls_team_id ON public.controls(team_id);
CREATE INDEX idx_controls_date ON public.controls(control_date);
CREATE INDEX idx_teams_manager_id ON public.teams(manager_id);