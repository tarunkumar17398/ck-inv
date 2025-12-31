import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
        generateHtmlResponse('Authorization Failed', `Error: ${error}`, false),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        generateHtmlResponse('Authorization Failed', 'Missing code or state parameter', false),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

    // Decode state to get user ID
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
      console.log('Processing callback for user:', userId);
    } catch (e) {
      return new Response(
        generateHtmlResponse('Authorization Failed', 'Invalid state parameter', false),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/google-drive-callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);

    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error('Failed to get tokens:', tokenData);
      return new Response(
        generateHtmlResponse('Authorization Failed', `Failed to get tokens: ${JSON.stringify(tokenData)}`, false),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Store tokens in database (create a table for this)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, ensure the google_drive_tokens table exists by trying to upsert
    const { error: upsertError } = await supabase
      .from('google_drive_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError);
      return new Response(
        generateHtmlResponse('Authorization Failed', `Failed to store tokens: ${upsertError.message}. Please run the database migration first.`, false),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log('Successfully stored OAuth tokens for user:', userId);

    return new Response(
      generateHtmlResponse('Authorization Successful!', 'Google Drive has been connected. You can now close this window and use the backup feature.', true),
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(
      generateHtmlResponse('Authorization Failed', error instanceof Error ? error.message : 'Unknown error', false),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});

function generateHtmlResponse(title: string, message: string, success: boolean): string {
  const color = success ? '#10b981' : '#ef4444';
  const icon = success ? '✓' : '✗';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #0f172a;
      color: #f8fafc;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      font-size: 4rem;
      color: ${color};
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }
    p {
      color: #94a3b8;
      margin: 0;
      line-height: 1.6;
    }
    .close-btn {
      margin-top: 2rem;
      padding: 0.75rem 2rem;
      background: ${color};
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
    }
    .close-btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <button class="close-btn" onclick="window.close()">Close Window</button>
  </div>
  <script>
    // Try to notify parent window
    if (window.opener) {
      window.opener.postMessage({ type: 'google-drive-auth', success: ${success} }, '*');
    }
  </script>
</body>
</html>
`;
}
