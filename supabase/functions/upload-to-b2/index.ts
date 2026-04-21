const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const B2_KEY_ID = Deno.env.get("B2_KEY_ID") || "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const BUCKET_ID = Deno.env.get("B2_BUCKET_ID") || "";

console.log("=== START ===");
console.log("B2_KEY_ID:", B2_KEY_ID ? "SET" : "NOT SET");
console.log("B2_APP_KEY:", B2_APP_KEY ? "SET" : "NOT SET");
console.log("BUCKET_ID:", BUCKET_ID ? "SET" : "NOT SET");
console.log("==================");

Deno.serve(async (req) => {
  console.log(">>> Request received");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Check secrets immediately
  if (!B2_KEY_ID) {
    console.error("MISSING B2_KEY_ID");
    return new Response(JSON.stringify({ error: "B2_KEY_ID not configured" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  if (!B2_APP_KEY) {
    console.error("MISSING B2_APP_KEY");
    return new Response(JSON.stringify({ error: "B2_APPLICATION_KEY not configured" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  if (!BUCKET_ID) {
    console.error("MISSING BUCKET_ID");
    return new Response(JSON.stringify({ error: "B2_BUCKET_ID not configured" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    const body = await req.json();
    const { name, type, base64, userId } = body;
    console.log(">>> Upload request:", userId, name);

    if (!base64 || !userId) {
      return new Response(JSON.stringify({ error: "base64 e userId sao obrigatorios" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // STEP 1: Authorize with B2
    console.log(">>> Step 1: Authorizing with B2_KEY_ID:", B2_KEY_ID);
    const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);
    
    const authResp = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${creds}`,
        "Content-Type": "application/json"
      }
    });

    const authText = await authResp.text();
    console.log(">>> Auth response:", authResp.status, authText);

    if (!authResp.ok) {
      console.error(">>> Auth FAILED:", authText);
      return new Response(JSON.stringify({ error: `B2 Auth failed: ${authText}` }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const authData = JSON.parse(authText);
    
    // Handle both response formats
    const apiUrl = authData.apiUrl || authData.apiInfo?.storageApi?.apiUrl;
    const authToken = authData.authorizationToken || authData.apiInfo?.storageApi?.authToken;
    const accountId = authData.accountId;
    
    console.log(">>> Auth OK, apiUrl:", apiUrl, "accountId:", accountId);

    if (!apiUrl || !authToken) {
      console.error(">>> No apiUrl or authToken in:", authData);
      return new Response(JSON.stringify({ error: `Missing apiUrl/authToken in B2 response: ${authText}` }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // STEP 2: Get upload URL
    console.log(">>> Step 2: Getting upload URL for bucket:", BUCKET_ID);
    const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        "Authorization": authToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bucketId: BUCKET_ID })
    });

    const urlText = await urlResp.text();
    console.log(">>> Get URL response:", urlResp.status, urlText);

    if (!urlResp.ok) {
      console.error(">>> Get URL FAILED:", urlText);
      return new Response(JSON.stringify({ error: `B2 get_upload_url failed: ${urlText}` }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const urlData = JSON.parse(urlText);
    const uploadUrl = urlData.uploadUrl;
    const uploadAuthToken = urlData.authorizationToken;

    if (!uploadUrl) {
      console.error(">>> No uploadUrl:", urlData);
      return new Response(JSON.stringify({ error: `No uploadUrl: ${urlText}` }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(">>> Got uploadUrl");

    // STEP 3: Upload
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;
    console.log(">>> Step 3: Uploading:", fileName);

    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": uploadAuthToken,
        "Content-Type": type || "image/jpeg",
        "X-Bz-File-Name": fileName
      },
      body: bytes
    });

    const uploadText = await uploadResp.text();
    console.log(">>> Upload response:", uploadResp.status, uploadText);

    if (!uploadResp.ok) {
      console.error(">>> Upload FAILED:", uploadText);
      return new Response(JSON.stringify({ error: `B2 upload failed: ${uploadText}` }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const uploadData = JSON.parse(uploadText);
    const fileUrl = `https://f005.backblazeb2.com/file/Elo-User-Albums/${fileName}`;
    
    console.log(">>> SUCCESS! URL:", fileUrl);

    return new Response(JSON.stringify({ url: fileUrl, key: fileName, fileId: uploadData.fileId }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error(">>> CATCH:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});