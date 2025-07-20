import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from "cheerio";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, "");
}

async function getCiqualVitK(
  aliment: string,
): Promise<{ value: string; url: string } | null> {
  const searchUrl = `https://ciqual.anses.fr/`;
  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await searchRes.text();
  const $ = cheerio.load(html);
  const target = normalize(aliment);
  let bestMatch: { href: string; score: number } | null = null;
  $("a").each((_: any, el: any) => {
    const text = $(el).text();
    const normText = normalize(text);
    if (normText.includes(target)) {
      const href = $(el).attr("href");
      if (typeof href === "string") {
        const score = Math.abs(normText.length - target.length);
        if (!bestMatch || score < bestMatch.score) {
          bestMatch = { href, score };
        }
      }
    }
  });
  if (!bestMatch) return null;
  let ficheUrl: string = (bestMatch as { href: string; score: number }).href;
  if (!ficheUrl.startsWith("http")) {
    ficheUrl = `https://ciqual.anses.fr${ficheUrl}`;
  }
  const ficheRes = await fetch(ficheUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const ficheHtml = await ficheRes.text();
  const $fiche = cheerio.load(ficheHtml);
  let vitK = null;
  $fiche("tr").each((_: any, tr: any) => {
    const label = $fiche(tr).find("td").first().text().trim();
    if (label.includes("Vitamine K1")) {
      vitK = $fiche(tr).find("td").eq(1).text().trim();
      return false;
    }
  });
  if (!vitK) return null;
  return { value: vitK, url: ficheUrl };
}

async function getCiqualSuggestions(
  aliment: string,
): Promise<Array<{ nom: string; url: string }>> {
  const searchUrl = `https://ciqual.anses.fr/`;
  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await searchRes.text();
  const $ = cheerio.load(html);
  const target = normalize(aliment);
  const suggestions: Array<{ nom: string; url: string }> = [];
  $("a").each((_: any, el: any) => {
    const text = $(el).text();
    const normText = normalize(text);
    if (
      normText.includes(target) ||
      target.includes(normText) ||
      normText.split(" ").some((word) => target.includes(word)) ||
      target.split(" ").some((word) => normText.includes(word))
    ) {
      let href = $(el).attr("href");
      if (typeof href === "string" && href.length > 0) {
        if (!href.startsWith("http")) href = `https://ciqual.anses.fr${href}`;
        suggestions.push({ nom: text.trim(), url: href });
      }
    }
  });
  return suggestions;
}

async function getCiqualVitKFromUrl(url: string): Promise<string | null> {
  const ficheRes = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const ficheHtml = await ficheRes.text();
  const $fiche = cheerio.load(ficheHtml);
  let vitK = null;
  $fiche("tr").each((_: any, tr: any) => {
    const label = $fiche(tr).find("td").first().text().trim();
    if (label.includes("Vitamine K1")) {
      vitK = $fiche(tr).find("td").eq(1).text().trim();
      return false;
    }
  });
  return vitK;
}

async function getCiqualSuggestionsWithValues(
  aliment: string,
): Promise<Array<{ nom: string; url: string; valeur: string | null }>> {
  const suggestions = await getCiqualSuggestions(aliment);
  const results: Array<{ nom: string; url: string; valeur: string | null }> =
    [];
  for (const s of suggestions) {
    const valeur = await getCiqualVitKFromUrl(s.url);
    results.push({ nom: s.nom, url: s.url, valeur });
  }
  return results;
}

const FR_EN: Record<string, string> = {
  basilic: "basil",
  épinard: "spinach",
  persil: "parsley",
  laitue: "lettuce",
  chou: "cabbage",
  brocoli: "broccoli",
  carotte: "carrot",
  pomme: "apple",
  poire: "pear",
  banane: "banana",
  // Ajoute d'autres aliments courants ici
};

export async function POST(req: Request) {
  const body = await req.json();
  const { image, aliment } = body;

  if (!image && !aliment) {
    return NextResponse.json(
      { error: "Aucune image ou aliment fourni" },
      { status: 400 },
    );
  }

  try {
    let detectedAliment = aliment;
    let vitamineK = "? µg";
    let source = null;
    let alimentRecherche = detectedAliment;

    if (image) {
      // 1. Détection de l'aliment par Gemini (image)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
Tu es un expert en nutrition. Analyse la photo ci-jointe et réponds uniquement sous la forme :\nAliment : [nom de l'aliment]\nVitamine K : [nombre en microgrammes pour 100g, avec l'unité µg, par exemple "180 µg"].\nVérifie la valeur sur Internet (sources officielles, CIQUAL, USDA, etc.) et donne la valeur la plus à jour et fiable possible. Si tu n'es pas certain, propose une estimation plausible mais précise.\nExemple :\nAliment : basilic\nVitamine K : 415 µg
`;
      const geminiResult = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: image.split(",")[1] } },
      ]);
      const responseText = geminiResult.response.text().trim();
      const alimentMatch = responseText.match(/Aliment\s*:\s*(.+)/i);
      const vitamineKMatch = responseText.match(
        /Vitamine K\s*:\s*([\d,.]+\s*µg)/i,
      );
      detectedAliment = alimentMatch ? alimentMatch[1].trim() : "aliment";
      vitamineK = vitamineKMatch ? vitamineKMatch[1].trim() : "? µg";
    } else if (aliment) {
      // 1bis. Reformulation Gemini sur texte utilisateur
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
Tu es un expert en nutrition. Pour l'aliment suivant : "${aliment}", réponds uniquement sous la forme :\nAliment : [nom de l'aliment corrigé ou reconnu]\nVitamine K : [nombre en microgrammes pour 100g, avec l'unité µg, par exemple "180 µg"].\nVérifie la valeur sur Internet (sources officielles, CIQUAL, USDA, etc.) et donne la valeur la plus à jour et fiable possible. Si tu n'es pas certain, propose une estimation plausible mais précise.\nExemple :\nAliment : basilic\nVitamine K : 415 µg
`;
      const geminiResult = await model.generateContent([{ text: prompt }]);
      const responseText = geminiResult.response.text().trim();
      const alimentMatch = responseText.match(/Aliment\s*:\s*(.+)/i);
      const vitamineKMatch = responseText.match(
        /Vitamine K\s*:\s*([\d,.]+\s*µg)/i,
      );
      detectedAliment = alimentMatch ? alimentMatch[1].trim() : aliment;
      vitamineK = vitamineKMatch ? vitamineKMatch[1].trim() : "? µg";
    }

    // Suggestions CIQUAL (français puis anglais)
    let suggestions = await getCiqualSuggestionsWithValues(detectedAliment);
    if (suggestions.length === 0 && FR_EN[detectedAliment.toLowerCase()]) {
      suggestions = await getCiqualSuggestionsWithValues(
        FR_EN[detectedAliment.toLowerCase()],
      );
    }
    // Recherche CIQUAL sur le meilleur match
    let ciqualResult =
      suggestions.length > 0 && suggestions[0].valeur
        ? { value: suggestions[0].valeur, url: suggestions[0].url }
        : null;
    if (ciqualResult) {
      vitamineK = `${ciqualResult.value} µg (officiel CIQUAL)`;
      source = ciqualResult.url;
    } else if (vitamineK && vitamineK !== "? µg") {
      vitamineK = `${vitamineK} (estimation IA)`;
    }

    return NextResponse.json({
      aliment: detectedAliment,
      alimentRecherche,
      vitamineK,
      source,
      suggestions,
    });
  } catch (error) {
    console.error("Erreur analyse :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
