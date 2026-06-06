# Migration 0022: Remove raw_password field from CustomUser
# SECURITY FIX (VULN-01): Plaintext password storage was a critical vulnerability.
# Passwords are now stored only as PBKDF2 hashes via Django's set_password().

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0021_alter_labtest_options_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='raw_password',
        ),
    ]
