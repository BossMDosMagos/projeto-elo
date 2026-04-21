const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const B2_KEY_ID = Deno.env.get("B2_KEY_ID") || "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const BUCKET_ID = Deno.env.get("B2_BUCKET_ID") || "";

console.log("===================");
console.log("FUNCTION START");
console.log("B2_KEY_ID defined:", !!B2_KEY_ID);
console.log("B2_APP_KEY defined:", !!B2_APP_KEY);
console.log("BUCKET_ID defined:", !!BUCKET_ID);
console.log("===================");

Deno.serve(async (req) => {
  console.log(">> Recebi a requisição");
  
  if (req.method === "OPTIONS") {
    console.log(">> OPTIONS request, returning ok");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check secrets FIRST
    console.log(">> Checking secrets...");
    console.log(">> Bucket ID carregado:", !!BUCKET_ID);
    
    if (!B2_KEY_ID) {
      console.error(">> ERROR: B2_KEY_ID not set");
      return new Response(
        JSON.stringify({ error: "Secret B2_KEY_ID missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!B2_APP_KEY) {
      console.error(">> ERROR: B2_APP_KEY not set");
      return new Response(
        JSON.stringify({ error: "Secret B2_APPLICATION_KEY missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!BUCKET_ID) {
      console.error(">> ERROR: BUCKET_ID not set");
      return new Response(
        JSON.stringify({ error: "Secret B2_BUCKET_ID missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse body
    console.log(">> Parsing request body...");
    const body = await req.json();
    const { name, type, base64, userId } = body;
    console.log(">> userId:", userId, "name:", name);

    if (!base64 || !userId) {
      console.error(">> ERROR: incomplete data");
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 1: Auth
    console.log(">> Tentando autorizar no B2...");
    const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);
    console.log(">> Creds length:", creds.length);
    
    const authResp = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${creds}`,
        "Content-Type": "application/json"
      }
    });
    console.log(">> Auth response status:", authResp.status);

    if (!authResp.ok) {
      const err = await authResp.text();
      console.error(">> Auth ERROR:", err);
      return new Response(
        JSON.stringify({ error: `Auth failed: ${err}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authData = await authResp.json();
    const apiUrl = authData.apiInfo?.storageApi?.apiUrl;
    const authToken = authData.apiInfo?.storageApi?.authToken;
    console.log(">> Auth OK, apiUrl:", apiUrl ? "SET" : "NOT SET");

    if (!apiUrl || !authToken) {
      console.error(">> ERROR: No apiUrl or authToken in response");
      return new Response(
        JSON.stringify({ error: "Invalid B2 auth response" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 2: Get upload URL
    console.log(">> Getting upload URL for bucket:", BUCKET_ID);
    const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        "Authorization": authToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bucketId: BUCKET_ID })
    });
    console.log(">> Get URL response status:", urlResp.status);

    if (!urlResp.ok) {
      const err = await urlResp.text();
      console.error(">> Get URL ERROR:", err);
      return new Response(
        JSON.stringify({ error: `Get URL failed: ${err}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const urlData = await urlResp.json();
    const uploadUrl = urlData.uploadUrl;
    const uploadAuthToken = urlData.authorizationToken;
    console.log(">> Got uploadUrl:", uploadUrl ? "YES" : "NO");

    if (!uploadUrl) {
      console.error(">> ERROR: No uploadUrl in response:", JSON.stringify(urlData));
      return new Response(
        JSON.stringify({ error: "No uploadUrl from B2" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 3: Upload
    console.log(">> Converting base64 to bytes...");
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log(">> Bytes length:", bytes.length);

    const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;
    console.log(">> Uploading file:", fileName);

    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": uploadAuthToken,
        "Content-Type": type || "image/jpeg",
        "X-Bz-File-Name": fileName
      },
      body: bytes
    });
    console.log(">> Upload response status:", uploadResp.status);

    if (!uploadResp.ok) {
      const err = await uploadResp.text();
      console.error(">> Upload ERROR:", err);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${err}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const uploadData = await uploadResp.json();
    console.log(">> Upload SUCCESS, fileId:", uploadData.fileId);

    const fileUrl = `https://f005.backblazeb2.com/file/Elo-User-Albums/${fileName}`;
    console.log(">> DONE! Returning URL:", fileUrl);

    return new Response(
      JSON.stringify({ url: fileUrl, key: fileName, fileId: uploadData.fileId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error(">> CATCH ERROR:", error.message);
    console.error(">> Stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});