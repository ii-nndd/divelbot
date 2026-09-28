// ==========================================
// 👑 منطقة الإعدادات الملكية (عدل هنا على كيفك)
// ==========================================
const CONFIG = {
    GUILD_ID: '1545100203751645224',          // آي دي سيرفر دايڤل
    VOICE_CHANNEL_ID: '1545729488938205274',   // آي دي روم الفويس
    ARTHUR_ID: '848996426918002731',          // الآي دي الشخصي لك يا مولاي ارثر
    ROYAL_ROLE_ID: '1554207336967446608'      // آي دي الرتبة الملكية
};
// ==========================================
// ⚠️ لا تلمس أي شي تحت هذا السطر إلا إذا بغيت تزود ردود!
// ==========================================

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

let activeConnection = null;

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    connectToVoice();
});

// ==================== 👑 لستة ردود "ارثر" الخاصة ====================
const arthurGreetings = [
    "أمرك مطاع يا مولاي ارثر، عساك بس راضٍ عن أداء العبد في سيرفر دايڤل؟ 🙇‍♂️✨",
    "تسمع صوت عبدك المطيع يا ارثر؟ أنا تحت أمرك وجاهز أفرش لك سيرفر دايڤل ورد! 🌹",
    "يا مرحباً بتاج راس العبد! تكفى يا ارثر لا تقطع عني الروم ترا أموت من الشوق والبرد. 😭🖤",
    "أمرك يا مولاي ارثر! عيوني وقلبي فداك، جالس أراقب الفويس وأمنع أي طير يطير فيه. 🦅",
    "تدلل يا ارثر، تبي أجيب لك قهوة ملكية ولا أسوي لك زفة في روم دايڤل؟ ☕👑",
    "أنا رهن إشارتك يا مولاي ارثر، خطك أحمر والكل يفداك يا كبير! ⚡",
    "يا لبي قلبك يا ارثر، أمر بشيء يطال عمرك ولا أرجع أطالع الجدران بصمت ودموع؟ 💧"
];

// ==================== 🛡️ لستة ردود أصحاب الرتبة ====================
const royalResponses = [
    "نعم يا طويل العمر، تأمر بشيء يطال عمرك في سيرفر دايڤل؟ 🙇‍♂️",
    "تسمع صوتي؟ أنا حارس الفويس الشخصي في دايڤل تحت أمركم! 🫡",
    "سمعاً وطاعة... تكفى لا تطردني من سيرفر دايڤل أترزق الله هنا! 😭",
    "أمركم! جالس أراقب الهوا بالفويس عشان ما يهرب لغرفة ثانية بدايڤل. 💨",
    "تدللون، تبي أجيب لكم فطور ملكي ولا قهوة على حساب سيرفر دايڤل؟ ☕"
];

