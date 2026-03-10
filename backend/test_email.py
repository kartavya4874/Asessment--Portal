import asyncio
import os
import sys

# Add parent directory to path so we can import 'app' module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.email_service import email_service
from app.config import get_settings

settings = get_settings()

async def test_email():
    print(f"Testing config: Enabled={settings.EMAIL_ENABLED}, Sender={settings.SENDER_EMAIL}")
    success = await email_service.send_email(
        recipient="kartavyabaluja453@gmail.com",
        template_name="welcome.html",
        context={
            "student_name": "Kartavya Test",
            "roll_number": "TEST-101",
            "email": "kartavyabaluja453@gmail.com",
            "login_url": "https://assessments.kartavyabaluja.in"
        },
        subject="Test Mode: AI Portal Email System"
    )
    if success is False:
        print("Explicit False returned from send_email")
    else: # None is returned on success by send_email wrapper technically, but we catch exceptions
        print("Test executed without crashing the wrapper.")

if __name__ == "__main__":
    asyncio.run(test_email())
