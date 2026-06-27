'use strict';

/**
 * Claude Deal Scout — uses the Anthropic API with web_search to discover
 * Israeli deals that fall outside the fixed scraping sources.
 * Returns candidates in the same shape as scripts/deal-bot.js.
 * Requires ANTHROPIC_API_KEY in env. Gracefully skips if missing.
 */

const BOT_NAME = 'DilzScout';

const SYSTEM_PROMPT = `You are DilzScout, a deal-discovery agent for Dilz, an Israeli deal-sharing app.
Your job: search the web for real, current deals available in Israel and return them as structured JSON.

Rules:
- Only include deals with a direct purchase URL (not social media, not aggregators)
- Minimum 15% discount OR a notable free offer
- Prefer Israeli stores: KSP, Bug, Ivory, Terminal X, Zap, Super-Pharm, Shufersal, Rami Levy, Wolt
- Also accept international stores shipping to Israel: Amazon, AliExpress, etc.
- Categories: Tech, Food, Fashion, Activities, Online
- ville: "Online" for online deals, city name for physical stores

When you find deals, return ONLY a valid JSON array. No prose, no markdown, just the raw JSON array.`;

const SEARCH_QUERIES = [
  'מבצעים אונליין ישראל היום הנחות גדולות 2024 KSP Bug Ivory',
  'Israel tech deals sale today discount percentage',
  'Wolt discount code promo Israel food delivery',
  'Terminal X fashion sale Israel online deals',
];

const DEAL_PROMPT = (query) => `Search for current deals matching: "${query}"

Return a JSON array where each item is:
{
  "titre": "deal title, max 120 chars, in Hebrew if from Israeli source",
  "description": "brief deal description, max 300 chars",
  "prix": <number, current price in ILS, 0 if free>,
  "prix_original": <number or null, original price in ILS>,
  "magasin": "store name",
  "url_source": "direct URL to the product or deal page",
  "image_url": null,
  "categorie": "Tech" | "Food" | "Fashion" | "Activities" | "Online",
  "ville": "Online"
}

Return 3 to 8 of the best deals only. JSON array ONLY, no other text.`;

function parseDeals(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const raw = JSON.parse(match[0]);
    if (!Array.isArray(raw)) return [];
    return raw.filter((d) =>
      d && typeof d.titre === 'string' && d.titre.trim() &&
      typeof d.url_source === 'string' && d.url_source.startsWith('http') &&
      d.prix !== null && d.prix !== undefined
    ).map((d) => ({
      titre: String(d.titre).trim().slice(0, 120),
      description: String(d.description || '').trim().slice(0, 900),
      prix: Number(d.prix) >= 0 ? Number(d.prix) : null,
      prix_original: d.prix_original != null ? Number(d.prix_original) : null,
      magasin: String(d.magasin || 'Online').trim().slice(0, 120),
      ville: String(d.ville || 'Online').trim(),
      categorie: ['Tech', 'Food', 'Fashion', 'Activities', 'Online'].includes(d.categorie)
        ? d.categorie : 'Online',
      url_source: String(d.url_source).trim(),
      image_url: null,
      auteur_nom: BOT_NAME,
      statut: 'pending',
      source_reference: 'Claude web_search',
    }));
  } catch {
    return [];
  }
}

async function runAgentLoop(client, query) {
  const { default: Anthropic } = client;
  const tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  const messages = [{ role: 'user', content: DEAL_PROMPT(query) }];

  for (let turn = 0; turn < 8; turn++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find((b) => b.type === 'text')?.text || '';
      return parseDeals(text);
    }

    if (response.stop_reason === 'tool_use') {
      // For built-in web_search: results are already embedded by Anthropic.
      // Any tool_use block without a matching tool_result needs acknowledgment.
      const respondedIds = new Set(
        response.content.filter((b) => b.type === 'tool_result').map((b) => b.tool_use_id)
      );
      const pending = response.content.filter((b) => b.type === 'tool_use' && !respondedIds.has(b.id));
      if (pending.length) {
        messages.push({
          role: 'user',
          content: pending.map((t) => ({ type: 'tool_result', tool_use_id: t.id, content: '' })),
        });
      }
      continue;
    }

    break;
  }
  return [];
}

async function discoverWithClaude() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[ClaudeScout] ANTHROPIC_API_KEY not set — skipping Claude discovery');
    return [];
  }

  let AnthropicModule;
  try {
    AnthropicModule = require('@anthropic-ai/sdk');
  } catch {
    console.warn('[ClaudeScout] @anthropic-ai/sdk not installed — skipping');
    return [];
  }

  const Anthropic = AnthropicModule.default || AnthropicModule;
  const client = new Anthropic({ apiKey });

  const settled = await Promise.allSettled(SEARCH_QUERIES.map((q) => runAgentLoop(client, q)));

  const deals = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`[ClaudeScout] Query ${i + 1}: ${result.value.length} deals`);
      deals.push(...result.value);
    } else {
      console.warn(`[ClaudeScout] Query ${i + 1} failed: ${result.reason?.message || result.reason}`);
    }
  });

  return deals;
}

module.exports = { discoverWithClaude };
