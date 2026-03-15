import { createClient } from '@supabase/supabase-js';

// Usando los datos de tus capturas
const supabaseUrl = 'https://oowwqmrrkhtfltgdepjl.supabase.co';
const supabaseKey = 'sb_publishable_20WmGS43be-_pEmvzcSOaw_AAVPuNfXW98iBwG';

export const supabase = createClient(supabaseUrl, supabaseKey);