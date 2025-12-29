"""
Flask Application Entry Point.
"""

import os
import subprocess
import sys
import webbrowser
import threading
import time
import socket
from app import create_app
from app.config import config

# Create application instance
env = os.getenv('FLASK_ENV', 'development')
app = create_app(config.get(env, config['default']))


def find_available_port(start_port: int = 3000, max_attempts: int = 20) -> int:
    """Kullanılabilir bir port bulur."""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    return start_port  # Fallback


def open_browser(url: str, delay: float = 2.5):
    """Tarayıcıyı belirli bir gecikme sonrası açar."""
    time.sleep(delay)
    webbrowser.open(url)


def start_frontend() -> int:
    """Frontend dev sunucusunu başlatır ve port numarasını döner."""
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    frontend_port = find_available_port(3000)
    
    if os.path.exists(frontend_dir):
        try:
            # Windows için
            if sys.platform == 'win32':
                subprocess.Popen(
                    ['npm', 'run', 'dev'],
                    cwd=frontend_dir,
                    shell=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
            else:
                subprocess.Popen(
                    ['npm', 'run', 'dev'],
                    cwd=frontend_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            print(f"  [OK] Frontend dev sunucusu baslatiliyor (http://localhost:{frontend_port})")
            return frontend_port
        except Exception as e:
            print(f"  [X] Frontend baslatilamadi: {e}")
    else:
        print("  [!] Frontend klasoru bulunamadi")
    
    return frontend_port


if __name__ == '__main__':
    # Get configuration from environment
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
    open_browser_flag = os.getenv('OPEN_BROWSER', 'True').lower() in ('true', '1', 'yes')
    start_frontend_flag = os.getenv('START_FRONTEND', 'True').lower() in ('true', '1', 'yes')
    
    # Frontend portunu hesapla
    frontend_port = find_available_port(3000) if start_frontend_flag else 3000
    
    print(f"""
+--------------------------------------------------------------+
|           Ogrenci Kocluk Sistemi - Flask Backend             |
+--------------------------------------------------------------+
|  Environment: {app.config.get('ENV', 'development'):<44} |
|  Debug Mode:  {str(debug):<44} |
|  Backend:     http://{host}:{port:<39} |
|  API Docs:    http://{host}:{port}/api/v1/docs{' '*21} |
|  Frontend:    http://localhost:{frontend_port:<28} |
+--------------------------------------------------------------+
    """)
    
    # Frontend'i başlat
    if start_frontend_flag:
        actual_port = start_frontend()
        frontend_port = actual_port
    
    # Tarayıcıyı aç (ayrı thread'de)
    if open_browser_flag:
        frontend_url = f"http://localhost:{frontend_port}"
        browser_thread = threading.Thread(target=open_browser, args=(frontend_url,))
        browser_thread.daemon = True
        browser_thread.start()
        print(f"  [OK] Tarayici aciliyor: {frontend_url}")
    
    print()
    
    app.run(host=host, port=port, debug=debug)
