const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const B2_API = "https://api.backblazeb2.com";
const B2_KEY_ID = Deno.env.get("B2_KEY_ID") || "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const BUCKET_ID = Deno.env.get("B2_BUCKET_ID") || "";

console.log("B2_KEY_ID:", B2_KEY_ID ? "set" : "NOT SET");
console.log("B2_BUCKET_ID:", BUCKET_ID || "NOT SET");

async function uploadToB2(base64: string, name: string, userId: string, type: string) {
  if (!BUCKET_ID) {
    throw new Error("B2_BUCKET_ID not configured in secrets");
  }
  
  console.log("=== UPLOAD START ===");
  console.log("bucketId:", BUCKET_ID);
  
  const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);
  
  // Etapa 1: Authorize
  console.log("Step 1: b2_authorize_account");
  const authResp = await fetch(`${B2_API}/b2api/v2/b2_authorize_account`, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/json"
    }
  });
  
  if (!authResp.ok) {
    const err = await authResp.text();
    throw new Error(`Auth failed: ${authResp.status} - ${err}`);
  }
  
  const authData = await authResp.json();
  const apiUrl = authData.apiInfo.storageApi.apiUrl;
  const authToken = authData.apiInfo.storageApi.authToken;
  console.log("Auth OK, apiUrl:", apiUrl);
  
  // Etapa 2: Get Upload URL com bucketId
  console.log("Step 2: b2_get_upload_url with bucketId:", BUCKET_ID);
  const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ bucketId: BUCKET_ID })
  });
  
  const urlText = await urlResp.text();
  console.log("get_upload_url response:", urlResp.status, urlText.substring(0, 500));
  
  if (!urlResp.ok) {
    throw new Error(`b2_get_upload_url failed (${urlResp.status}): ${urlText}`);
  }
  
  const urlData = JSON.parse(urlText);
  
  // Handle both uploadUrl and fileId response
  const uploadUrl = urlData.uploadUrl || urlData.file?.fileUrl;
  const uploadAuthToken = urlData.authorizationToken || urlData.file?.apiUrl;
  
  if (!uploadUrl) {
    console.error("Response missing uploadUrl:", urlData);
    throw new Error(`No uploadUrl in response. Full response: ${JSON.stringify(urlData)}`);
  }
  
  console.log("Got uploadUrl:", uploadUrl);
  
  // Convert base64 to bytes
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;
  
  // Etapa 3: Upload
  console.log("Step 3: Uploading to", uploadUrl);
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
  console.log("Upload response:", uploadResp.status, uploadText.substring(0, 500));
  
  if (!uploadResp.ok) {
    throw new Error(`Upload failed (${uploadResp.status}): ${uploadText}`);
  }
  
  const uploadData = JSON.parse(uploadText);
  const fileUrl = urlData.file?.fileUrl || `https://f005.backblazeb2.com/file/Elo-User-Albums/${fileName}`;
  
  console.log("=== UPLOAD SUCCESS ===");
  
  return {
    url: fileUrl,
    key: fileName,
    fileId: uploadData.fileId || uploadData.file?.fileId
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!B2_KEY_ID || !B2_APP_KEY) {
      return new Response(
        JSON.stringify({ error: "B2 credentials not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const { name, type, base64, userId } = body;

    if (!base64 || !userId) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await uploadToB2(base64, name, userId, type);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("ERROR:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});