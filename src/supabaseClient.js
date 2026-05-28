import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oowwqmrrkhtfltgdepjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vd3dxbXJya2h0Zmx0Z2RlcGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzMwNjMsImV4cCI6MjA4OTEwOTA2M30.tqAqAoILWRLtV2O5tUhAQ0XPF-0hMRAzO4TQZpxdpoc';

export const supabase = createClient(supabaseUrl, supabaseKey); 
