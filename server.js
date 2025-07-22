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

function analyzeTone(about, titles, clips) {
  const text = (about + ' ' + titles.join(' ') + ' ' + clips.join(' ')).toLowerCase();
  if (text.match(/funny|laugh|joke|meme|fail/)) return 'lighthearted and fun';
  if (text.match(/competitive|rank|clutch|win/)) return 'intense and skillful';
  if (text.match(/chill|relax|cozy|calm/)) return 'relaxing and welcoming';
  if (text.match(/story|creative|art|music/)) return 'creative and engaging';
  return 'unique and entertaining';
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function composeTailoredShoutout(displayName, game, about, streamTitles, clipTitles) {
  const tone = analyzeTone(about, streamTitles, clipTitles);
  const aboutSnippet = about ? about.split('. ')[0] : '';
  
  const intros = [
    `🌟 Dive into @${displayName}'s ${tone} streams, mainly playing ${game}.`,
    `🌟 Catch @${displayName} for some ${tone} vibes focused on ${game}.`,
    `🌟 Join @${displayName} where ${tone} gameplay and community come together with ${game}.`
  ];
  
  const aboutPhrases = aboutSnippet ? [
    `"${aboutSnippet}" is how they describe their stream.`,
    `They like to say: "${aboutSnippet}".`,
    `Here’s a little about them: "${aboutSnippet}".`
  ] : [];

  const clipHighlights = clipTitles.length
    ? `Their clips capture moments that truly show why their community loves them.`
    : '';

  const closing = [
    `Catch their streams live at https://twitch.tv/${displayName.toLowerCase()}`,
    `Check them out here: https://twitch.tv/${displayName.toLowerCase()}`,
    `Don’t miss out! https://twitch.tv/${displayName.toLowerCase()}`
  ];

  const parts = [
    randomChoice(intros),
    randomChoice(aboutPhrases),
    clipHighlights,
    randomChoice(closing)
  ].filter(Boolean);

  return parts.join(' ');
}

app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const token = await getAccessToken();

    // Fetch user info
    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { login: username },
    });

    if (!userRes.data.data.length) return res.send(`❌ Couldn't find @${username}`);

    const user = userRes.data.data[0];
    const displayName = user.display_name;
    const about = user.description?.trim() || '';

    // Fetch last 3 streams (videos)
    const vidsRes = await axios.get('https://api.twitch.tv/helix/videos', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { user_id: user.id, type: 'archive', first: 3 },
    });
    const vidTitles = vidsRes.data.data.map(v => v.title);

    // Fetch last 3 clips
    const clipsRes = await axios.get('https://api.twitch.tv/helix/clips', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { broadcaster_id: user.id, first: 3 },
    });
    const clipTitles = clipsRes.data.data.map(c => c.title);

    // Fetch current game
    const channelRes = await axios.get('https://api.twitch.tv/helix/channels', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { broadcaster_id: user.id },
    });
    const game = channelRes.data.data[0]?.game_name || 'various games';

    // Compose shoutout message
    const message = composeTailoredShoutout(displayName, game, about, vidTitles, clipTitles);

    res.send(message);
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Error fetching shoutout info.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));
