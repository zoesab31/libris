import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = Deno.env.get('PINTEREST_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'Pinterest token not configured' }, { status: 500 });
    }

    // Récupérer les épingles de l'utilisateur
    const pinterestResponse = await fetch(
      'https://api.pinterest.com/v1/me/pins?access_token=' + accessToken + '&fields=id,image,url,description,created_at,board',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!pinterestResponse.ok) {
      throw new Error(`Pinterest API error: ${pinterestResponse.status}`);
    }

    const data = await pinterestResponse.json();
    const pins = data.data || [];

    // Importer les épingles comme fan arts
    const importedFanArts = [];
    for (const pin of pins) {
      try {
        const fanArt = await base44.entities.FanArt.create({
          image_url: pin.image?.original?.url || pin.url,
          note: pin.description || `Importé de Pinterest: ${pin.url}`,
          source_url: `https://pinterest.com/pin/${pin.id}/`,
          artist_name: 'Pinterest'
        });
        importedFanArts.push(fanArt);
      } catch (err) {
        console.log(`Skipped pin ${pin.id}: ${err.message}`);
      }
    }

    return Response.json({
      success: true,
      imported: importedFanArts.length,
      total: pins.length,
      fanArts: importedFanArts
    });
  } catch (error) {
    console.error('Error importing Pinterest pins:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});