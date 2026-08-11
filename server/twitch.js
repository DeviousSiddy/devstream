require('dotenv').config();

const TWITCH_API = 'https://api.twitch.tv/helix';
const CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';

let cachedUser = null;

function getAccessToken() {
  const raw = process.env.TWITCH_CHANNEL_TOKEN || process.env.TWITCH_OAUTH_TOKEN || '';
  return raw.replace(/^oauth:/, '');
}

function isConfigured() {
  return !!(getAccessToken() && CLIENT_ID);
}

async function helixRequest(endpoint, options = {}) {
  const token = getAccessToken();
  if (!token) {
    const err = new Error('Twitch token not configured (TWITCH_CHANNEL_TOKEN)');
    err.code = 'TWITCH_NOT_CONFIGURED';
    throw err;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${TWITCH_API}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Client-Id': CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    const err = new Error('Twitch token invalid or missing channel:manage:broadcast scope');
    err.code = 'TWITCH_UNAUTHORIZED';
    err.statusCode = 401;
    throw err;
  }

  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Twitch API error ${res.status}: ${body}`);
    err.statusCode = res.status;
    err.code = 'TWITCH_API_ERROR';
    throw err;
  }

  return res.json();
}

async function getBroadcaster() {
  if (cachedUser) return cachedUser;
  const data = await helixRequest('/users');
  if (!data.data || data.data.length === 0) {
    const err = new Error('Twitch user not found for token');
    err.code = 'TWITCH_USER_NOT_FOUND';
    throw err;
  }
  cachedUser = data.data[0];
  return cachedUser;
}

function normalizeCategoryName(name) {
  return name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

async function searchCategories(query, first = 8) {
  const data = await helixRequest(`/search/categories?query=${encodeURIComponent(query)}&first=${first}`);
  return data.data || [];
}

async function resolveCategory(gameName) {
  const results = await searchCategories(gameName);
  if (results.length === 0) {
    const err = new Error(`No Twitch category found for "${gameName}"`);
    err.code = 'TWITCH_CATEGORY_NOT_FOUND';
    throw err;
  }

  const wanted = normalizeCategoryName(gameName);
  const exact = results.find(c => normalizeCategoryName(c.name) === wanted);
  const best = exact || results[0];

  return { id: best.id, name: best.name };
}

async function setChannelCategory(gameId) {
  const broadcaster = await getBroadcaster();
  await helixRequest(`/channels?broadcaster_id=${broadcaster.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ game_id: gameId })
  });
  return { broadcasterId: broadcaster.id, broadcasterName: broadcaster.display_name || broadcaster.login };
}

module.exports = {
  isConfigured,
  getAccessToken,
  getBroadcaster,
  searchCategories,
  resolveCategory,
  setChannelCategory
};
