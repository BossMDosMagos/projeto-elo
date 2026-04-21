const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const B2_KEY_ID = Deno.env.get("B2_KEY_ID") || "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const BUCKET_ID = Deno.env.get("B2_BUCKET_ID") || "";

console.log("=== FUNCTION START ===");
console.log("B2_KEY_ID:", B2_KEY_ID ? "DEFINED" : "UNDEFINED");
console.log("B2_APPLICATION_KEY:", B2_APP_KEY ? "DEFINED" : "UNDEFINED");
console.log("B2_BUCKET_ID:", BUCKET_ID ? "DEFINED" : "UNDEFINED");

async function handler(req: Request): Promise<Response> {
  try {
    // Verificar secrets
    if (!B2_KEY_ID) {
      console.error("MISSING: B2_KEY_ID");
      return new Response(
        JSON.stringify({ error: "Secret B2_KEY_ID not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!B2_APP_KEY) {
      console.error("MISSING: B2_APPLICATION_KEY");
      return new Response(
        JSON.stringify({ error: "Secret B2_APPLICATION_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!BUCKET_ID) {
      console.error("MISSING: B2_BUCKET_ID");
      return new Response(
        JSON.stringify({ error: "Secret B2_BUCKET_ID not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const { name, type, base64, userId } = body;

    if (!base64 || !userId) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos: base64 e userId obrigatorios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing upload for user:", userId, "file:", name);

    const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);

    // Etapa 1
    console.log("Step 1: Authorize");
    const authResp = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${creds}`,
        "Content-Type": "application/json"
      }
    });

    if (!authResp.ok) {
      const err = await authResp.text();
      console.error("Auth error:", err);
      return new Response(
        JSON.stringify({ error: `Auth failed: ${err}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authData = await authResp.json();
    const apiUrl = authData.apiInfo?.storageApi?.apiUrl;
    const authToken = authData.apiInfo?.storageApi?.authToken;
    
    console.log("Auth OK, apiUrl:", apiUrl);

    if (!apiUrl || !authToken) {
      console.error("Invalid auth response:", authData);
      return new Response(
        JSON.stringify({ error: `Invalid auth response: ${JSON.stringify(authData)}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Etapa 2
    console.log("Step 2: Get upload URL, bucketId:", BUCKET_ID);
    const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        "Authorization": authToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bucketId: BUCKET_ID })
    });

    const urlText = await urlResp.text();
    console.log("Get URL response:", urlResp.status, urlText.substring(0, 300));

    if (!urlResp.ok) {
      console.error("Get URL error:", urlText);
      return new Response(
        JSON.stringify({ error: `get_upload_url failed (${urlResp.status}): ${urlText}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const urlData = JSON.parse(urlText);
    const uploadUrl = urlData.uploadUrl;
    const uploadAuthToken = urlData.authorizationToken;

    if (!uploadUrl) {
      console.error("No uploadUrl in:", urlData);
      return new Response(
        JSON.stringify({ error: `No uploadUrl returned: ${JSON.stringify(urlData)}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Got uploadUrl:", uploadUrl);

    // Etapa 3
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;

    console.log("Step 3: Uploading file:", fileName);
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
    console.log("Upload response:", uploadResp.status, uploadText.substring(0, 300));

    if (!uploadResp.ok) {
      console.error("Upload error:", uploadText);
      return new Response(
        JSON.stringify({ error: `Upload failed (${uploadResp.status}): ${uploadText}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const uploadData = JSON.parse(uploadText);
    const fileUrl = `https://f005.backblazeb2.com/file/Elo-User-Albums/${fileName}`;

    console.log("=== UPLOAD SUCCESS ===");

    return new Response(
      JSON.stringify({ url: fileUrl, key: fileName, fileId: uploadData.fileId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("CATCH ERROR:", error.message);
    console.error("Stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return handler(req);
});