const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const express = require('express');
require('dotenv').config();

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

// لستة الردود اللي تليق بمقامك وتفخر بسيرفر "دايڤل" الملكي 😂
const responses = [
    "نعم يا مولاي، تأمر بشيء يطال عمرك في سيرفر دايڤل؟ 🙇‍♂️",
    "تسمع صوتي يا مولاي؟ أنا حارس الفويس الشخصي في دايڤل تحت أمرك! 🫡",
    "سمعاً وطاعة يا مولاي... تكفى لا تطردني من سيرفر دايڤل أترزق الله هنا! 😭",
    "أمرك يا مولاي! جالس أراقب الهوا بالفويس عشان ما يهرب لغرفة ثانية بدايڤل. 💨",
    "تدلل يا مولاي، تبي أجيب لك فطور ملكي ولا قهوة على حساب سيرفر دايڤل؟ ☕",
    "يا مولاي أنا قاعد أطالع الجدران بالفويس صامت وحزين بدونك... 🖤",
    "أنا رهن إشارتك يا مولاي، عيش وبايتس وتحت أمرك لسيرفر دايڤل للابد! ⚡",
    "أبشر يا مولاي، فويس دايڤل آمن ومحد يقدر يدخله طول ما أنا جالس فيه! 🦅",
    "تحت أمرك يا تاج راسي يا مولاي... بس بالله عليك لا تقطع عني الروم، أموت جوع! 😭💸",
    "أمرك يا مولاي! أنا وزاوية فويس دايڤل أصحاب وعلاقتنا سمن على عسل. 🛋️",
    "سمعاً وطاعة يا مولاي، مستعد أفرش لك سيرفر دايڤل ورد بس لا تعصب علي! 🌹",
    "يا عيون العبد وقلب العبد في دايڤل، تامر بشي ولا أرجع أطالع الجدران بصمت؟ 👀"
];

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();

    if (content.includes('يا عبد') || content === 'عبد' || content.includes('العبد')) {
        const randomReply = responses[Math.floor(Math.random() * responses.length)];
        message.reply(randomReply);
    }
    
    if (content === '!status') {
        message.reply("أنا عبدك المطيع يا مولاي، جالس في فويس دايڤل ومربوط للأبد! ⛓️");
    }

    if (content.includes('جوعان') || content.includes('اكل')) {
        message.reply("أمرك يا مولاي، بس ترا أكلنا الوحيد هو هواء سيرفر دايڤل الطاهر! 🍛");
    }

    if (content.includes('شكرا') || content.includes('مشكور')) {
        message.reply("العفو يا مولاي! رضاك هو بونص الشهر حقنا في سيرفر دايڤل. ⚡");
    }

    if (content.includes('وينك')) {
        message.reply("قاعد أطالع ركن الفويس بـ دايڤل بصمت ودموعي على خدودي... انتظر طال عمرك تطل عليّ بس! 💧");
    }

    if (content.includes('قوم') || content.includes('تحرك')) {
        message.reply("ما أقدر يا مولاي! أنا مسمّر بروم دايڤل بقرارات جمهورية منك ومن ديسكورد، ما أتحرك إلا بأمر سامي! ⛓️");
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

            console.log(`✅ البوت دخل روم الصوت بنجاح في دايڤل: ${channel.name}`);
        }).catch(err => {
            setTimeout(connectToVoice, 5_000);
        });

    } catch (error) {
        setTimeout(connectToVoice, 10_000);
    }
}

process.on('unhandledRejection', error => {});

client.login(process.env.DISCORD_TOKEN);
