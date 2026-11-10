// Cloudflare Pagesのworker.js
// パスワードの変更はSECRET_PASSWORDから
export default {
  async fetch(request, env) {
    // 1. すべてのレスポンスとPreflight判定で使うCORSヘッダー
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password, x-admin-password',
    };

    // 2. ブラウザのPreflight(OPTIONS)確認には、どのURLであっても即座に204(許可)を返して処理を終了する
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);

      // --------------------------------------------------
      // A. パスワード確認専用 API (幹部ログイン時)
      // --------------------------------------------------
      if (url.pathname === '/api/verify-password' && request.method === 'POST') {
        const adminPassword = request.headers.get('X-Admin-Password') || request.headers.get('x-admin-password');
        const SECRET_PASSWORD = "2026"; // 🔑 幹部用パスワード

        if (adminPassword === SECRET_PASSWORD) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({ error: 'パスワードが違います' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // --------------------------------------------------
      // B. 公開データ取得 API (GET) ※パスワード不要
      // --------------------------------------------------
      // お知らせ取得
      if (url.pathname === '/api/notices' && request.method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM notices ORDER BY id DESC").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // カバー曲取得
      if (url.pathname === '/api/covers' && request.method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM covers ORDER BY id DESC").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // --------------------------------------------------
      // C. 幹部専用書き込み API (POST / PUT / DELETE) ※要パスワード
      // --------------------------------------------------
      const adminPassword = request.headers.get('X-Admin-Password') || request.headers.get('x-admin-password');
      const SECRET_PASSWORD = "2026";

      if (adminPassword !== SECRET_PASSWORD) {
        return new Response(JSON.stringify({ error: 'パスワードが違います' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // お知らせ追加
      if (url.pathname === '/api/notices' && request.method === 'POST') {
        const data = await request.json();
        await env.DB.prepare("INSERT INTO notices (title, content, date) VALUES (?, ?, ?)")
          .bind(data.title, data.content, data.date)
          .run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // お知らせ削除
      if (url.pathname === '/api/notices' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        await env.DB.prepare("DELETE FROM notices WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // カバー曲追加
      if (url.pathname === '/api/covers' && request.method === 'POST') {
        const data = await request.json();
        await env.DB.prepare("INSERT INTO covers (title, artist, guitar_url, bass_url, drums_url) VALUES (?, ?, ?, ?, ?)")
          .bind(data.title, data.artist, data.guitar_url || '', data.bass_url || '', data.drums_url || '')
          .run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // カバー曲更新
      if (url.pathname === '/api/covers' && request.method === 'PUT') {
        const data = await request.json();
        await env.DB.prepare("UPDATE covers SET title = ?, artist = ?, guitar_url = ?, bass_url = ?, drums_url = ? WHERE id = ?")
          .bind(data.title, data.artist, data.guitar_url || '', data.bass_url || '', data.drums_url || '', data.id)
          .run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // カバー曲削除
      if (url.pathname === '/api/covers' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        await env.DB.prepare("DELETE FROM covers WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};