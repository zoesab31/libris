import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image_url, description, book_title } = await req.json();

    if (!image_url) {
      return Response.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const accessToken = Deno.env.get('PINTEREST_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'Pinterest token not configured' }, { status: 500 });
    }

    // Créer une épingle sur Pinterest
    const pinDescription = description || `${book_title || 'Fan Art'} - Shared from Nos Livres`;
    
    const pinterestResponse = await fetch(
      'https://api.pinterest.com/v1/pins?access_token=' + accessToken,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          board: 'Nos Livres',
          note: pinDescription,
          image_url: image_url,
          link: 'https://nos-livres.app'
        })
      }
    );

    if (!pinterestResponse.ok) {
      const errorData = await pinterestResponse.text();
      throw new Error(`Pinterest API error: ${pinterestResponse.status} - ${errorData}`);
    }

    const result = await pinterestResponse.json();

    return Response.json({
      success: true,
      pin_url: `https://pinterest.com/pin/${result.id}/`,
      pin_id: result.id
    });
  } catch (error) {
    console.error('Error sharing to Pinterest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});