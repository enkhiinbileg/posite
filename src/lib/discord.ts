
export async function sendDiscordNotification(params: {
    webhookUrl: string;
    webtoonTitle: string;
    chapterNumber: number;
    chapterTitle?: string;
    imageUrl: string;
    link: string;
    isMilestone?: boolean;
}) {
    const { webhookUrl, webtoonTitle, chapterNumber, chapterTitle, imageUrl, link, isMilestone } = params;

    const embed = {
        title: isMilestone ? `🎉 10-ТЫН МАЙЛСТОУН: ${webtoonTitle}` : `🚀 Шинэ Бүлэг Орлоо: ${webtoonTitle}`,
        description: `**${chapterTitle || `Бүлэг ${chapterNumber}`}** амжилттай нийтлэгдлээ!`,
        url: link,
        color: 0xE50914, // Netflix Red
        fields: [
            {
                name: "Бүлэг",
                value: `Анги ${chapterNumber}`,
                inline: true
            },
            {
                name: "Унших",
                value: `[Энд дарж уншина уу](${link})`,
                inline: true
            }
        ],
        image: {
            url: imageUrl
        },
        timestamp: new Date().toISOString(),
        footer: {
            text: "MyToon Update Service",
            icon_url: "https://mytoon.site/logo.png"
        }
    };

    try {
        console.log(`[DISCORD] Sending notification to Discord for ${webtoonTitle}...`);
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Discord Webhook API Error:", response.status, errorText);
            return { success: false, error: `Discord API Error ${response.status}: ${errorText.substring(0, 100)}` };
        }

        console.log("[DISCORD] Notification sent successfully!");
        return { success: true };
    } catch (error: any) {
        console.error("Discord Webhook Exception:", error);
        return { success: false, error: error.message };
    }
}
