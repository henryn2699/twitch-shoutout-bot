app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const token = await getAccessToken();

    // Get user info
    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { login: username },
    });
    if (!userRes.data.data.length) return res.send(`❌ Couldn't find @${username}`);

    const user = userRes.data.data[0];
    const about = user.description?.trim() || '';

    // Get recent stream titles
    const vidsRes = await axios.get('https://api.twitch.tv/helix/videos', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { user_id: user.id, type: 'archive', first: 3 },
    });
    const vidTitles = vidsRes.data.data.map(v => v.title).join(' ');

    // Get recent clip titles
    const clipsRes = await axios.get('https://api.twitch.tv/helix/clips', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { broadcaster_id: user.id, first: 3 },
    });
    const clipTitles = clipsRes.data.data.map(c => c.title).join(' ');

    // Combine text for vibe analysis
    const combinedText = [about, vidTitles, clipTitles].join(' ').toLowerCase();

    // Determine vibes
    let vibes = [];
    if (combinedText.match(/cozy|chill|relax/)) vibes.push('cozy vibes ☕');
    if (combinedText.match(/horror|spooky|scary/)) vibes.push('spooky thrills 👻');
    if (combinedText.match(/ranked|competitive|grind|sweat/)) vibes.push('competitive grind 💪');
    if (combinedText.match(/fun|chaos|wild|crazy/)) vibes.push('wild fun 🎉');
    if (combinedText.match(/anime|gacha|manga/)) vibes.push('anime madness 🎴');
    if (vibes.length === 0) vibes.push('awesome energy ✨');

    vibes = vibes.join(', ');

    // Get game they usually stream
    const channelRes = await axios.get('https://api.twitch.tv/helix/channels', {
      headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${token}` },
      params: { broadcaster_id: user.id },
    });
    const game = channelRes.data.data[0]?.game_name || 'awesome content';

    // Craft the shoutout message
    let message = `🎉 Shoutout to @${user.display_name}! They bring ${vibes} and usually stream ${game}. Known for: "${about || 'amazing streams'}". Show some love ➡ https://twitch.tv/${user.login}`;

    // Trim message to 400 chars max
    if (message.length > 400) {
      const trimLen = 400 - (message.length - about.length) - 3;
      const shortAbout = about.slice(0, trimLen) + '...';
      message = `🎉 Shoutout to @${user.display_name}! They bring ${vibes} and usually stream ${game}. Known for: "${shortAbout}". Show some love ➡ https://twitch.tv/${user.login}`;
    }

    res.send(message);
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Error fetching shoutout info.');
  }
});
