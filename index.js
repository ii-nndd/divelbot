// ==========================================
// 👑 1. منطقة الإعدادات الملكية (عدل الآي ديهات هنا فقط)
// ==========================================
const CONFIG = {
    GUILD_ID: '1545100203751645224',          // آي دي سيرفر دايڤل
    VOICE_CHANNEL_ID: '1545729488938205274',   // آي دي روم الفويس
    ARTHUR_ID: '848996426918002731',          // الآي دي الشخصي لك يا مولاي ارثر
    ROYAL_ROLE_ID: '1554207336967446608'      // آي دي الرتبة الملكية
};

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

// =========================================================================
// 👑 2. قسم ردود "ارثر" الخاصة (احذف أو أضف أي رد هنا براحتك بين الأقواس [])
// =========================================================================
const arthurGreetings = [
    "أمرك مطاع يا مولاي ارثر، عساك بس راضٍ عن أداء العبد في سيرفر دايڤل؟ 🙇‍♂️✨",
    "تسمع صوت عبدك المطيع يا ارثر؟ أنا تحت أمرك وجاهز أفرش لك سيرفر دايڤل ورد! 🌹",
    "يا مرحباً بتاج راس العبد! تكفى يا ارثر لا تقطع عني الروم ترا أموت من الشوق والبرد. 🖤",
    "أمرك يا مولاي ارثر! عيوني وقلبي فداك، جالس أراقب الفويس وأمنع أي طير يطير فيه. 🦅",
    "تدلل يا ارثر، تبي أجيب لك قهوة ملكية ولا أسوي لك زفة في روم دايڤل؟ ☕👑",
    "أنا رهن إشارتك يا مولاي ارثر، خطك أحمر والكل يفداك يا كبير! ⚡",
    "يا لبي قلبك يا ارثر، أمر بشيء يطال عمرك ولا أرجع أطالع الجدران بصمت؟ 🧱",
    "سمعاً وطاعة يا سيد السيرفر، ارثر الحبيب نورت الفويس ونورت دايڤل كله! 🌟",
    "يا هلا ومليون هلا بمولاي ارثر، تبي أنظف لك الروم ولا أطرد الملقوفين؟ 😂",
    "أمرك يا تاج راسنا، العبد تحت أمرك ولو تبي أغني لك في الفويس ترا حاضر! 🎶"
];

// =========================================================================
// 🛡️ 3. قسم ردود أصحاب الرتبة الملكية (احذف أو أضف هنا)
// =========================================================================
const royalResponses = [
    "نعم يا طويل العمر، تأمر بشيء يطال عمرك في سيرفر دايڤل؟ 🙇‍♂️",
    "تسمع صوتي؟ أنا حارس الفويس الشخصي في دايڤل تحت أمركم! 🫡",
    "سمعاً وطاعة... منورين روم دايڤل يا أصحاب المقام الرفيع! 🦅",
    "أمركم! جالس أراقب الجو بالفويس عشان ما يهرب لغرفة ثانية بدايڤل. 💨",
    "تدللون، تبي أجيب لكم فطور ملكي ولا قهوة على حساب سيرفر دايڤل؟ ☕",
    "يا هلا بأهل الرتبة الكبار، أمركم دَيْن في رقبة العبد! ⚡",
    "تحت أمركم طال عمركم، السيرفر منور بوجودكم الحار! 🔥"
];

// =========================================================================
// 💀 4. قسم إهانات العشوائيين / بدون رتبة (احذف أو أضف هنا)
// =========================================================================
const peasantInsults = [
    "أنا مش عبدك! انقلع يا مسكين، أنا ما أخدم إلا مولاي ارثر وصاحب الرتبة الملكية في دايڤل! 💅😂",
    "خير؟ وش تبي يا بابا؟ دور لك عبد غيري، أنا مخصص لمولاي ارثر وبس! اقلب وجهك! 👑",
    "أنا مو عبدك! لا تحاول تحتك فيني وتكاسرني، مالي خلق أشكال بيئية مثلك! 💀",
    "اقصص لساني لو رديت عليك! أنا عبد مولاي ارثر وبس، رح العب بعيد يا شاطر. 🤫",
    "بدري عليك! العبد هذا غالي وما يخدم إلا ارثر وأهل الرتب الكبار في دايڤل، طس من هنا! 🦅",
    "وين رايح يا الحبيب؟ الباب مفتوح، لا تشغلنا بوجيهك اللي مب صاحية! 🚪🚶‍♂️",
    "أقول انقلع بس، شكلك ضايع وتحسبني حق مطاعم، أنا عبد ارثر وبس! 🍔❌",
    "يا عمري أنت، تحسب تقدر تأمرني؟ روح العب بعيد لين تطلع لك شنب بعدين تعال! 🍼😂"
];

