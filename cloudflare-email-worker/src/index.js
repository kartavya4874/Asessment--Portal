/**
 * Cloudflare Worker — Send emails via Resend API
 *
 * POST /  →  { to, subject, html }
 *
 * Resend free tier: 100 emails/day, 3000/month
 * Get your API key at https://resend.com/api-keys
 *
 * Set RESEND_API_KEY as a Worker secret:
 *   npx wrangler secret put RESEND_API_KEY
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

            const RESEND_API_KEY = env.RESEND_API_KEY;
            if (!RESEND_API_KEY) {
                return new Response(
                    JSON.stringify({ error: "RESEND_API_KEY not configured" }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }

            // Send via Resend API
            const mailResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: "AI Lab Assessment Portal <onboarding@resend.dev>",
                    to: [to],
                    subject: subject,
                    html: html,
                }),
            });

            const result = await mailResponse.json();

            if (mailResponse.ok) {
                return new Response(
                    JSON.stringify({ success: true, message: "Email sent", id: result.id }),
                    { status: 200, headers: { "Content-Type": "application/json" } }
                );
            }

            console.error("Resend error:", JSON.stringify(result));
            return new Response(
                JSON.stringify({ error: "Failed to send email", details: result }),
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
