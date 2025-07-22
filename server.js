const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let accessToken = '';
let tokenExpiry = 0;

// Fetch and cache Twitch app access token
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

app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const token = await getAppToken();

    // Get user info
    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      params: { login: username },
    });

    if (!userRes.data.data.length) {
      return res.send(`❌ Can't find user @${username}.`);
    }

    const user = userRes.data.data[0];

    // Get channel info (description/title + game)
    const channelRes = await axios.get('https://api.twitch.tv/helix/channels', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      params: { broadcaster_id: user.id },
    });

    const channel = channelRes.data.data[0];

    const message = `🎮 Shoutout to @${user.display_name}! They're streaming "${channel.title}" playing **${channel.game_name}**. Check them out: https://twitch.tv/${user.login}`;

    res.send(message);
  } catch (error) {
    console.error(error);
    res.status(500).send('⚠️ Error fetching shoutout info. Please try again later.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));

