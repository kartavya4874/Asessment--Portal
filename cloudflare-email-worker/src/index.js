/**
 * Cloudflare Worker — Send emails via MailChannels API
 *
 * POST /  →  { to, subject, html }
 *
 * MailChannels is free for Cloudflare Workers.
 * Make sure you add an SPF TXT record to your sending domain:
 *   v=spf1 include:relay.mailchannels.net -all
 */

export default {
    async fetch(request, env) {
        // Only accept POST
        if (request.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" },
            });
        }

        try {
            const { to, subject, html } = await request.json();

            if (!to || !subject || !html) {
                return new Response(
                    JSON.stringify({ error: "Missing required fields: to, subject, html" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
            }

            // Send via MailChannels
            const mailResponse = await fetch("https://api.mailchannels.net/tx/v1/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    personalizations: [
                        {
                            to: [{ email: to }],
                        },
                    ],
                    from: {
                        email: "noreply@kartavyabaluja.in",
                        name: "AI Lab Assessment Portal",
                    },
                    subject: subject,
                    content: [
                        {
                            type: "text/html",
                            value: html,
                        },
                    ],
                }),
            });

            if (mailResponse.ok || mailResponse.status === 202) {
                return new Response(
                    JSON.stringify({ success: true, message: "Email sent" }),
                    { status: 200, headers: { "Content-Type": "application/json" } }
                );
            }

            const errorText = await mailResponse.text();
            console.error("MailChannels error:", errorText);
            return new Response(
                JSON.stringify({ error: "Failed to send email", details: errorText }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        } catch (err) {
            console.error("Worker error:", err);
            return new Response(
                JSON.stringify({ error: "Internal server error" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    },
};
