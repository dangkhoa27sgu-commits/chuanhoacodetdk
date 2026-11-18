// K-Pado proxy — chạy ở Vercel vùng iad1 (Mỹ), chỉ chuyển tiếp lệnh gọi Gemini.
const GOOGLE = "https://generativelanguage.googleapis.com";

export function GET() {
  return new Response("kpado-proxy OK — vùng: " + (process.env.VERCEL_REGION || "?"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

export async function POST(request) {
  const khoa = process.env.PROXY_KEY;
  if (!khoa || request.headers.get("x-kpado-proxy") !== khoa)
    return new Response(JSON.stringify({ error: { message: "Proxy từ chối: sai PROXY_KEY." } }), { status: 403 });

  const url = new URL(request.url);
  const path = (url.searchParams.get("path") || "").replace(/^\/+/, "");
  if (!/^v1(beta)?\/models\/[\w.\-]+:(streamGenerateContent|generateContent)$/.test(path))
    return new Response(JSON.stringify({ error: { message: "Đường dẫn không hợp lệ." } }), { status: 400 });
  url.searchParams.delete("path");
  const qs = url.searchParams.toString();

  const r = await fetch(`${GOOGLE}/${path}${qs ? "?" + qs : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": request.headers.get("x-goog-api-key") || "" },
    body: await request.text()
  });
  return new Response(r.body, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("content-type") || "application/json", "Cache-Control": "no-store" }
  });
}
