const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let accessToken = '';
let tokenExpiry = 0;

async function getAccessToken() {
  if (Date.now() < tokenExpiry && accessToken) return accessToken;

  const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    },
  });

  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + res.data.expires_in * 1000;
  return accessToken;
}

function safeTrim(str, max = 445) {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

function createVibeFromTitles(titles) {
  const text = titles.join(' ').toLowerCase();
  const vibes = [];

  if (text.includes('cozy') || text.includes('chill')) vibes.push('cozy vibes ☕');
  if (text.includes('spooky') || text.includes('horror')) vibes.push('spooky chaos 👻');
  if (text.includes('ranked') || text.includes('grind')) vibes.push('competitive grind 💪');
  if (text.includes('anime') || text.includes('gacha')) vibes.push('anime madness 🎴');
  if (text.includes('fun') || text.includes('chaos')) vibes.push('fun chaos 🎉');

  if (vibes.length === 0) vibes.push('great energy ✨');

  return vibes.join(', ');
}

app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const token = await getAccessToken();

    // Fetch user info
    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      params: { login: username },
    });

    if (!userRes.data.data.length) {
      return res.send(`❌ Couldn't find @${username}`);
    }

    const user = userRes.data.data[0];
    const about = user.description ? safeTrim(user.description, 100) : 'an awesome streamer!';

    // Fetch videos
    const videosRes = await axios.get('https://api.twitch.tv

