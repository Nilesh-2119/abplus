import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plms_backend.settings')
application = get_wsgi_application()

# Auto-create default admin superuser if it doesn't exist
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123',
            role='SUPER_ADMIN'
        )
        print("Superuser 'admin' created successfully.")
    else:
        print("Superuser 'admin' already exists.")
except Exception as e:
    import sys
    print(f"Could not auto-create superuser: {e}", file=sys.stderr)

