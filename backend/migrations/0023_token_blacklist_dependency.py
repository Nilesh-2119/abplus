# Migration 0023: Add JWT token blacklist dependency
# SECURITY FIX (VULN-06): Enables proper token rotation and blacklisting.
# rest_framework_simplejwt.token_blacklist tables are needed for ROTATE_REFRESH_TOKENS=True.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0022_remove_customuser_raw_password'),
        ('token_blacklist', '0012_alter_outstandingtoken_user'),
    ]

    operations = [
        # No schema changes needed — just ensures token_blacklist tables exist
    ]
