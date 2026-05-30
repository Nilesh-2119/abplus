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

# Run collectstatic programmatically on startup if not already collected
try:
    from pathlib import Path
    base_dir = Path(__file__).resolve().parent.parent
    staticfiles_dir = base_dir / 'staticfiles'
    
    needs_collect = True
    if staticfiles_dir.exists():
        # Django admin has hundreds of static files, so > 10 is a safe threshold
        files = list(staticfiles_dir.glob('**/*'))
        if len(files) > 10:
            needs_collect = False
            
    if needs_collect:
        from django.core.management import call_command
        print("Running collectstatic programmatically...")
        call_command('collectstatic', interactive=False, verbosity=1)
        print("Static files collected successfully programmatically.")
    else:
        print("Static files already collected. Skipping.")
except Exception as e:
    import sys
    print(f"Error running collectstatic programmatically: {e}", file=sys.stderr)

# Debug staticfiles directory
try:
    from pathlib import Path
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
    import sys
    print(f"DEBUG: Error scanning staticfiles: {e}", file=sys.stderr)



