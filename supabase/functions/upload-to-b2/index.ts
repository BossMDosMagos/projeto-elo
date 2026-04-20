// supabase/functions/upload-to-b2/index.ts
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.398.0";

const s3 = new S3Client({
  region: "us-west-002",
  endpoint: "https://s3.us-west-002.backblazeb2.com",
  credentials: {
    accessKeyId: Deno.env.get("B2_KEY_ID") || "",
    secretAccessKey: Deno.env.get("B2_APPLICATION_KEY") || "",
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    
    if (!file || !userId) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), { 
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const buffer = await file.arrayBuffer();
    const timestamp = Date.now();
    const filename = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const key = `usuarios/${userId}/album/${timestamp}_${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: "Elo-User-Albums",
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: file.type || "image/jpeg",
    }));

    const url = `https://elo-user-albums.s3.us-west-002.backblazeb2.com/${key}`;

    return new Response(JSON.stringify({ url, key }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});