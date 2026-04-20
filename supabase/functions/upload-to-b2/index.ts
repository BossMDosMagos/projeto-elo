import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.398.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const s3 = new S3Client({
  region: "us-east-005",
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  credentials: {
    accessKeyId: Deno.env.get("B2_KEY_ID") || "",
    secretAccessKey: Deno.env.get("B2_APPLICATION_KEY") || "",
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { name, type, base64, userId } = body;

    if (!base64 || !userId) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const fileName = `usuarios/${userId}/album/${Date.now()}_${name}`;

    await s3.send(new PutObjectCommand({
      Bucket: "Elo-User-Albums",
      Key: fileName,
      Body: bytes,
      ContentType: type,
    }));

    const publicUrl = `https://f005.backblazeb2.com/file/Elo-User-Albums/${fileName}`;

    return new Response(
      JSON.stringify({ url: publicUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});