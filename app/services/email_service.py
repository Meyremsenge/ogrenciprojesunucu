"""
Email Service - E-posta gönderim servisi.

Bu servis e-posta gönderim işlemlerini yönetir.
"""

from typing import List, Optional, Dict, Any
from flask import current_app, render_template
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """
    E-posta gönderim servisi.
    
    Flask-Mail veya harici servisler (SendGrid, AWS SES) ile
    e-posta gönderimini yönetir.
    """
    
    @classmethod
    def send_email(
        cls,
        to: str | List[str],
        subject: str,
        body: str = None,
        html: str = None,
        template: str = None,
        template_data: Dict[str, Any] = None,
        cc: List[str] = None,
        bcc: List[str] = None,
        attachments: List[Dict] = None,
        reply_to: str = None
    ) -> bool:
        """
        E-posta gönderir.
        
        Args:
            to: Alıcı adresi veya adresleri
            subject: E-posta konusu
            body: Düz metin içerik
            html: HTML içerik
            template: Jinja2 template dosyası
            template_data: Template değişkenleri
            cc: CC adresleri
            bcc: BCC adresleri
            attachments: Ek dosyalar
            reply_to: Yanıt adresi
            
        Returns:
            bool: Gönderim başarılı mı
        """
        try:
            from flask_mail import Message
            from app.extensions import mail
            
            # Template varsa render et
            if template and template_data:
                html = render_template(template, **template_data)
            
            # Alıcıları liste yap
            recipients = [to] if isinstance(to, str) else to
            
            msg = Message(
                subject=subject,
                recipients=recipients,
                body=body,
                html=html,
                cc=cc,
                bcc=bcc,
                reply_to=reply_to
            )
            
            # Ekleri ekle
            if attachments:
                for attachment in attachments:
                    msg.attach(
                        filename=attachment.get('filename'),
                        content_type=attachment.get('content_type', 'application/octet-stream'),
                        data=attachment.get('data')
                    )
            
            mail.send(msg)
            
            logger.info(f'Email sent to {recipients}: {subject}')
            return True
            
        except Exception as e:
            logger.error(f'Email send failed: {str(e)}')
            return False
    
    @classmethod
    def send_verification_email(cls, user_email: str, token: str) -> bool:
        """E-posta doğrulama maili gönderir."""
        verify_url = f"{current_app.config.get('FRONTEND_URL')}/verify-email?token={token}"
        
        return cls.send_email(
            to=user_email,
            subject='E-posta Adresinizi Doğrulayın',
            template='emails/verify_email.html',
            template_data={
                'verify_url': verify_url,
                'app_name': current_app.config.get('APP_NAME', 'Öğrenci Koçluk Sistemi')
            }
        )
    
    @classmethod
    def send_password_reset_email(cls, user_email: str, token: str) -> bool:
        """Şifre sıfırlama maili gönderir."""
        reset_url = f"{current_app.config.get('FRONTEND_URL')}/reset-password?token={token}"
        
        return cls.send_email(
            to=user_email,
            subject='Şifre Sıfırlama Talebi',
            template='emails/password_reset.html',
            template_data={
                'reset_url': reset_url,
                'app_name': current_app.config.get('APP_NAME', 'Öğrenci Koçluk Sistemi')
            }
        )
    
    @classmethod
    def send_welcome_email(cls, user_email: str, user_name: str) -> bool:
        """Hoş geldin maili gönderir."""
        return cls.send_email(
            to=user_email,
            subject='Hoş Geldiniz!',
            template='emails/welcome.html',
            template_data={
                'user_name': user_name,
                'app_name': current_app.config.get('APP_NAME', 'Öğrenci Koçluk Sistemi'),
                'login_url': f"{current_app.config.get('FRONTEND_URL')}/login"
            }
        )
    
    @classmethod
    def send_course_enrollment_email(
        cls,
        user_email: str,
        user_name: str,
        course_name: str,
        course_url: str
    ) -> bool:
        """Kurs kayıt bildirimi gönderir."""
        return cls.send_email(
            to=user_email,
            subject=f'{course_name} kursuna kayıt oldunuz',
            template='emails/course_enrollment.html',
            template_data={
                'user_name': user_name,
                'course_name': course_name,
                'course_url': course_url
            }
        )
    
    @classmethod
    def send_live_session_reminder(
        cls,
        user_email: str,
        user_name: str,
        session_title: str,
        session_time: str,
        session_url: str
    ) -> bool:
        """Canlı ders hatırlatması gönderir."""
        return cls.send_email(
            to=user_email,
            subject=f'Hatırlatma: {session_title}',
            template='emails/live_session_reminder.html',
            template_data={
                'user_name': user_name,
                'session_title': session_title,
                'session_time': session_time,
                'session_url': session_url
            }
        )
    
    @classmethod
    def send_bulk_email(
        cls,
        recipients: List[str],
        subject: str,
        body: str = None,
        html: str = None
    ) -> Dict[str, Any]:
        """
        Toplu e-posta gönderir.
        
        Returns:
            Dict: Başarılı/başarısız gönderimlerin sayısı
        """
        success = 0
        failed = 0
        failed_emails = []
        
        for recipient in recipients:
            if cls.send_email(to=recipient, subject=subject, body=body, html=html):
                success += 1
            else:
                failed += 1
                failed_emails.append(recipient)
        
        return {
            'total': len(recipients),
            'success': success,
            'failed': failed,
            'failed_emails': failed_emails
        }
