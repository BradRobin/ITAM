import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="date_created",
            field=models.DateField(default=django.utils.timezone.now),
        ),
    ]
