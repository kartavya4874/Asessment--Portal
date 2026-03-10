import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
import asyncio
from datetime import datetime, timezone
from app.config import get_settings

settings = get_settings()

# Setup Jinja2 environment for templates
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
os.makedirs(TEMPLATE_DIR, exist_ok=True)
env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(['html', 'xml'])
)

# Brevo free tier allows 300 emails/day. We use 280 to leave a safety buffer.
DAILY_EMAIL_LIMIT = 280


class EmailService:
    def __init__(self):
        self.server = settings.SMTP_SERVER
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
        self.sender = settings.SENDER_EMAIL
        self.enabled = settings.EMAIL_ENABLED

    async def _send_smtp_now(self, recipient: str, subject: str, html_content: str) -> bool:
        """Send an email directly via SMTP. Returns True on success."""
        if not self.enabled:
            print(f"📧 [Email Disabled] Would have sent to {recipient}: {subject}")
            return False

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"AI Lab Portal <{self.sender}>"
        message["To"] = recipient
        message.attach(MIMEText(html_content, "html"))

        try:
            loop = asyncio.get_running_loop()

            def sync_send():
                with smtplib.SMTP(self.server, self.port) as s:
                    s.starttls()
                    s.login(self.username, self.password)
                    s.sendmail(self.sender, recipient, message.as_string())

            await loop.run_in_executor(None, sync_send)
            print(f"✅ Email sent to {recipient}: {subject}")
            return True
        except Exception as e:
            print(f"❌ Failed to send email to {recipient}: {e}")
            return False

    async def send_email(self, recipient: str, template_name: str, context: dict, subject: str):
        """
        Render template and enqueue or send the email.
        If the daily limit has already been reached, the email is saved to MongoDB
        and will be delivered the next day when the queue flusher runs.
        """
        from app.database import email_queue_collection

        if not self.enabled:
            print(f"📧 [Email Disabled] Would have sent to {recipient}: {subject}")
            return

        try:
            template = env.get_template(template_name)
            html_content = template.render(**context)
        except Exception as e:
            print(f"❌ Failed to render template {template_name}: {e}")
            return

        # Check how many emails sent today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        sent_today = await email_queue_collection.count_documents({
            "status": "sent",
            "sent_at": {"$gte": today_start}
        })

        if sent_today >= DAILY_EMAIL_LIMIT:
            # Queue for later delivery
            await email_queue_collection.insert_one({
                "recipient": recipient,
                "subject": subject,
                "html_content": html_content,
                "status": "pending",
                "created_at": datetime.now(timezone.utc),
                "attempts": 0
            })
            print(f"📬 Email queued (daily limit {DAILY_EMAIL_LIMIT} reached): {recipient}")
            return

        # Under limit — send immediately and record
        success = await self._send_smtp_now(recipient, subject, html_content)
        if success:
            await email_queue_collection.insert_one({
                "recipient": recipient,
                "subject": subject,
                "status": "sent",
                "sent_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
            })


async def flush_email_queue():
    """
    Background job: process pending emails from the queue up to the daily limit.
    Meant to run once per hour via APScheduler.
    """
    from app.database import email_queue_collection

    if not settings.EMAIL_ENABLED:
        return

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    sent_today = await email_queue_collection.count_documents({
        "status": "sent",
        "sent_at": {"$gte": today_start}
    })

    remaining_quota = DAILY_EMAIL_LIMIT - sent_today
    if remaining_quota <= 0:
        print(f"📧 Daily email limit reached ({DAILY_EMAIL_LIMIT}). Will retry tomorrow.")
        return

    # Pick oldest pending emails up to the remaining quota
    pending = await email_queue_collection.find(
        {"status": "pending"}
    ).sort("created_at", 1).limit(remaining_quota).to_list(length=remaining_quota)

    if not pending:
        return

    print(f"📬 Flushing email queue: {len(pending)} pending emails, {remaining_quota} quota remaining today.")

    for item in pending:
        success = await email_service._send_smtp_now(
            recipient=item["recipient"],
            subject=item["subject"],
            html_content=item["html_content"]
        )
        if success:
            await email_queue_collection.update_one(
                {"_id": item["_id"]},
                {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc)}}
            )
        else:
            await email_queue_collection.update_one(
                {"_id": item["_id"]},
                {"$inc": {"attempts": 1}}
            )


email_service = EmailService()
