'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbqguwfaqhmbdypbghqo.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicWd1d2ZhcWhtYmR5cGJnaHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxOTUzNzYsImV4cCI6MjA1Nzc3MTM3Nn0.1yoh9diwvnEuetjKpawAIFNyuOw5tKs-RiEbtfpxhoM';

export const supabase = createBrowserClient(supabaseUrl, supabaseKey); 