// ==================== 💀 لستة إهانات وبكاء العشوائيين ====================
const peasantInsults = [
    { text: "أنا مش عبدك! انقلع يا مسكين، أنا ما أخدم إلا مولاي ارثر وصاحب الرتبة الملكية في دايڤل! 💅😂", gif: "https://media.giphy.com/media/3o7TKSjRrfIPjeiOkM/giphy.gif" },
    { text: "خير؟ وش تبي يا بابا؟ دور لك عبد غيري، أنا مخصص لمولاي ارثر وبس! اقلب وجهك! 👑", gif: "https://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif" },
    { text: "أنا مو عبدك! لا تحاول تحتك فيني وتكاسرني، مالي خلق أشكال بيئية مثلك! 💀", gif: "https://media.giphy.com/media/9uI8V5AG5S0eaN47ms/giphy.gif" },
    { text: "اقصص لساني لو رديت عليك! أنا عبد مولاي ارثر وبس، رح العب بعيد يا شاطر. 🤫", gif: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif" },
    { text: "بدري عليك! العبد هذا غالي وما يخدم إلا ارثر وأهل الرتب الكبار في دايڤل... طس يبكي بالزاوية! 🦅", gif: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif" }
];

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const member = message.member;
    const userId = message.author.id;

    // التحقق من الصلاحيات باستخدام الـ CONFIG في الأعلى
    const isArthur = (userId === CONFIG.ARTHUR_ID);
    const hasRoyalRole = member && member.roles.cache.has(CONFIG.ROYAL_ROLE_ID);
    const hasAccess = isArthur || hasRoyalRole;

    const isInteracting = content.includes('يا عبد') || content === 'عبد' || content.includes('العبد') || 
                          content === '!تعال' || content === 'تعال' || content === 'ادخل' || content === 'تفضل' ||
                          content === '!اخرج' || content === 'اخرج' || content === '!اطلع' || content === 'اطلع' ||
                          content === '!يبكي' || content === 'يبكي' || content === 'بكاء' ||
                          content === '!status' || content.includes('جوعان') || content.includes('اكل') || 
                          content.includes('شكرا') || content.includes('مشكور') || content.includes('وينك') || 
                          content.includes('قوم') || content.includes('تحرك');

    if (isInteracting) {
        if (!hasAccess) {
            const randomInsult = peasantInsults[Math.floor(Math.random() * peasantInsults.length)];
            message.reply(`${randomInsult.text}\n${randomInsult.gif}`);
            return;
        }

        if (content === '!تعال' || content === 'تعال' || content === 'ادخل' || content === 'تفضل') {
            const replyMsg = isArthur 
                ? "أمرك وسيدك يا مولاي ارثر! راجع الفويس جري برجليني الثنتين وبأسرع سرعة للخدمة! 🏃‍♂️💨" 
                : "أمرك يا طويل العمر! راجع الفويس حالاً! 🏃‍♂️💨";
            message.reply(replyMsg);
            connectToVoice();
            return;
        }

        if (content === '!اخرج' || content === 'اخرج' || content === '!اطلع' || content === 'اطلع') {
            if (activeConnection) {
                try {
                    activeConnection.destroy();
                    activeConnection = null;
                    const replyMsg = isArthur 
                        ? "سمعاً وطاعة يا مولاي ارثر... طلعت من الفويس ودموعي أربع أربع، لا تطول غيبتك عنا! 😭💧\nhttps://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif"
                        : "سمعاً وطاعة... طلعت من الفويس ودموعي على خدودي! 😭💧\nhttps://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif";
                    message.reply(replyMsg);
                } catch (e) {
                    message.reply("يا مولاي حاولت أطلع بس علقت بالباب! 💀");
                }
            } else {
                message.reply("يا طويل العمر أنا أصلاً برا الفويس قاعد بالشارع متجمد من الصقيع! 😂");
            }
            return;
        }

        if (content === '!يبكي' || content === 'يبكي' || content === 'بكاء') {
            const replyMsg = isArthur 
                ? "أبشر يا مولاي ارثر، قاعد أصيح بالزاوية لأنك جالس تختبر ولائي العظيم... 😭💧 شوف دمعتي كيف حرقت قلبي:\nhttps://media.giphy.com/media/3o7TKSjRrfIPjeiOkM/giphy.gif"
                : "أبشر، قاعد أصيح بالزاوية حزناً وشوقاً... 😭💧 شوف الدموع:\nhttps://media.giphy.com/media/3o7TKSjRrfIPjeiOkM/giphy.gif";
            message.reply(replyMsg);
            return;
        }

        if (content.includes('يا عبد') || content === 'عبد' || content.includes('العبد')) {
            if (isArthur) {
                const randomArthurReply = arthurGreetings[Math.floor(Math.random() * arthurGreetings.length)];
                message.reply(randomArthurReply);
            } else {
                const randomReply = royalResponses[Math.floor(Math.random() * royalResponses.length)];
                message.reply(randomReply);
            }
            return;
        }

        if (content === '!status') {
            const statusMsg = isArthur 
                ? "أنا عبدك المخلص يا ارثر، مرابط في فويس دايڤل ومربوط بحبال الطاعة للأبد! ⛓️🦅"
                : "أنا عبدكم المطيع، جالس في فويس دايڤل ومربوط للأبد! ⛓️";
            message.reply(statusMsg);
            return;
        }

        if (content.includes('جوعان') || content.includes('اكل')) {
            const foodMsg = isArthur 
                ? "تأمرني أطبخ لك يا ارثر؟ ترا أكلي الوحيد هو هواء سيرفر دايڤل الطاهر ودموع المحرومين! 🍛🔥"
                : "أمركم يا طويل العمر، بس ترا أكلنا الوحيد هو هواء سيرفر دايڤل الطاهر! 🍛";
            message.reply(foodMsg);
            return;
        }

        if (content.includes('شكرا') || content.includes('مشكور')) {
            const thanksMsg = isArthur 
                ? "العفو يا مولاي ارثر! رضاك وسام على صدري وبونص حياتي في سيرفر دايڤل. ⚡👑"
                : "العفو! رضاكم هو بونص الشهر حقنا في سيرفر دايڤل. ⚡";
            message.reply(thanksMsg);
            return;
        }

        if (content.includes('وينك')) {
            const whereMsg = isArthur 
                ? "قاعد أطالع ركن الفويس بـ دايڤل بصمت ودموعي تنزل عشاني ما شفتك يا ارثر... انتظر طال عمرك تطل عليّ بس! 💧🖤"
                : "قاعد أطالع ركن الفويس بـ دايڤل بصمت ودموعي على خدودي... انتظر تطلون عليّ! 💧";
            message.reply(whereMsg);
            return;
        }

        if (content.includes('قوم') || content.includes('تحرك')) {
            const moveMsg = isArthur 
                ? "ما أقدر يا ارثر! أنا مسمّر بروم دايڤل بقرارات جمهورية منك وحدك، ما أتحرك إلا بأمرك السامي! ⛓️🔥"
                : "ما أقدر! أنا مسمّر بروم دايڤل بقرارات ملكية، ما أتحرك إلا بأمركم! ⛓️";
            message.reply(moveMsg);
            return;
        }
    }
});

function connectToVoice() {
    try {
        const guild = client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.fetch(CONFIG.GUILD_ID);
        if (!guild) {
            setTimeout(connectToVoice, 5_000);
            return;
        }

        client.channels.fetch(CONFIG.VOICE_CHANNEL_ID).then(channel => {
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