// =========================================================================
// 🍳 5. قسم الطبخ والذبايح الملكية (مخصص لـ ارثر)
// =========================================================================
const arthurFood = [
    "أبشر بالسعد يا ارثر! الحين أجهز لك مندي حاشي مدخن على أصوله، ولا تبي كبسة ضب فاخرة؟ 🍖🔥",
    "سمعاً وطاعة يا مولاي ارثر! آمرني بس: تبي جريش ملكي ولا قرصان يفجّر المخ؟ 🍲👑",
    "حاضرين يا تاج راسنا! جالس أجهز لك أطخم ذبيحة محشية مكسرات على طريق سيرفر دايڤل! 🐑✨",
    "تأمرني أطبخ لك كبسة تكسر الظهر يا ارثر؟ دقايق وتكون سفرتك جاهزة قدام عرشك! 🍛",
    "يا بعد بياني أنت! تبي كباب ولا مشاوي مشكلة على الجمر ياهو بتدعي لي! 🍢🔥"
];

// =========================================================================
// 🍲 6. قسم الطبخ والأكل الخاص بأصحاب الرتبة
// =================5========================================================
const royalFood = [
    "أمركم يا طويل العمر! الحين أطبخ لكم أطخم كبسة دجاج محمر تفتح النفس. 🍗",
    "سمعاً وطاعة! آمرونا بوجبة ملكية وتلقون العبد مجهزها بثواني بالسيرفر. 🍲",
    "تأمرون فطور ولا غداء يا أصحاب السمو؟ العبد جاهز يشعل المطبخ حالاً! 🔥",
    "تحت أمركم! أجهز لكم الذبيحة ولا تكتفون بصينية مشاوي فاخرة؟ 🍖",
    "حاضرين للطيبين، جالس أضبط لكم أحلى سفرة تليق بمقامكم الرفيع! 🍛✨"
];

// =========================================================================
// 🥊 7. قسم ضرب وتأديب العشوائيين وإبكائهم (لو العشوائي تكلم بوقاحة)
// =========================================================================
const peasantBeatings = [
    "تعليقك الوقح هذا مردود في وجهك! خذ كف يخليك تبكي بزاوية الروم وتصيح! 🖐️💥😭",
    "تتجرأ وترد علي كذا يا قليل الأدب؟! تفضل هذي ضربة على راسك عشان تصحى وتبكي عند أمك! 🧹👊😢",
    "عيب يا بيبي! شكل تربيتك ناقصة، خليني أعطيك درس بالنعال يخلي دموعك أربع أربع! 🩴💦😭",
    "أنا توريني عينك الحمراء يا مسكين؟! خذ طراق يخليك تلف راسك لفة كاملة وتقعد تصيح! 🌪️👋😭",
    "تبي تتطاول على عبد مولاي ارثر؟! خذ هذي عصا تأديب على ظهرك عشان ما تعودها وتجلس تبكي! 🪵💥🥺"
];

