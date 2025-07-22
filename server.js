const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let accessToken = '';
let tokenExpiry = 0;

async function getAppToken() {
  if (Date.now() < tokenExpiry) return accessToken;

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

function createVibeFromTitles(titles) {
  const combined = titles.map(t => t.toLowerCase()).join(' ');
  const keywords = [];

  if (combined.includes('horror') || combined.includes('spooky')) keywords.push('spooky vibes 👻');
  if (combined.includes('cozy') || combined.includes('chill') || combined.includes('relax')) keywords.push('cozy streams ☕');
  if (combined.includes('ranked') || combined.includes('grind') || combined.includes('sweat')) keywords.push('competitive grind 💪');
  if (combined.includes('anime') || combined.includes('gacha')) keywords.push('anime and gacha rolls 🎴');
  if (combined.includes('chaos') || combined.includes('fun') || combined.includes('wild')) keywords.push('chaotic fun 🎉');

  if (keywords.length === 0) keywords.push('great vibes ✨');

  return keywords.join(', ');
}

function safeTrim(str, limit) {
  return str.length > limit ? str.slice(0, limit - 3) + '...' : str;
}

app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const token = await getAppToken();

    // Fetch user info
    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      params: { login: username },
    });

    if (!userRes.data.data.length) {
      return res.send(`❌ Could not find @${username}`);
    }

    const user = userRes.data.data[0];
    let about = user.description || 'an awesome streamer!';
    about = safeTrim(about, 100);

    // Fetch last 3 videos
    const vidsRes = await axios.get('https://api.twitch.tv/helix/videos', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      params: { user_id: user.id, type: 'archive', first: 3 },
    });

    const titles = vidsRes.data.data.map(v => v.title);
    const vibe = createVibeFromTitles(titles);

    // Fetch current game
    const chanRes = await axios.get('https://api.twitch.tv/helix/channels', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      params: { broadcaster_id: user.id },
    });

    const game = chanRes.data.data[0]?.game_name || 'something fun';

    // Compose fun shoutout
    let msg = `🌟 Check out @${user.display_name}! They bring ${vibe} and stream games like ${game}. About them: "${about}". Show them love ➡ https://twitch.tv/${user.login}`;

    msg = safeTrim(msg, 445);

    res.send(msg);
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Error fetching shoutout info.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Bot live on port ${PORT}`));

  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));

