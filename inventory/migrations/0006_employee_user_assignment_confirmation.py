from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("inventory", "0005_alter_employee_department"),
    ]

    operations = [
        migrations.AddField(
            model_name="employee",
            name="user",
            field=models.OneToOneField(
                blank=True,
                help_text="User account that can access the employee portal.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="employee",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="assignment",
            name="confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="assignment",
            name="confirmed_by_employee",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="assignment",
            index=models.Index(
                fields=["employee", "confirmed_by_employee"],
                name="assignment_emp_confirm_idx",
            ),
        ),
    ]
