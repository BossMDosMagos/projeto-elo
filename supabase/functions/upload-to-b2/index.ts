const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const B2_API = "https://api.backblazeb2.com";
const B2_KEY_ID = Deno.env.get("B2_KEY_ID") || "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const BUCKET_ID = Deno.env.get("B2_BUCKET_ID") || "b6ef232d8bd4aab391df0517";

console.log("=== B2 UPLOAD FUNCTION ===");
console.log("B2_KEY_ID:", B2_KEY_ID ? "set" : "NOT SET");
console.log("BUCKET_ID:", BUCKET_ID);
console.log("=========================");

async function b2Auth(): Promise<{ apiUrl: string; authToken: string }> {
  const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);
  
  const resp = await fetch(`${B2_API}/b2api/v2/b2_authorize_account`, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/json"
    }
  });
  
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`B2 Auth failed: ${resp.status} - ${err}`);
  }
  
  const data = await resp.json();
  console.log("Auth response:", JSON.stringify(data));
  
  // Handle both API formats
  const apiUrl = data.apiInfo?.storageApi?.apiUrl || data.storageApi?.apiUrl;
  const authToken = data.apiInfo?.storageApi?.authToken || data.storageApi?.authToken;
  
  if (!apiUrl || !authToken) {
    console.error("Invalid auth response:", data);
    throw new Error(`Invalid B2 auth response: ${JSON.stringify(data)}`);
  }
  
  console.log("Auth OK - apiUrl:", apiUrl);
  
  return { apiUrl, authToken };
}

async function uploadToB2(base64: string, name: string, userId: string, type: string) {
  console.log("=== UPLOAD START ===");
  console.log("userId:", userId);
  console.log("name:", name);
  console.log("type:", type);
  console.log("bucketId:", BUCKET_ID);
  
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;
  
  const { apiUrl, authToken } = await b2Auth();
  
  console.log("Getting upload URL for bucket:", BUCKET_ID);
  
  // Get upload URL using BUCKET_ID
  const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ bucketId: BUCKET_ID })
  });
  
  const urlText = await urlResp.text();
  console.log("b2_get_upload_url response:", urlResp.status, urlText);
  
  if (!urlResp.ok) {
    throw new Error(`B2 Get Upload URL failed (${urlResp.status}): ${urlText}`);
  }
  
  const urlData = JSON.parse(urlText);
  
  if (!urlData.uploadUrl) {
    console.error("No uploadUrl in response:", urlData);
    throw new Error(`B2 didn't return uploadUrl. Response: ${JSON.stringify(urlData)}`);
  }
  
  console.log("Upload URL:", urlData.uploadUrl);
  
  // Upload the file
  const uploadResp = await fetch(urlData.uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": urlData.authorizationToken,
      "Content-Type": type || "image/jpeg",
      "X-Bz-File-Name": fileName
    },
    body: bytes
  });
  
  const uploadText = await uploadResp.text();
  console.log("Upload response:", uploadResp.status, uploadText);
  
  if (!uploadResp.ok) {
    throw new Error(`B2 Upload failed (${uploadResp.status}): ${uploadText}`);
  }
  
  const uploadData = JSON.parse(uploadText);
  
  const fileUrl = `https://f005.backblazeb2.com/file/Elo-User-Albums/${fileName}`;
  
  console.log("=== UPLOAD SUCCESS ===");
  
  return {
    url: fileUrl,
    key: fileName,
    fileId: uploadData.fileId
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