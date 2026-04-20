const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const B2_API = "https://api.backblazeb2.com";
const B2_KEY_ID = Deno.env.get("B2_KEY_ID") || "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const BUCKET_NAME = "Elo-User-Albums";
const BUCKET_ID = Deno.env.get("B2_BUCKET_ID") || "";

console.log("B2_KEY_ID:", B2_KEY_ID ? "set" : "NOT SET");

interface B2AuthResponse {
  accountId: string;
  allowed: {
    bucketId: string | null;
    bucketName: string | null;
    namePrefix: string | null;
    capabilities: string[];
  };
  apiInfo: {
    storageApi: {
      apiUrl: string;
      authToken: string;
      capabilities: string[];
    };
  };
}

async function b2Auth(): Promise<{ apiUrl: string; authToken: string; allowed: any }> {
  const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);
  
  console.log("Authenticating with B2...");
  
  const resp = await fetch(`${B2_API}/b2api/v2/b2_authorize_account`, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/json"
    }
  });
  
  if (!resp.ok) {
    const err = await resp.text();
    console.error("B2 Auth error:", resp.status, err);
    throw new Error(`B2 Auth failed: ${resp.status} - ${err}`);
  }
  
  const data: B2AuthResponse = await resp.json();
  console.log("B2 Auth response keys:", Object.keys(data));
  console.log("B2 capabilities:", data.allowed?.capabilities, data.apiInfo?.storageApi?.capabilities);
  
  // Check if key has write capabilities
  const caps = data.allowed?.capabilities || data.apiInfo?.storageApi?.capabilities || [];
  if (!caps.includes("writeFiles")) {
    console.error("Key capabilities:", caps);
    throw new Error(`Key does not have writeFiles permission. Current capabilities: ${caps.join(", ")}`);
  }
  
  const apiUrl = data.apiInfo.storageApi.apiUrl;
  const authToken = data.apiInfo.storageApi.authToken;
  const allowed = data.allowed;
  
  console.log("Auth success - apiUrl:", apiUrl);
  console.log("Allowed:", JSON.stringify(allowed));
  
  return { apiUrl, authToken, allowed };
}

async function getUploadUrl(apiUrl: string, authToken: string, allowed: any): Promise<{ uploadUrl: string; uploadAuthToken: string }> {
  let bucketId = BUCKET_ID || allowed?.bucketId;
  
  console.log("=== getUploadUrl DEBUG ===");
  console.log("BUCKET_ID from env:", BUCKET_ID);
  console.log("allowed.bucketId:", allowed?.bucketId);
  console.log("Final bucketId being used:", bucketId);
  console.log("=========================");
  
  if (!bucketId) {
    throw new Error("BUCKET_ID não configurado. Configure B2_BUCKET_ID nos secrets ou use uma chave com bucketrestringido.");
  }
  
  console.log("Using bucketId:", bucketId);
  
  console.log("Getting upload URL for bucket:", bucketId);
  
  const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ bucketId })
  });
  
  const urlText = await urlResp.text();
  console.log("Get Upload URL response:", urlResp.status, urlText);
  
  if (!urlResp.ok) {
    throw new Error(`B2 Get Upload URL failed: ${urlResp.status} - ${urlText}`);
  }
  
  const urlData = JSON.parse(urlText);
  
  if (!urlData.uploadUrl || !urlData.authorizationToken) {
    console.error("Invalid upload URL response:", urlData);
    throw new Error(`Invalid upload URL response: ${JSON.stringify(urlData)}`);
  }
  
  return {
    uploadUrl: urlData.uploadUrl,
    uploadAuthToken: urlData.authorizationToken
  };
}

async function uploadToB2(base64: string, name: string, userId: string, type: string) {
  console.log("Starting upload:", userId, name, type);
  
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;
  console.log("File name:", fileName);
  
  const { apiUrl, authToken, allowed } = await b2Auth();
  console.log("Got API URL:", apiUrl);
  
  const { uploadUrl, uploadAuthToken } = await getUploadUrl(apiUrl, authToken, allowed);
  console.log("Got Upload URL:", uploadUrl);
  
  const uploadResp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": uploadAuthToken,
      "Content-Type": type || "image/jpeg",
      "X-Bz-File-Name": fileName
    },
    body: bytes
  });
  
  if (!uploadResp.ok) {
    const err = await uploadResp.text();
    console.error("B2 Upload error:", uploadResp.status, err);
    throw new Error(`B2 Upload failed: ${uploadResp.status} - ${err}`);
  }
  
  const uploadData = await uploadResp.json();
  console.log("Upload success:", JSON.stringify(uploadData));
  
  const fileUrl = `https://f005.backblazeb2.com/file/${BUCKET_NAME}/${fileName}`;
  
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
        JSON.stringify({ error: "Secrets not configured" }),
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
    console.error("Upload error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});