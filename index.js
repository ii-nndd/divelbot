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

// 👑 آي دي الرتبة الملكية لسيرفر دايڤل
const ROYAL_ROLE_ID = '1554207336967446608'; 

let activeConnection = null;

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    connectToVoice();
});

// لستة الردود الملكية والطاعة العمياء للمولاي فقط
const royalResponses = [
    "نعم يا مولاي، تأمر بشيء يطال عمرك في سيرفر دايڤل؟ 🙇‍♂️",
    "تسمع صوتي يا مولاي؟ أنا حارس الفويس الشخصي في دايڤل تحت أمرك! 🫡",
    "سمعاً وطاعة يا مولاي... تكفى لا تطردني من سيرفر دايڤل أترزق الله هنا! 😭",
    "أمرك يا مولاي! جالس أراقب الهوا بالفويس عشان ما يهرب لغرفة ثانية بدايڤل. 💨",
    "تدلل يا مولاي، تبي أجيب لك فطور ملكي ولا قهوة على حساب سيرفر دايڤل؟ ☕",
    "يا مولاي أنا قاعد أطالع الجدران بالفويس صامت وحزين بدونك... 🖤",
    "أنا رهن إشارتك يا مولاي، عيش وبايتس وتحت أمرك لسيرفر دايڤل للابد! ⚡",
    "أبشر يا مولاي، فويس دايڤل آمن ومحد يقدر يدخله طول ما أنا جالس فيه! 🦅"
];

// لستة إهانات وبكاء العشوائيين مع جيفات صياح حقيقية 😭💅
const peasantInsults = [
    { text: "أنا مش عبدك! انقلع يا مسكين، أنا ما أخدم إلا صاحب الرتبة الملكية في دايڤل! 💅😂", gif: "https://media.giphy.com/media/3o7TKSjRrfIPjeiOkM/giphy.gif" },
    { text: "خير؟ وش تبي يا بابا؟ دور لك عبد غيري، أنا مخصص لمولاي وبس! 👑", gif: "https://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif" },
    { text: "أنا مو عبدك! لا تحاول تحتك فيني وتكاسرني، مالي خلق تصريفات ترا! 💀", gif: "https://media.giphy.com/media/9uI8V5AG5S0eaN47ms/giphy.gif" },
    { text: "اقصص لساني لو رديت عليك! أنا عبد مولاي وبس، رح العب بعيد يا شاطر. 🤫", gif: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif" },
    { text: "بدري عليك! العبد هذا غالي وما يخدم إلا أهل الرتب الكبار في دايڤل... طس يبكي! 🦅", gif: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif" }
];

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const member = message.member;

    // 🔒 التحقق هل العضو يمتلك الرتبة الملكية أو لا
    const hasRoyalRole = member && member.roles.cache.has(ROYAL_ROLE_ID);

    // التحقق إذا الشخص نادى البوت أو طلب منه شي
    const isInteracting = content.includes('يا عبد') || content === 'عبد' || content.includes('العبد') || 
                          content === '!تعال' || content === 'تعال' || content === 'ادخل' || content === 'تفضل' ||
                          content === '!اخرج' || content === 'اخرج' || content === '!اطلع' || content === 'اطلع' ||
                          content === '!يبكي' || content === 'يبكي' || content === 'بكاء';

    if (isInteracting) {
        // لو مو من أهل الرتبة -> عطِه إهانة مع جيف بكاء مؤلم 😭💀
        if (!hasRoyalRole) {
            const randomInsult = peasantInsults[Math.floor(Math.random() * peasantInsults.length)];
            message.reply(`${randomInsult.text}\n${randomInsult.gif}`);
            return;
        }

        // --- لو طلع من أهل الرتبة الملكية (ينفذ الأوامر فوراً) ---
        if (content === '!تعال' || content === 'تعال' || content === 'ادخل' || content === 'تفضل') {
            message.reply("أمرك يا مولاي! راجع الفويس جري برجليني الثنتين حالاً! 🏃‍♂️💨");
            connectToVoice();
            return;
        }

        if (content === '!اخرج' || content === 'اخرج' || content === '!اطلع' || content === 'اطلع') {
            if (activeConnection) {
                try {
                    activeConnection.destroy();
                    activeConnection = null;
                    message.reply("سمعاً وطاعة يا مولاي... طلعت من الفويس ودموعي على خدودي، لا تطول غيبتك! 😭💧\nhttps://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif");
                } catch (e) {
                    message.reply("يا مولاي حاولت أطلع بس علقت بالباب! 💀");
                }
            } else {
                message.reply("يا مولاي أنا أصلاً برا الفويس قاعد بالشارع! 😂");
            }
            return;
        }

        // 😭 أمر البكاء والدراما للمولاي مع جيف صياح رسمي
        if (content === '!يبكي' || content === 'يبكي' || content === 'بكاء') {
            message.reply("أبشر يا مولاي، قاعد أصيح بالزاوية لأنك جالس تختبر ولائي... 😭💧 شوف دمعتي كيف طاحت:\nhttps://media.giphy.com/media/3o7TKSjRrfIPjeiOkM/giphy.gif");
            return;
        }

        if (content.includes('يا عبد') || content === 'عبد' || content.includes('العبد')) {
            const randomReply = royalResponses[Math.floor(Math.random() * royalResponses.length)];
            message.reply(randomReply);
            return;
        }
    }

    // الأوامر الجانبية الخاصة بالمولاي فقط
    if (hasRoyalRole) {
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

            if (activeConnection) {
                try { activeConnection.destroy(); } catch (e) {}
            }

            activeConnection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: true
            });

            activeConnection.on('error', (error) => {
                console.log("⚠️ خطأ في الاتصال الصوتي، جاري إعادة المحاولة...", error.message);
                try { activeConnection.destroy(); } catch (e) {}
                setTimeout(connectToVoice, 5_000);
            });

            activeConnection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(activeConnection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(activeConnection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    try { activeConnection.destroy(); } catch (e) {}
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
