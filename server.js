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

function findKeywords(text) {
  const keywords = [];
  if (/speedrun/.test(text)) keywords.push('speedrunner');
  if (/variety/.test(text)) keywords.push('variety streamer');
  if (/community/.test(text)) keywords.push('community-focused');
  if (/casual/.test(text)) keywords.push('casual gamer');
  if (/competitive/.test(text)) keywords.push('competitive player');
  return keywords;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function composeTailoredShoutout(displayName, game, about, streamTitles, clipTitles) {
  const aboutLower = about.toLowerCase();
  const tone = analyzeTone(about, streamTitles, clipTitles);
  const keywords = findKeywords(aboutLower);

  const aboutSnippet = about ? about.split('. ')[0] : '';

  // Intros
  const intros = [
    `🌟 Step into @${displayName}'s world—a ${tone} streamer shining in ${game}.`,
    `🌟 @${displayName} is your go-to for ${tone} gameplay, streaming ${game} and beyond.`,
    `🌟 If you love ${game} with a ${tone} touch, @${displayName} has got you covered.`
  ];

  // Personality lines from keywords
  const personalityLines = [];
  if (keywords.includes('speedrunner')) {
    personalityLines.push(`Known for lightning-fast runs and impressive precision.`);
  }
  if (keywords.includes('variety streamer')) {
    personalityLines.push(`You never know what game they’ll dive into next — always a surprise!`);
  }
  if (keywords.includes('community-focused')) {
    personalityLines.push(`Building an awesome community where everyone’s welcome.`);
  }
  if (keywords.includes('casual gamer')) {
    personalityLines.push(`Keeping things laid-back and fun, perfect for casual viewers.`);
  }
  if (keywords.includes('competitive player')) {
    personalityLines.push(`Bringing serious competition and top-tier plays.`);
  }

  // About snippet variations
  const aboutPhrases = aboutSnippet ? [
    `They describe their channel as: "${aboutSnippet}"`,
    `"${aboutSnippet}" — that’s how @${displayName} rolls.`,
    `Here’s what they say about their stream: "${aboutSnippet}"`
  ] : [];

  // Stream invites instead of clips
  let streamInvite = '';
  if (clipTitles.length) {
    streamInvite = randomChoice([
      `Check out their stream for a blend of epic gameplay and great community vibes.`,
      `Their streams are packed with moments that keep the chat buzzing.`,
      `Dive into their stream to catch everything from clutch plays to hilarious fun.`,
      `Join their stream for exciting games and an awesome community experience.`,
      `Their streams bring a perfect mix of skill and entertainment — check it out!`
    ]);
  } else {
    streamInvite = `Catch their stream for engaging content and good times.`;
  }

  // Closing phrases
  const closings = [
    `Don’t miss out — catch @${displayName} live at https://twitch.tv/${displayName.toLowerCase()}`,
    `Hop into the chat and join the fun: https://twitch.tv/${displayName.toLowerCase()}`,
    `Ready for great times? Tune in live: https://twitch.tv/${displayName.toLowerCase()}`
  ];

  // Compose final message parts
  const parts = [
    randomChoice(intros),
    randomChoice(aboutPhrases),
    personalityLines.length ? personalityLines.join(' ') : '',
    streamInvite,
    randomChoice(closings)
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

    // Fetch last 3 videos
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

    // Compose message
    const message = composeTailoredShoutout(displayName, game, about, vidTitles, clipTitles);

    res.send(message);
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Error fetching shoutout info.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));
