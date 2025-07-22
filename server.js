const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let accessToken = '';
let tokenExpiry = 0;

// Get OAuth token (cached until expiry)
async function getAppToken() {
  if (Date.now() < tokenExpiry) return accessToken;

  const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials'
    }
  });

  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + res.data.expires_in * 1000;
  return accessToken;
}

app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const token = await getAppToken();

    // Step 1: Get user info
    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`
      },
      params: { login: username }
    });

    if (!userRes.data.data.length) {
      return res.send(`❌ Could not find Twitch user @${username}.`);
    }

    const user = userRes.data.data[0];

    // Step 2: Check if user is live
    const streamRes = await axios.get('https://api.twitch.tv/helix/streams', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`
      },
      params: { user_id: user.id }
    });

    const stream = streamRes.data.data[0];

    let message = '';

    if (stream) {
      // User is live - use stream info
      message = `🎉 Shoutout to @${user.display_name} who is LIVE now playing **${stream.game_name}**! Stream title: "${stream.title}" — Check them out: https://twitch.tv/${user.login}`;
    } else {
      // User offline - get channel info for last title + game
      const channelRes = await axios.get('https://api.twitch.tv/helix/channels', {
        headers: {
          'Client-ID': CLIENT_ID,
          Authorization: `Bearer ${token}`
        },
        params: { broadcaster_id: user.id }
      });

      const channel = channelRes.data.data[0];

      message = `✨ Check out @${user.display_name}! Last stream was titled "${channel.title}" playing **${channel.game_name}**. Swing by: https://twitch.tv/${user.login}`;
    }

    res.send(message);
  } catch (error) {
    console.error(error);
    res.status(500).send('⚠️ Failed to fetch shoutout info. Please try again later.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));

