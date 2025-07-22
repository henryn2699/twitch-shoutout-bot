app.get('/shoutout/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const token = await getAccessToken();

    // Get user info (includes "About Me")
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
    const displayName = user.display_name;
    const loginName = user.login;
    const aboutMe = user.description?.trim() || '';
    const shortAbout = aboutMe ? `Known for: "${aboutMe}".` : '';

    // Get channel info for current game
    const channelRes = await axios.get('https://api.twitch.tv/helix/channels', {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      params: { broadcaster_id: user.id },
    });

    const game = channelRes.data.data[0]?.game_name || 'awesome content';

    // Fun template
    let message = `🎉 Meet @${displayName}! They stream ${game} and always bring the vibes. ${shortAbout} Show some love ➡ https://twitch.tv/${loginName}`;

    // Nightbot character limit
    if (message.length > 400) {
      const availableLength = 400 - (`🎉 Meet @${displayName}! They stream ${game} and always bring the vibes. Show some love ➡ https://twitch.tv/${loginName}`.length + 2);
      const trimmedAbout = aboutMe.slice(0, availableLength) + '...”';
      message = `🎉 Meet @${displayName}! They stream ${game} and always bring the vibes. Known for: "${trimmedAbout}". Show some love ➡ https://twitch.tv/${loginName}`;
    }

    res.send(message);
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Error fetching user info.');
  }
});

