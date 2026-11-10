export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORSヘッダー設定（HTMLからの通信を許可）
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. お知らせの取得 (GET)
    if (url.pathname === '/api/notices' && request.method === 'GET') {
      const { results } = await env.DB.prepare("SELECT * FROM notices ORDER BY id DESC").all();
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. お知らせの追加 (POST)
    if (url.pathname === '/api/notices' && request.method === 'POST') {
      const data = await request.json();
      await env.DB.prepare("INSERT INTO notices (title, content, date) VALUES (?, ?, ?)")
        .bind(data.title, data.content, data.date)
        .run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. お知らせの削除 (DELETE)
    if (url.pathname === '/api/notices' && request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      await env.DB.prepare("DELETE FROM notices WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};