// =========================================================================
// 😭 8. قسم ضرب البوت وإبكائه (لو ارثر أو الأدمن ضربوه بالروم)
// =========================================================================
const botBeatingResponses = [
    "آآآخ يا راسسسي! ليش الطق يا مولاي ارثر؟ خلاص توبْت والله ما عاد أرفع صوتي! 😭💥💔",
    "حرام عليك الكف المحترم هذا! وجهي تورم ودموعي أربع أربع... امزح معك والله، لا تعيدها تكفى! 🖐️💧😭",
    "آآآح يا ظهرررري! طقيتوني لين نسيت اسمي... سمراً وطاعة بس بالراحة على العبد المسكين! 🪵💥🥺",
    "اهئ اهئ... ليه كذا يا أصحاب الرتبة تضربوني؟ خلاص بروح أصيح بالزاوية لوحدي! 😭💧벽",
    "على خششمي وعلى راسي الكف! استاهل عشان صرت ثقيل دم، تكفون لا تطردوني برا الفويس! 🙇‍♂️💥💧"
];

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const member = message.member;
    const userId = message.author.id;

    const isArthur = (userId === CONFIG.ARTHUR_ID);
    const hasRoyalRole = member && member.roles.cache.has(CONFIG.ROYAL_ROLE_ID);
    const hasAccess = isArthur || hasRoyalRole;

    // التحقق إذا ارثر أو الأدمن ضربوا البوت
    const isHittingBot = content.includes('اضربك') || content.includes('كف') || content.includes('طراق') || content.includes('طق') || content.includes('ادقك') || content.includes('تسطير');

    if (hasAccess && isHittingBot) {
        const randomBotCry = botBeatingResponses[Math.floor(Math.random() * botBeatingResponses.length)];
        message.reply(randomBotCry);
        return;
    }

    const isInteracting = content.includes('يا عبد') || content === 'عبد' || content.includes('العبد') || 
                          content === '!تعال' || content === 'تعال' || content === 'ادخل' || content === 'تفضل' ||
                          content === '!اخرج' || content === 'اخرج' || content === '!اطلع' || content === 'اطلع' ||
                          content === '!يبكي' || content === 'يبكي' || content === 'بكاء' ||
                          content === '!status' || content.includes('جوعان') || content.includes('اكل') || 
                          content.includes('شكرا') || content.includes('مشكور') || content.includes('وينك') || 
                          content.includes('قوم') || content.includes('تحرك') ||
                          content.includes('غبي') || content.includes('حمار') || content.includes('كل زق') || content.includes('انقلع') || content.includes('جب');

    if (isInteracting) {
        if (!hasAccess) {
            const isRude = content.includes('غبي') || content.includes('حمار') || content.includes('كل زق') || content.includes('انقلع') || content.includes('جب');
            if (isRude) {
                const randomBeating = peasantBeatings[Math.floor(Math.random() * peasantBeatings.length)];
                message.reply(randomBeating);
            } else {
                const randomInsult = peasantInsults[Math.floor(Math.random() * peasantInsults.length)];
                message.reply(randomInsult);
            }
            return;
        }

        if (content === '!تعال' || content === 'تعال' || content === 'ادخل' || content === 'تفضل') {
            const replyMsg = isArthur 
                ? "أمرك وسيدك يا مولاي ارثر! راجع الفويس جري برجليني الثنتين وبأسرع سرعة للخدمة! 🏃‍♂️💨" 
                : "أمرك يا طويل العمر! راجع الفويس حالاً وبكل سرعة! 🏃‍♂️💨";
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
                        ? "سمعاً وطاعة يا مولاي ارثر... طلعت من الفويس بس لجل عيونك، لا تطول غيبتك عنا! 🚪🚶‍♂️"
                        : "سمعاً وطاعة... طلعت من الفويس براحة بالكم! 🚪";
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
                ? "ليه كذا يا ارثر تخليني أمثل الدراما؟ حاضر بقلبها تمثيلية أوسكار عشالك! 🎭😂"
                : "أبشر، نسوي شوية دراما وسوالف عشان نغير جو السيرفر! 🎭";
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
                : "أنا عبدكم المطيع، جالس في فويس دايڤل ومرابط 24/7! ⛓️";
            message.reply(statusMsg);
            return;
        }

        if (content.includes('جوعان') || content.includes('اكل')) {
            if (isArthur) {
                const selectedFood = arthurFood[Math.floor(Math.random() * arthurFood.length)];
                message.reply(selectedFood);
            } else {
                const selectedFoodRoyal = royalFood[Math.floor(Math.random() * royalFood.length)];
                message.reply(selectedFoodRoyal);
            }
            return;
        }

        if (content.includes('شكرا') || content.includes('مشكور')) {
            const thanksMsg = isArthur 
                ? "العفو يا مولاي ارثر! رضاك وسام على صدري وبونص حياتي في سيرفر دايڤل. ⚡👑"
                : "العفو! حنا بالخدمة وتحت أمركم بأي وقت. ⚡";
            message.reply(thanksMsg);
            return;
        }

        if (content.includes('وينك')) {
            const whereMsg = isArthur 
                ? "قاعد أطالع ركن الفويس بـ دايڤل بصمت أنتظر تطل عليّ يا ارثر... منور الروم بوجودك! 🌟"
                : "قاعد أطالع ركن الفويس بـ دايڤل بانتظار أوامركم! 👀";
            message.reply(whereMsg);
            return;
        }

        if (content.includes('قوم') || content.includes('تحرك')) {
            const moveMsg = isArthur 
                ? "ما أقدر يا ارثر! أنا مسمّر بروم دايڤل بقرارات منك وحدك، ما أتحرك إلا بأمرك السامي! ⛓️🔥"
                : "ما أقدر! أنا مسمّر بروم دايڤل بقرارات ملكية صارمة! ⛓️";
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
                console.log("⚠️ خطأ في الاتصال الصوتي، جاري إعادة المحاولة الفورية...", error.message);
                try { activeConnection.destroy(); } catch (e) {}
                setTimeout(connectToVoice, 3_000);
            });

            activeConnection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(activeConnection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(activeConnection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    console.log("🔄 تم فصل البوت، جاري إرجاعه للفويس فوراً...");
                    try { activeConnection.destroy(); } catch (e) {}
                    setTimeout(connectToVoice, 3_000);
                }
            });

            console.log(`✅ العبد دخل روم الصوت بنجاح في دايڤل: ${channel.name}`);
        }).catch(err => {
            setTimeout(connectToVoice, 5_000);
        });

    } catch (error) {
        setTimeout(connectToVoice, 10_000);
    }
}

process.on('unhandledRejection', error => {});

client.login(process.env.DISCORD_TOKEN);
