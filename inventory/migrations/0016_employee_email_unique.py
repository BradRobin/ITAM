from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0015_track_created_by_on_activity_models"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employee",
            name="email",
            field=models.EmailField(max_length=254, unique=True),
        ),
    ]
