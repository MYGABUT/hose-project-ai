"""
Email Ingestion Service 📧
Connects to IMAP server to fetch vendor invoices
"""
import imaplib
import email
import os
from email.header import decode_header
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.core.config import settings
from app.models.invoice_inbox import InvoiceInbox, InboxSource, InboxStatus

logger = logging.getLogger("email_ingest")

class EmailIngestService:
    def __init__(self, db: Session):
        self.db = db
        self.mail = None
        self.upload_dir = os.path.join(settings.BASE_DIR, "uploads", "invoices")
        os.makedirs(self.upload_dir, exist_ok=True)

    def connect(self):
        """Connect to IMAP server"""
        try:
            self.mail = imaplib.IMAP4_SSL(settings.EMAIL_SERVER)
            self.mail.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            logger.info(f"Connected to {settings.EMAIL_SERVER} as {settings.EMAIL_USER}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to IMAP: {e}")
            return False

    def fetch_emails(self, mark_as_read=False):
        """Fetch UNSEEN emails with attachments"""
        if not self.mail:
            if not self.connect():
                return 0

        try:
            self.mail.select(settings.EMAIL_FOLDER)
            
            # Search for unread emails
            status, messages = self.mail.search(None, 'UNSEEN')
            if status != 'OK':
                return 0
                
            email_ids = messages[0].split()
            processed_count = 0
            
            for e_id in email_ids:
                try:
                    res, msg_data = self.mail.fetch(e_id, '(RFC822)')
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            
                            # Get Subject
                            subject, encoding = decode_header(msg["Subject"])[0]
                            if isinstance(subject, bytes):
                                subject = subject.decode(encoding if encoding else 'utf-8')
                                
                            # Get Sender
                            sender = msg.get("From")
                            
                            # Check for attachments
                            has_attachment = False
                            for part in msg.walk():
                                if part.get_content_maintype() == 'multipart':
                                    continue
                                if part.get('Content-Disposition') is None:
                                    continue
                                    
                                filename = part.get_filename()
                                if filename:
                                    # Filter allowed extensions
                                    ext = os.path.splitext(filename)[1].lower()
                                    if ext in ['.pdf', '.jpg', '.jpeg', '.png']:
                                        self._save_attachment(part, filename, sender)
                                        has_attachment = True
                            
                            if has_attachment:
                                processed_count += 1
                                # Determine whether to mark as read or keep unread based on usage
                                # For safety, we might keep it UNSEEN until confirmed, but usually we mark SEEN
                                if mark_as_read:
                                    self.mail.store(e_id, '+FLAGS', '\\Seen')
                                else:
                                    # If debugging, keep unseen
                                    pass
                                    
                except Exception as e:
                    logger.error(f"Error processing email {e_id}: {e}")
                    
            return processed_count
            
        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            return 0
        finally:
            pass # Keep connection open or close? Typically close in a schedule.

    def _save_attachment(self, part, filename, sender):
        """Save attachment to disk and DB"""
        try:
            # Clean filename
            valid_chars = "-_.() abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            clean_filename = "".join(c for c in filename if c in valid_chars)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            final_filename = f"{timestamp}_{clean_filename}"
            file_path = os.path.join(self.upload_dir, final_filename)
            
            # Save file
            with open(file_path, "wb") as f:
                f.write(part.get_payload(decode=True))
                
            # Create DB Record
            inbox_item = InvoiceInbox(
                source=InboxSource.EMAIL.value,
                sender=sender,
                filename=final_filename,
                file_path=file_path,
                status=InboxStatus.NEW.value,
                content_type=part.get_content_type()
            )
            self.db.add(inbox_item)
            self.db.commit()
            
            logger.info(f"Saved invoice attachment: {final_filename} from {sender}")
            
        except Exception as e:
            logger.error(f"Failed to save attachment {filename}: {e}")

    def close(self):
        try:
            self.mail.close()
            self.mail.logout()
        except:
            pass
