import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Drive API helper functions
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT header and claim
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Base64url encode
  const base64url = (str: string) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaim = base64url(JSON.stringify(claim));

  // Sign with RSA
  const privateKey = serviceAccount.private_key;
  const encoder = new TextEncoder();
  const signatureInput = encoder.encode(`${encodedHeader}.${encodedClaim}`);
  
  // Import the private key
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signatureInput);
  const encodedSignature = base64url(String.fromCharCode(...new Uint8Array(signature)));

  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get Google access token: ${JSON.stringify(tokenData)}`);
  }
  
  return tokenData.access_token;
}

async function findOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const createData = await createResponse.json();
  console.log(`Created Google Drive folder: ${folderName} (${createData.id})`);
  return createData.id;
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

  // Add supportsAllDrives=true to work with shared folders
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
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

  // List files in folder with supportsAllDrives for shared folders
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,createdTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();

  if (data.files) {
    for (const file of data.files) {
      const fileDate = new Date(file.createdTime);
      if (fileDate < cutoffDate) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?supportsAllDrives=true`, {
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
    const googleServiceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    
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

    // Upload to Google Drive if configured
    let googleDriveFileId = null;
    let googleDriveError = null;
    if (googleServiceAccountJson && googleDriveFolderId) {
      try {
        console.log('Starting Google Drive upload...');
        console.log('Extracted folder ID:', googleDriveFolderId);
        
        // Validate JSON format
        let parsedAccount;
        try {
          parsedAccount = JSON.parse(googleServiceAccountJson);
          console.log('Service account email:', parsedAccount.client_email);
        } catch (parseError: unknown) {
          const msg = parseError instanceof Error ? parseError.message : String(parseError);
          throw new Error(`Invalid JSON format: ${msg}`);
        }
        
        const accessToken = await getGoogleAccessToken(googleServiceAccountJson);
        console.log('Got Google access token');
        
        // Use folder ID directly from environment variable (shared folder)
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
    } else {
      console.log('Google Drive not configured - missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_DRIVE_FOLDER_ID');
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
