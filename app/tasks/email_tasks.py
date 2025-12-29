"""
Email task workers for background processing.
"""

from celery import shared_task
from flask import current_app, render_template_string


@shared_task(bind=True, max_retries=3)
def send_email_task(self, to: str, subject: str, template_name: str, context: dict):
    """
    Send email asynchronously.
    
    Args:
        to: Recipient email address
        subject: Email subject
        template_name: Template name to render
        context: Template context variables
    """
    try:
        from app.extensions import mail
        from flask_mail import Message
        
        # Get template content
        template_content = get_email_template(template_name)
        html_body = render_template_string(template_content, **context)
        
        msg = Message(
            subject=subject,
            recipients=[to],
            html=html_body,
            sender=current_app.config.get('MAIL_DEFAULT_SENDER')
        )
        
        mail.send(msg)
        
        return {'success': True, 'to': to, 'subject': subject}
        
    except Exception as e:
        # Retry with exponential backoff
        self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task
def send_bulk_email_task(recipients: list, subject: str, template_name: str, context: dict):
    """Send bulk emails to multiple recipients."""
    results = []
    
    for recipient in recipients:
        result = send_email_task.delay(recipient, subject, template_name, context)
        results.append({'recipient': recipient, 'task_id': result.id})
    
    return results


@shared_task
def send_password_reset_email_task(user_email: str, reset_url: str):
    """Send password reset email."""
    context = {
        'reset_url': reset_url,
        'expiry_hours': 24
    }
    
    return send_email_task.delay(
        to=user_email,
        subject='Şifre Sıfırlama Talebi',
        template_name='password_reset',
        context=context
    )


@shared_task
def send_welcome_email_task(user_email: str, user_name: str):
    """Send welcome email to new users."""
    context = {
        'user_name': user_name,
        'login_url': current_app.config.get('FRONTEND_URL', '') + '/login'
    }
    
    return send_email_task.delay(
        to=user_email,
        subject='Öğrenci Koçluk Sistemine Hoş Geldiniz!',
        template_name='welcome',
        context=context
    )


@shared_task
def send_enrollment_notification_task(user_email: str, course_title: str, teacher_name: str):
    """Send course enrollment notification."""
    context = {
        'course_title': course_title,
        'teacher_name': teacher_name
    }
    
    return send_email_task.delay(
        to=user_email,
        subject=f'Kursa Kayıt: {course_title}',
        template_name='enrollment',
        context=context
    )


@shared_task
def send_exam_result_email_task(user_email: str, exam_title: str, score: float, passed: bool):
    """Send exam result notification."""
    context = {
        'exam_title': exam_title,
        'score': score,
        'passed': passed,
        'status': 'Geçti' if passed else 'Kaldı'
    }
    
    return send_email_task.delay(
        to=user_email,
        subject=f'Sınav Sonucu: {exam_title}',
        template_name='exam_result',
        context=context
    )


def get_email_template(template_name: str) -> str:
    """Get email template content."""
    templates = {
        'password_reset': '''
            <h2>Şifre Sıfırlama</h2>
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
            <a href="{{ reset_url }}">Şifremi Sıfırla</a>
            <p>Bu bağlantı {{ expiry_hours }} saat geçerlidir.</p>
        ''',
        'welcome': '''
            <h2>Hoş Geldiniz, {{ user_name }}!</h2>
            <p>Öğrenci Koçluk Sistemine kayıt olduğunuz için teşekkür ederiz.</p>
            <a href="{{ login_url }}">Giriş Yap</a>
        ''',
        'enrollment': '''
            <h2>Kursa Kaydınız Tamamlandı</h2>
            <p><strong>{{ course_title }}</strong> kursuna başarıyla kaydoldunuz.</p>
            <p>Eğitmen: {{ teacher_name }}</p>
        ''',
        'exam_result': '''
            <h2>Sınav Sonucunuz</h2>
            <p><strong>{{ exam_title }}</strong> sınavından aldığınız puan: {{ score }}%</p>
            <p>Durum: <strong>{{ status }}</strong></p>
        ''',
    }
    
    return templates.get(template_name, '<p>{{ content }}</p>')
