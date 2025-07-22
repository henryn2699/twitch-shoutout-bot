const express = require('express');
const axios = require('axios');

const app = express();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let accessToken = '';
let tokenExpiry = 0;

const synonyms = {
  cozy: ['warm', 'relaxing', 'chill', 'comforting'],
  competitive: ['intense', 'hardcore', 'dedicated', 'focused'],
  spooky: ['thrilling', 'eerie', 'haunting', 'chilling'],
  fun: ['energetic', 'wild', 'lively', 'exciting'],
  anime: ['manga-inspired', 'Japanese-culture-loving', 'vibrant', 'colorful'],
};

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

function extractThemes(text) {
  const themes = new Set();
  const lower = text.toLowerCase();
  if (lower.match(/cozy|chill|relax|calm/)) themes.add('cozy');
  if (lower.match(/competit|ranked|grind|sweat/)) themes.add('competitive');
  if (lower.match(/horror|spooky|scary|thrill/)) themes.add('spooky');
  if (lower.match(/fun|wild|chaos|crazy/)) themes.add('fun');
  if (lower.match(/anime|gacha|manga/)) themes.add('anime');
  if (themes.size === 0) themes.add('fun'); // fallback
  return Array.from(themes);
}

function generateClipSentences(clipTitles) {
  if (!clipTitles.length) return '';

  const sentences = [];

  clipTitles.forEach(title => {
    const lower = title.toLowerCase();

    if (lower.includes('fail') || lower.includes('funny')) {
      sentences.push(`Expect laughs from moments like "${title}"`);
    } else if (lower.includes('epic') || lower.includes('clutch') || lower.includes('insane')) {
      sentences.push(`Don't miss their clutch plays such as "${title}"`);
    } else if (lower.includes('surprise') || lower.includes('unexpected')) {
      sentences.push(`They always keep viewers on their toes, like in "${title}"`);
    } else if (lower.includes('scary') || lower.includes('jump scare') || lower.includes('thrilling')) {
      sentences.push(`Get ready for thrills with clips like "${title}"`);
    } else {
      sentences.push(`One memorable moment is "${title}"`);
    }
  });

  return sentences.slice(0, 3).join('. ') + '.';
}

function composeDescription(displayName, game, about, streamTitles, clipTitles) {
  const combinedText = [about, ...streamTitles, ...clipTitles].join(' ');
  const themes = extractThemes(combinedText);
  const themePhrases = themes.map(t => randomFrom(synonyms[t] || [t]));

  const introOptions = [
    `🌟 Dive into the ${themePhrases.join(' and ')} streams of @${displayName}!`,
    `🌟 Join @${displayName} for some truly ${themePhrases.join(' & ')} gameplay!`,
    `🌟 Experience ${themePhrases.join(', ')} vibes with @${displayName}!`,
  ];

  const gameSentenceOptions = [
    `They mostly play ${game}, bringing excitement every session.`,
    `You’ll catch them immersed in ${game}, delivering top-notch content.`,
    `Their favorite playground is ${game}, where every moment counts.`,
  ];

  const aboutSentenceOptions = [
    about ? `"${about}"` : 'They are known for engaging and entertaining streams.',
  ];

  const clipSentence = generateClipSentences(clipTitles);

  const clipSentenceOptions = [
    clipSentence || 'Their clips capture unforgettable moments and highlights.',
  ];

  return [
    randomFrom(introOptions),
    randomFrom(gameSentenceOptions),
    randomFrom(aboutSentenceOptions),
    randomFrom(clipSentenceOptions),
    `Check them out here: https://twitch.tv/${displayName.toLowerCase()}`
  ].join(' ');
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
    const loginName = user.login;
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

    // Compose message
    const message = composeDescription(displayName, game, about, vidTitles, clipTitles);

    res.send(message);
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Error fetching shoutout info.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));
