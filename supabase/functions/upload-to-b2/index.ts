const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const B2_API = "https://api.backblazeb2.com";
const B2_KEY_ID = Deno.env.get("B2_KEY_ID") || "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const BUCKET_NAME = "Elo-User-Albums";

async function b2Auth(): Promise<{ apiUrl: string; authorizationToken: string }> {
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
  return {
    apiUrl: data.apiInfo.storageApi.apiUrl,
    authorizationToken: data.apiInfo.storageApi.authToken
  };
}

async function getUploadUrl(apiUrl: string, authToken: string): Promise<{ uploadUrl: string; uploadAuthToken: string }> {
  const bucketResp = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ accountId: B2_KEY_ID })
  });
  
  if (!bucketResp.ok) {
    const err = await bucketResp.text();
    throw new Error(`B2 List Buckets failed: ${bucketResp.status} - ${err}`);
  }
  
  const bucketData = await bucketResp.json();
  const bucket = bucketData.buckets?.find((b: any) => b.bucketName === BUCKET_NAME);
  
  if (!bucket) {
    throw new Error(`Bucket "${BUCKET_NAME}" not found`);
  }
  
  const bucketId = bucket.bucketId;
  
  const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ bucketId })
  });
  
  if (!urlResp.ok) {
    const err = await urlResp.text();
    throw new Error(`B2 Get Upload URL failed: ${urlResp.status} - ${err}`);
  }
  
  const urlData = await urlResp.json();
  return {
    uploadUrl: urlData.uploadUrl,
    uploadAuthToken: urlData.authorizationToken
  };
}

async function uploadToB2(base64: string, name: string, userId: string, type: string) {
  if (!B2_KEY_ID || !B2_APP_KEY) {
    throw new Error("B2 credentials not configured");
  }
  
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;
  
  const { apiUrl, authorizationToken } = await b2Auth();
  const { uploadUrl, uploadAuthToken } = await getUploadUrl(apiUrl, authorizationToken);
  
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
    throw new Error(`B2 Upload failed: ${uploadResp.status} - ${err}`);
  }
  
  const uploadData = await uploadResp.json();
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});