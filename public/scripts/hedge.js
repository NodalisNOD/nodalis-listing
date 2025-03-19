import { config } from 'dotenv';
config({ path: '../../.env' }); // Laadt het .env bestand dat twee niveaus boven dit script staat

console.log("🔍 Gecontroleerde API-key:", process.env.OPENAI_API_KEY ? "✅ Gevonden" : "❌ Niet gevonden");
console.log("🔍 Gecontroleerde Bot-token:", process.env.DISCORD_BOT_TOKEN ? "✅ Gevonden" : "❌ Niet gevonden");
console.log("🔍 Gecontroleerde Kanaal-ID:", process.env.DESTINATION_CHANNEL_ID ? "✅ Gevonden" : "❌ Niet gevonden");

import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';

// API-sleutels veilig laden vanuit .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DESTINATION_CHANNEL_ID = process.env.DESTINATION_CHANNEL_ID; // Zet je aggregatiekanaal in .env

// Controleer of de variabelen goed geladen zijn
if (!OPENAI_API_KEY || !DISCORD_BOT_TOKEN || !DESTINATION_CHANNEL_ID) {
  console.error("❌ Fout: Zorg ervoor dat je .env correct hebt ingesteld met OPENAI_API_KEY, DISCORD_BOT_TOKEN en DESTINATION_CHANNEL_ID.");
  process.exit(1);
}

// Maak een nieuwe Discord client aan
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 🚀 Wanneer de bot online komt
client.once('ready', () => {
  console.log(`✅ Bot is ingelogd als ${client.user.tag}`);
});

// 🔍 Luister naar berichten in alle servers
client.on('messageCreate', async (message) => {
  // Negeer berichten van bots
  if (message.author.bot) return;

  // Filter op berichten die "announcement" bevatten
  if (message.content.toLowerCase().includes('announcement')) {
    console.log(`📢 Announcement gevonden: "${message.content}"`);
    
    // AI-classificatie uitvoeren
    const classification = await classifyAnnouncement(message.content);
    
    // Haal het bestemmingskanaal op
    const destinationChannel = await client.channels.fetch(DESTINATION_CHANNEL_ID);
    
    if (!destinationChannel) {
      console.error('❌ Bestemmingskanaal niet gevonden!');
      return;
    }

    // 🎯 Verwerk nieuwswaardige announcements
    if (classification === 'nieuwswaardig') {
      const embed = {
        title: '📰 Nieuwswaardige Announcement!',
        description: message.content,
        color: 0x00FF00, // Groen = echt nieuws
        fields: [
          { name: '📌 Server', value: message.guild.name, inline: true },
          { name: '📢 Kanaal', value: message.channel.name, inline: true },
          { name: '👤 Auteur', value: message.author.toString(), inline: true }
        ]
      };
      destinationChannel.send({ embeds: [embed] });
      console.log(`✅ Nieuwswaardige announcement doorgestuurd!`);
    } else {
      // 🚨 Verstuur het bericht als een mogelijke shill post
      destinationChannel.send(`⚠️ **Mogelijke hype/shill post van** ${message.author}:\n${message.content}`);
      console.log(`⚠️ Hype/shill post doorgestuurd!`);
    }
  }
});

// 🧠 Functie om AI API (OpenAI GPT-4) te gebruiken
async function classifyAnnouncement(text) {
  try {
    console.log(`🧠 AI analyseert: "${text}"`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: "Jij analyseert Discord announcements en classificeert ze als 'nieuwswaardig' of 'hype'. Nieuwswaardig betekent echte updates, features en partnerships. Hype betekent overdreven beloftes zonder concrete feiten." },
          { role: 'user', content: `Hier is een announcement: "${text}". Classificeer dit als 'nieuwswaardig' of 'hype'.` }
        ]
      })
    });

    const data = await response.json();
    const result = data.choices[0].message.content.toLowerCase().trim();
    
    if (result.includes('nieuwswaardig')) return 'nieuwswaardig';
    return 'hype';

  } catch (error) {
    console.error('❌ Fout bij AI-classificatie:', error);
    return 'hype'; // Standaard naar hype als AI faalt
  }
}

// 🔑 Log in met de bot-token vanuit .env
client.login(DISCORD_BOT_TOKEN);

