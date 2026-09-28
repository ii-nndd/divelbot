const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const express = require('express');
require('dotenv').config();

// سيرفر ويب عشان ريندر
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Voice Keeper Bot is running 24/7!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server is running on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const TARGET_GUILD_ID = '1545100203751645224';
const TARGET_VOICE_CHANNEL_ID = '1545729488938205274';

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    connectToVoice();
});

// قائمة الردود المضحكة للعبد
const responses = [
    "نعم يا مولاي، تأمر بشيء؟ 🙇‍♂️",
    "تحت أمرك يا طويل العمر، العبد صامل في الفويس! 🫡",
    "سم طال عمرك، جالس أراقب الروم وماسخّرني إلا رضاك ⚡",
    "أمرك يا معزب، تبي أجيب قهوة ولا أقرأ عليك؟ ☕",
    "موجود يا غالي، لا تشيل هم الفويس أنا حارسه بروحدي 🦅"
];

// استقبال الرسائل والرد عليها
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();

    // إذا أحد ناداه بـ "يا عبد" أو "عبد"
    if (content.includes('يا عبد') || content === 'عبد') {
        const randomReply = responses[Math.floor(Math.random() * responses.length)];
        message.reply(randomReply);
    }
    
    // أمر إضافي لو بغيت تختبره
    if (content === '!status') {
        message.channel.log = message.reply("أنا العبد المطيع، جالس في الفويس ومربوط للأبد! ⛓️");
    }
});

function connectToVoice() {
    try {
        const guild = client.guilds.cache.get(TARGET_GUILD_ID) || client.guilds.fetch(TARGET_GUILD_ID);
        if (!guild) {
            setTimeout(connectToVoice, 5_000);
            return;
        }

        client.channels.fetch(TARGET_VOICE_CHANNEL_ID).then(channel => {
            if (!channel || !channel.isVoiceBased()) return;

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: true
            });

            connection.on('error', (error) => {
                console.log("⚠️ خطأ في الاتصال الصوتي، جاري إعادة المحاولة...", error.message);
                try { connection.destroy(); } catch (e) {}
                setTimeout(connectToVoice, 5_000);
            });

            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    try { connection.destroy(); } catch (e) {}
                    setTimeout(connectToVoice, 5_000);
                }
            });

            console.log(`✅ البوت دخل روم الصوت بنجاح: ${channel.name}`);
        }).catch(err => {
            setTimeout(connectType => connectToVoice(), 5_000);
        });

    } catch (error) {
        setTimeout(connectToVoice, 10_000);
    }
}

process.on('unhandledRejection', error => {});

client.login(process.env.DISCORD_TOKEN);
