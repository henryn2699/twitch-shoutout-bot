const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let accessToken = '';
let tokenExpiry = 0;

const channelEmotes = {
  'cozygamer': 'Kappa Keepo PogChamp',
  'shroud': 'PogChamp Kappa CoolCat',
  'pokimane': 'PogU Kappa BlessRNG',
  'wildcard': 'LUL PogChamp PepeHands',
};

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

function safeTrim(str, max = 400) {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const token = await getAccessToken();

    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { login: username },
    });

    if (!userRes.data.data.length) return res.send(`❌ Couldn't find @${username}`);

    const user = userRes.data.data[0];
    const displayName = user.display_name;
    const loginName = user.login;
    const about = user.description?.trim() || '';

    const channelRes = await axios.get('https://api.twitch.tv/helix/channels', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { broadcaster_id: user.id },
    });

    const game = channelRes.data.data[0]?.game_name || 'awesome content';

    // Simple vibes based on keywords in about
    const aboutLower = about.toLowerCase();
    let vibes = [];
    if (aboutLower.match(/cozy|chill|relax/)) vibes.push('cozy vibes ☕');
    if (aboutLower.match(/horror|spooky|scary/)) vibes.push('spooky thrills 👻');
    if (aboutLower.match(/ranked|competitive|grind/)) vibes.push('competitive grind 💪');
    if (aboutLower.match(/fun|chaos|wild/)) vibes.push('wild fun 🎉');
    if (aboutLower.match(/anime|gacha|manga/)) vibes.push('anime madness 🎴');
    if (vibes.length === 0) vibes.push('awesome energy ✨');
    vibes = vibes.join(', ');

    let emotes = channelEmotes[username] ? ` ${channelEmotes[username]}` : '';

    let message = `🎉 Shoutout to @${displayName}! They bring ${vibes} and usually stream ${game}. Known for: "${about || 'amazing streams'}". Show some love ➡ https://twitch.tv/${loginName}${emotes}`;

    message = safeTrim(message, 400);

    res.send(message);
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Error fetching shoutout info.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));
