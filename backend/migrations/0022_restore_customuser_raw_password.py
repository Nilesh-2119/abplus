from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0021_alter_labtest_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='raw_password',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
