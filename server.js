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
      grant_type: 'client_credentials'
    }
  });

  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + res.data.expires_in * 1000;
  return accessToken;
}

app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const token = await getAppToken();

    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { login: username }
    });

    if (!userRes.data.data.length) {
      return res.send(`Could not find Twitch user @${username}.`);
    }

    const user = userRes.data.data[0];

    const streamRes = await axios.get('https://api.twitch.tv/helix/streams', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { user_id: user.id }
    });

    const stream = streamRes.data.data[0];

    const message = stream
      ? `💫 Say hello to @${user.display_name}! They're LIVE playing **${stream.game_name}**: "${stream.title}". Show them some 💖 ➤ https://twitch.tv/${user.login}`
      : `✨ Check out @${user.display_name} — last seen playing something fun! ➤ https://twitch.tv/${user.login}`;

    res.send(message);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to fetch shoutout info.');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Bot running on port ${port}`));
