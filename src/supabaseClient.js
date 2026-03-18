import { createClient } from '@supabase/supabase-js';

// Usando los datos de tus capturas
const supabaseUrl = 'https://oowwqmrrkhtfltgdepjl.supabase.co';
const supabaseKey = 'sb_publishable_20WmGS43be-_pEmvzcS0aw_AAVPuQqQ';

export const supabase = createClient(supabaseUrl, supabaseKey);