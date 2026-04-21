const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const B2_KEY_ID = Deno.env.get("B2_KEY_ID") || "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const BUCKET_ID = Deno.env.get("B2_BUCKET_ID") || "";
const BUCKET_NAME = "Elo-User-Albums";

console.log("=== START ===");
console.log("B2_KEY_ID:", B2_KEY_ID ? "SET" : "NOT SET");
console.log("B2_APP_KEY:", B2_APP_KEY ? "SET" : "NOT SET");
console.log("BUCKET_ID:", BUCKET_ID ? "SET" : "NOT SET");
console.log("==================");

async function b2Auth(): Promise<{ apiUrl: string; authToken: string }> {
  const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);
  
  const authResp = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    method: "GET",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/json"
    }
  });

  const authText = await authResp.text();
  if (!authResp.ok) {
    throw new Error(`Auth failed: ${authText}`);
  }

  const authData = JSON.parse(authText);
  const apiUrl = authData.apiUrl || authData.apiInfo?.storageApi?.apiUrl;
  const authToken = authData.authorizationToken || authData.apiInfo?.storageApi?.authToken;
  
  return { apiUrl, authToken };
}

async function getSignedUrl(apiUrl: string, authToken: string, fileName: string): Promise<string> {
  // Extract folder prefix (e.g., "usuarios/user-id/album/")
  const parts = fileName.split('/');
  parts.pop(); // Remove filename
  const prefix = parts.join('/') + '/';
  
  console.log(">>> Getting signed URL for:", fileName, "prefix:", prefix);
  
  const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      bucketId: BUCKET_ID,
      fileNamePrefix: prefix,
      validDurationInSeconds: 3600
    })
  });

  const urlText = await urlResp.text();
  console.log(">>> get_download_authorization:", urlResp.status, urlText.substring(0, 200));

  if (!urlResp.ok) {
    throw new Error(`get_download_authorization failed: ${urlText}`);
  }

  const urlData = JSON.parse(urlText);
  // b2_get_download_authorization returns URL with auth token built in
  const authorizationForPath = urlData.authorizationToken || urlData.apiUrlToken;
  const downloadBase = urlData.downloadUrl || "https://f005.backblazeb2.com";
  
  console.log(">>> Got auth token:", authorizationForPath ? "YES" : "NO", "downloadBase:", downloadBase);
  
  if (!authorizationForPath) {
    throw new Error(`No auth token in response: ${JSON.stringify(urlData)}`);
  }
  
  // Direct download URL with token in path
  return `${downloadBase}/file/${BUCKET_NAME}/${fileName}?Authorization=${authorizationForPath}`;
}

Deno.serve(async (req) => {
  console.log(">>> Request received, method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!B2_KEY_ID || !B2_APP_KEY || !BUCKET_ID) {
    return new Response(JSON.stringify({ error: "Secrets not configured" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    // GET request - generate signed URL
    if (req.method === "GET") {
      const url = new URL(req.url);
      const fileKey = url.searchParams.get("key");
      
      if (!fileKey) {
        return new Response(JSON.stringify({ error: "key parameter required" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const { apiUrl, authToken } = await b2Auth();
      const signedUrl = await getSignedUrl(apiUrl, authToken, fileKey);
      
      return new Response(JSON.stringify({ url: signedUrl }), {
        status: 200, 
        headers: { 
          "Content-Type": "application/json", 
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders 
        }
      });
    }

    // DELETE request - delete file from B2
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const fileKey = url.searchParams.get("key");
      const fileId = url.searchParams.get("fileId");
      
      if (!fileKey) {
        return new Response(JSON.stringify({ error: "key parameter required" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const { apiUrl, authToken } = await b2Auth();
      
      // b2_delete_file_version requires fileId + fileName
      const delResp = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: "POST",
        headers: {
          "Authorization": authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileId: fileId || fileKey,
          fileName: fileKey
        })
      });
      
      const delText = await delResp.text();
      console.log(">>> Delete response:", delResp.status, delText);
      
      if (!delResp.ok) {
        return new Response(JSON.stringify({ error: `Delete failed: ${delText}` }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({ success: true, key: fileKey }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // POST request - upload
    const body = await req.json();
    const { name, type, base64, userId } = body;

    if (!base64 || !userId) {
      return new Response(JSON.stringify({ error: "base64 e userId obrigatorios" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { apiUrl, authToken } = await b2Auth();
    console.log(">>> Auth OK");

    // Get upload URL
    const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        "Authorization": authToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bucketId: BUCKET_ID })
    });

    const urlText = await urlResp.text();
    if (!urlResp.ok) {
      return new Response(JSON.stringify({ error: `get_upload_url failed: ${urlText}` }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const urlData = JSON.parse(urlText);
    const uploadUrl = urlData.uploadUrl;
    const uploadAuthToken = urlData.authorizationToken;

    // Upload
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;
    console.log(">>> Uploading:", fileName);

    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": uploadAuthToken,
        "Content-Type": type || "image/jpeg",
        "X-Bz-File-Name": fileName,
        "X-Bz-Content-Sha1": "do_not_verify"
      },
      body: bytes
    });

    const uploadText = await uploadResp.text();
    if (!uploadResp.ok) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadText}` }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const uploadData = JSON.parse(uploadText);
    console.log(">>> Upload SUCCESS");

    return new Response(JSON.stringify({ 
      url: `https://f005.backblazeb2.com/file/${BUCKET_NAME}/${fileName}`, 
      key: fileName, 
      fileId: uploadData.fileId 
    }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error(">>> ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});