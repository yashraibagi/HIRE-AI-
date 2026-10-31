import html
import logging
import os
from dataclasses import dataclass
from email_validator import EmailNotValidError, validate_email
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

logger = logging.getLogger("hireai.email")


@dataclass(frozen=True)
class ShortlistEmail:
    student_name: str
    student_email: str
    job_title: str
    recruiter_name: str
    match_score: float | None
    status_text: str
    custom_message: str | None = None


def _mail_configuration() -> ConnectionConfig | None:
    required = ("MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM", "MAIL_SERVER", "MAIL_PORT")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        logger.warning("Email is not configured; missing environment variables: %s", ", ".join(missing))
        return None
    try:
        return ConnectionConfig(
            MAIL_USERNAME=os.environ["MAIL_USERNAME"],
            MAIL_PASSWORD=os.environ["MAIL_PASSWORD"],
            MAIL_FROM=os.environ["MAIL_FROM"],
            MAIL_SERVER=os.environ["MAIL_SERVER"],
            MAIL_PORT=int(os.environ["MAIL_PORT"]),
            MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "HireAI"),
            MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "true").lower() == "true",
            MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "false").lower() == "true",
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
    except (ValueError, TypeError):
        logger.exception("Invalid SMTP configuration; skipping email notification")
        return None


def email_is_configured() -> bool:
    required = ("MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM", "MAIL_SERVER", "MAIL_PORT")
    return all(os.getenv(key) for key in required)


def _email_html(notification: ShortlistEmail) -> str:
    student_name = html.escape(notification.student_name or "there")
    job_title = html.escape(notification.job_title)
    recruiter_name = html.escape(notification.recruiter_name)
    status_text = html.escape(notification.status_text)
    custom_message = (
        html.escape(notification.custom_message).replace("\n", "<br>")
        if notification.custom_message
        else ""
    )
    score = (
        f"{notification.match_score:.1f}%"
        if notification.match_score is not None
        else "Not available"
    )
    action_url = html.escape(os.getenv("APP_URL", "http://localhost:5173"), quote=True)
    return f"""<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f1f5f9">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
          <tr><td style="padding:28px 32px;background:#312e81;color:#ffffff"><h1 style="margin:0;font-size:24px">HireAI application update</h1></td></tr>
          <tr><td style="padding:32px">
            <p style="font-size:16px">Hi {student_name},</p>
            <p style="font-size:16px;line-height:1.6">{custom_message or f'{status_text} for <strong>{job_title}</strong> at <strong>{recruiter_name}</strong>.'}</p>
            <p style="margin:24px 0;padding:16px;background:#eef2ff;border-radius:10px"><strong>Resume match:</strong> {score}</p>
            <p style="font-size:15px;line-height:1.6">The recruiter will contact you with next steps or interview scheduling instructions. Please check your application dashboard for updates.</p>
            <p style="margin:28px 0"><a href="{action_url}" style="display:inline-block;padding:13px 22px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">View your application</a></p>
            <p style="color:#64748b;font-size:13px">This is an automated message from HireAI. Replies may not be monitored.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""


async def send_shortlist_email(notification: ShortlistEmail) -> bool:
    """Send a shortlist/threshold notification. Return False when unconfigured or delivery fails."""
    try:
        valid_email = validate_email(notification.student_email, check_deliverability=False).normalized
    except (EmailNotValidError, TypeError):
        logger.warning("Skipping shortlist notification: invalid student email")
        return False

    config = _mail_configuration()
    if config is None:
        return False

    try:
        message = MessageSchema(
            subject=f"Application update: {notification.job_title}",
            recipients=[valid_email],
            body=_email_html(notification),
            subtype=MessageType.html,
        )
        await FastMail(config).send_message(message)
        logger.info("Sent application notification to %s for %s", valid_email, notification.job_title)
        return True
    except Exception:
        logger.exception("Failed to send shortlist notification to %s", valid_email)
        return False


async def send_candidate_email(recipient: str, subject: str, body: str) -> bool:
    """Send a recruiter-authored candidate email as plain text."""
    try:
        valid_email = validate_email(recipient, check_deliverability=False).normalized
    except (EmailNotValidError, TypeError):
        logger.warning("Skipping recruiter email: invalid candidate email")
        return False

    config = _mail_configuration()
    if config is None:
        return False

    try:
        message = MessageSchema(
            subject=subject,
            recipients=[valid_email],
            body=body,
            subtype=MessageType.plain,
        )
        await FastMail(config).send_message(message)
        logger.info("Sent recruiter email to %s", valid_email)
        return True
    except Exception:
        logger.exception("Failed to send recruiter email to %s", valid_email)
        return False
