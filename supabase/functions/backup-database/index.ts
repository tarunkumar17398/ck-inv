import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get OAuth access token (refresh if needed)
async function getOAuthAccessToken(
  supabase: any,
  userId: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string | null; error: string | null }> {
  // Get stored tokens
  const { data: tokenData, error: tokenError } = await supabase
    .from('google_drive_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (tokenError) {
    return { accessToken: null, error: `Failed to fetch tokens: ${tokenError.message}` };
  }

  if (!tokenData) {
    return { accessToken: null, error: 'Google Drive not connected. Please authorize first.' };
  }

  // Check if token is expired
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  
  if (expiresAt > now) {
    // Token is still valid
    return { accessToken: tokenData.access_token, error: null };
  }

  // Token expired, refresh it
  console.log('Refreshing expired OAuth token...');
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const newTokenData = await tokenResponse.json();

  if (!newTokenData.access_token) {
    return { accessToken: null, error: `Failed to refresh token: ${JSON.stringify(newTokenData)}` };
  }

  // Update stored token
  await supabase
    .from('google_drive_tokens')
    .update({
      access_token: newTokenData.access_token,
      expires_at: new Date(Date.now() + newTokenData.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  console.log('OAuth token refreshed successfully');
  return { accessToken: newTokenData.access_token, error: null };
}

async function uploadToGoogleDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  content: string
): Promise<string> {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error(`Failed to upload to Google Drive: ${JSON.stringify(data)}`);
  }
  console.log(`Uploaded to Google Drive: ${fileName} (${data.id})`);
  return data.id;
}

async function cleanupOldGoogleDriveBackups(accessToken: string, folderId: string, daysToKeep: number): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,createdTime)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();

  if (data.files) {
    for (const file of data.files) {
      const fileDate = new Date(file.createdTime);
      if (fileDate < cutoffDate) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log(`Deleted old Google Drive backup: ${file.name}`);
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const googleClientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    
    // Helper function to extract folder ID from URL or return as-is if already an ID
    const extractFolderId = (folderIdOrUrl: string): string => {
      // Check if it's a full Google Drive URL
      const urlMatch = folderIdOrUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (urlMatch) {
        return urlMatch[1];
      }
      // Otherwise assume it's already just the folder ID
      return folderIdOrUrl;
    };
    const googleDriveFolderIdRaw = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');
    const googleDriveFolderId = googleDriveFolderIdRaw ? extractFolderId(googleDriveFolderIdRaw) : null;
    
    let userId: string | null = null;
    
    // Check for scheduled job (cron) - uses service role for authentication
    const authHeader = req.headers.get('authorization');
    const isScheduledJob = authHeader === `Bearer ${supabaseAnonKey}`;
    
    let userEmail = 'scheduled-backup';
    
    if (isScheduledJob) {
      // Scheduled job - bypass user auth, use service role
      console.log('Running as scheduled backup job');
    } else {
      // Manual trigger - verify JWT token and check admin role
      if (!authHeader) {
        console.error('No authorization header provided');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Create client with anon key to verify the user's JWT
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });
      
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
      
      if (userError || !user) {
        console.error('Invalid token:', userError?.message);
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user has admin role using service role key
      const supabaseAdminCheck = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: roleData, error: roleError } = await supabaseAdminCheck
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        console.error('User is not an admin:', user.id);
        return new Response(
          JSON.stringify({ error: 'Forbidden - Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
      userEmail = user.email || 'unknown';
      console.log('Starting database backup by admin:', user.id);
    }

    console.log('Starting database backup, triggered by:', userEmail);

    // Create admin client for all operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all data using service role (bypasses RLS for backup)
    const [itemsRes, categoriesRes, countersRes, subcategoriesRes, piecesRes] = await Promise.all([
      supabaseAdmin.from('items').select('*'),
      supabaseAdmin.from('categories').select('*'),
      supabaseAdmin.from('item_code_counters').select('*'),
      supabaseAdmin.from('subcategories').select('*'),
      supabaseAdmin.from('item_pieces').select('*'),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (countersRes.error) throw countersRes.error;
    if (subcategoriesRes.error) throw subcategoriesRes.error;
    if (piecesRes.error) throw piecesRes.error;

    const backupData = {
      timestamp: new Date().toISOString(),
      created_by: userEmail,
      items: itemsRes.data,
      categories: categoriesRes.data,
      item_code_counters: countersRes.data,
      subcategories: subcategoriesRes.data,
      item_pieces: piecesRes.data,
    };

    const fileName = `backup-${new Date().toISOString().split('T')[0]}.json`;
    const fileContent = JSON.stringify(backupData, null, 2);

    // Upload to Lovable Cloud Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('backups')
      .upload(fileName, fileContent, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    console.log(`Backup created in Cloud Storage: ${fileName} by ${userEmail}`);

    // Upload to Google Drive if OAuth is configured
    let googleDriveFileId = null;
    let googleDriveError = null;
    let googleDriveConnected = false;
    
    if (googleClientId && googleClientSecret && googleDriveFolderId && userId) {
      try {
        console.log('Starting Google Drive upload with OAuth...');
        console.log('Folder ID:', googleDriveFolderId);
        
        // Get OAuth access token
        const { accessToken, error: tokenError } = await getOAuthAccessToken(
          supabaseAdmin,
          userId,
          googleClientId,
          googleClientSecret
        );
        
        if (tokenError) {
          throw new Error(tokenError);
        }
        
        if (!accessToken) {
          throw new Error('No access token available');
        }
        
        console.log('Got OAuth access token');
        googleDriveConnected = true;
        
        // Upload to Google Drive
        googleDriveFileId = await uploadToGoogleDrive(accessToken, googleDriveFolderId, fileName, fileContent);
        console.log('Upload complete, file ID:', googleDriveFileId);
        
        // Cleanup old backups from Google Drive (keep 30 days)
        await cleanupOldGoogleDriveBackups(accessToken, googleDriveFolderId, 30);
        console.log('Google Drive backup completed successfully');
      } catch (googleError) {
        console.error('Google Drive upload failed:', googleError);
        googleDriveError = googleError instanceof Error ? googleError.message : String(googleError);
        // Don't fail the whole backup if Google Drive fails
      }
    } else if (!googleDriveFolderId) {
      console.log('Google Drive not configured - missing GOOGLE_DRIVE_FOLDER_ID');
    } else if (!googleClientId || !googleClientSecret) {
      console.log('Google Drive OAuth not configured - missing client credentials');
    } else if (!userId) {
      console.log('Google Drive upload skipped - no user ID (scheduled job)');
    }

    // Clean up old backups from Cloud Storage (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: files } = await supabaseAdmin.storage.from('backups').list();
    
    if (files) {
      for (const file of files) {
        const fileDate = new Date(file.created_at);
        if (fileDate < thirtyDaysAgo) {
          await supabaseAdmin.storage.from('backups').remove([file.name]);
          console.log(`Deleted old Cloud Storage backup: ${file.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName,
        googleDriveUploaded: !!googleDriveFileId,
        googleDriveFileId,
        googleDriveError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Backup failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
