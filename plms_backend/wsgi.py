import os
import django
import sys
from pathlib import Path

# Set settings module and initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plms_backend.settings')
django.setup()

# 1. Run collectstatic programmatically on startup if not already collected
# This must happen BEFORE get_wsgi_application() so WhiteNoiseMiddleware finds the files on initialization.
try:
    base_dir = Path(__file__).resolve().parent.parent
    staticfiles_dir = base_dir / 'staticfiles'
    
    needs_collect = True
    if staticfiles_dir.exists():
        files = list(staticfiles_dir.glob('**/*'))
        if len(files) > 10:
            needs_collect = False
            
    if needs_collect:
        from django.core.management import call_command
        print("Running collectstatic programmatically before WSGI init...")
        call_command('collectstatic', interactive=False, verbosity=1)
        print("Static files collected successfully programmatically.")
    else:
        print("Static files already collected. Skipping.")
except Exception as e:
    print(f"Error running collectstatic programmatically: {e}", file=sys.stderr)

# 2. Auto-create default admin superuser if it doesn't exist
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@example.com',
            'role': 'SUPER_ADMIN',
            'is_staff': True,
            'is_superuser': True
        }
    )
    if created:
        user.set_password('admin123')
        user.save()
        print("Superuser 'admin' created successfully.")
    else:
        print("Superuser 'admin' already exists. Skipping setup.")
except Exception as e:
    print(f"Could not auto-create superuser: {e}", file=sys.stderr)



# 3. Debug staticfiles directory
try:
    base_dir = Path(__file__).resolve().parent.parent
    staticfiles_dir = base_dir / 'staticfiles'
    print(f"DEBUG: BASE_DIR resolves to {base_dir}")
    print(f"DEBUG: staticfiles_dir resolves to {staticfiles_dir}")
    if staticfiles_dir.exists():
        files = list(staticfiles_dir.glob('**/*'))
        print(f"DEBUG: staticfiles folder exists with {len(files)} files/folders.")
        if len(files) > 0:
            print(f"DEBUG: Sample files: {[str(f.relative_to(staticfiles_dir)) for f in files[:10]]}")
    else:
        print("DEBUG: staticfiles folder DOES NOT EXIST.")
except Exception as e:
    print(f"DEBUG: Error scanning staticfiles: {e}", file=sys.stderr)

# 4. Now initialize WSGI application (WhiteNoise middleware will read from the populated staticfiles directory)
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()




