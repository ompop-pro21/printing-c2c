-- supabase/schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: print_jobs
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  pages INTEGER NOT NULL,
  color BOOLEAN NOT NULL DEFAULT false,
  duplex BOOLEAN NOT NULL DEFAULT false,
  copies INTEGER NOT NULL DEFAULT 1,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'queued',
  price DECIMAL(10,2) NOT NULL,
  queue_position INTEGER,
  current_page INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: receipts
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.print_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT,
  file_name TEXT,
  pages INTEGER,
  config_color BOOLEAN,
  config_duplex BOOLEAN,
  config_copies INTEGER,
  config_priority BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Print Jobs
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own jobs" ON public.print_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own jobs" ON public.print_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Admins can view/update all jobs
CREATE POLICY "Admins can view all jobs" ON public.print_jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update all jobs" ON public.print_jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for Receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own receipts" ON public.receipts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own receipts" ON public.receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
