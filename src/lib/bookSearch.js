import { base44 } from "@/api/base44Client";

// Search Google Books by ISBN (used by scanner) — falls back to Open Library
export const searchBookByIsbn = async (isbn) => {
  try {
    const gbResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    if (gbResponse.ok) {
      const gbData = await gbResponse.json();
      const item = gbData.items?.[0];
      if (item?.volumeInfo?.title) {
        const info = item.volumeInfo;
        let coverUrl = "";
        if (info.imageLinks) {
          coverUrl = (info.imageLinks.extraLarge || info.imageLinks.large ||
            info.imageLinks.medium || info.imageLinks.thumbnail ||
            info.imageLinks.smallThumbnail || "").replace('http:', 'https:');
          if (coverUrl) coverUrl = coverUrl.replace('zoom=1', 'zoom=3');
        }
        return {
          found: true,
          title: info.title,
          author: (info.authors || ["Auteur inconnu"]).join(", "),
          year: info.publishedDate ? parseInt(info.publishedDate) : null,
          pageCount: info.pageCount || null,
          description: info.description || "",
          coverUrl,
          categories: info.categories || [],
          isbn
        };
      }
    }
  } catch (e) {
    console.log("Google Books ISBN search failed:", e);
  }

  // Fallback: Open Library
  try {
    const olResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    if (olResponse.ok) {
      const olData = await olResponse.json();
      const book = olData[`ISBN:${isbn}`];
      if (book?.title) {
        return {
          found: true,
          title: book.title,
          author: book.authors?.map(a => a.name).join(", ") || "Auteur inconnu",
          year: book.publish_date ? parseInt(book.publish_date) : null,
          pageCount: book.number_of_pages || null,
          description: book.excerpts?.[0]?.text || "",
          coverUrl: book.cover?.large || book.cover?.medium || "",
          categories: book.subjects?.map(s => s.name).slice(0, 3) || [],
          isbn
        };
      }
    }
  } catch (e) {
    console.log("Open Library ISBN search failed:", e);
  }

  return { found: false };
};

// Search books by free-text query across Google Books, Open Library and AI web search
export const searchBooks = async (query) => {
  const results = [];

  // ── Source 1: Google Books (best for recent French translations) ──
  try {
    const gbResponse = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&orderBy=relevance`
    );
    if (gbResponse.ok) {
      const gbData = await gbResponse.json();
      if (gbData.items) {
        for (const item of gbData.items) {
          const info = item.volumeInfo;
          if (!info?.title) continue;
          let coverUrl = "";
          if (info.imageLinks) {
            coverUrl = (info.imageLinks.extraLarge || info.imageLinks.large ||
              info.imageLinks.medium || info.imageLinks.thumbnail ||
              info.imageLinks.smallThumbnail || "").replace('http:', 'https:');
            if (coverUrl) coverUrl = coverUrl.replace('zoom=1', 'zoom=3');
          }
          results.push({
            id: `gb-${item.id}`,
            title: info.title,
            author: (info.authors || ["Auteur inconnu"]).join(", "),
            year: info.publishedDate ? parseInt(info.publishedDate) : null,
            pageCount: info.pageCount || null,
            description: info.description || "",
            coverUrl,
            categories: info.categories || [],
            isbn: info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier ||
                  info.industryIdentifiers?.[0]?.identifier || "",
            source: 'google'
          });
        }
      }
    }
  } catch (e) {
    console.log("Google Books search failed:", e);
  }

  // ── Source 2: Open Library (no rate limit, broad coverage) ──
  try {
    const olResponse = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,first_publish_year,number_of_pages_median,subject,isbn,cover_i`
    );
    if (olResponse.ok) {
      const olData = await olResponse.json();
      if (olData.docs) {
        for (const doc of olData.docs) {
          if (!doc.title) continue;
          results.push({
            id: `ol-${doc.key}`,
            title: doc.title,
            author: (doc.author_name || ["Auteur inconnu"]).join(", "),
            year: doc.first_publish_year || null,
            pageCount: doc.number_of_pages_median || null,
            description: "",
            coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "",
            categories: doc.subject ? doc.subject.slice(0, 3) : [],
            isbn: doc.isbn?.[0] || "",
            source: 'openlibrary'
          });
        }
      }
    }
  } catch (e) {
    console.log("Open Library search failed:", e);
  }

  // Deduplicate by title+author
  const deduped = [];
  const seen = new Set();
  const pushUnique = (b) => {
    const key = `${b.title.toLowerCase().trim()}|${b.author.toLowerCase().trim()}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(b);
  };
  results.forEach(pushUnique);

  // ── Source 3 (fallback): AI web search — covers recent French books missing from both APIs ──
  if (deduped.length === 0) {
    try {
      const aiRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Recherche sur internet les livres correspondant à la requête: "${query}". Donne jusqu'à 5 livres correspondants, en priorité les éditions françaises récentes (pour les traductions, donne le titre français). Inclus l'URL d'une image de couverture si possible.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            books: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  author: { type: "string" },
                  publication_year: { type: "number" },
                  page_count: { type: "number" },
                  description: { type: "string" },
                  cover_image_url: { type: "string" },
                  isbn: { type: "string" }
                },
                required: ["title", "author"]
              }
            }
          },
          required: ["books"]
        }
      });
      for (const [idx, b] of (aiRes.books || []).slice(0, 5).entries()) {
        if (!b.title || !b.author) continue;
        pushUnique({
          id: `ai-${b.isbn || idx}`,
          title: b.title,
          author: b.author,
          year: b.publication_year || null,
          pageCount: b.page_count || null,
          description: b.description || "",
          coverUrl: b.cover_image_url || "",
          categories: [],
          isbn: b.isbn || "",
          source: 'ai'
        });
      }
    } catch (e) {
      console.log("AI search failed:", e);
    }
  }

  // ── Sort: books with cover first, then by year (newer first) ──
  deduped.sort((a, b) => {
    if (!!b.coverUrl !== !!a.coverUrl) return b.coverUrl ? 1 : -1;
    if (a.year && b.year) return b.year - a.year;
    if (a.year && !b.year) return -1;
    if (!a.year && b.year) return 1;
    return 0;
  });

  return deduped.slice(0, 20);
};