import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import BackgroundTasks
from app.config import get_settings
import os

settings = get_settings()

class EmailService:
    @staticmethod
    def send_email_sync(to_email: str, subject: str, body_html: str):
        """Envía un correo de forma síncrona. Si no hay credenciales, simula el envío."""
        smtp_user = settings.SMTP_USER
        smtp_password = settings.SMTP_PASSWORD
        
        # Modo simulación
        if not smtp_user or not smtp_password:
            sim_content = (
                f"==================================================\n"
                f"📧 [SIMULACIÓN CORREO ELECTRONICO]\n"
                f"Para: {to_email}\n"
                f"Asunto: {subject}\n"
                f"Remitente: {settings.SMTP_FROM_EMAIL}\n"
                f"--------------------------------------------------\n"
                f"Contenido:\n{body_html}\n"
                f"==================================================\n"
            )
            print(sim_content)
            
            # Guardar en log de mantenimiento para auditoría local
            log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "maintenance")
            if not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
            with open(os.path.join(log_dir, "email_simulation.log"), "a", encoding="utf-8") as f:
                f.write(sim_content)
            return True

        # Enviar correo real por SMTP
        try:
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_FROM_EMAIL
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body_html, 'html', 'utf-8'))
            
            # Conectar al servidor SMTP
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_TLS:
                server.starttls()
            
            server.login(smtp_user, smtp_password)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
            server.quit()
            print(f"✅ Correo enviado con éxito a {to_email}")
            return True
        except Exception as e:
            import traceback
            print(f"❌ Error al enviar correo SMTP a {to_email}: {e}")
            traceback.print_exc()
            return False

    @classmethod
    def send_email_async(cls, to_email: str, subject: str, body_html: str, background_tasks: BackgroundTasks):
        """Registra el envío del correo como tarea en segundo plano."""
        background_tasks.add_task(cls.send_email_sync, to_email, subject, body_html)
