from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0007_employeenotification"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignment",
            name="expected_return_date",
            field=models.DateField(
                blank=True,
                help_text="Expected date the asset should be returned.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="maintenancelog",
            name="expected_completion_date",
            field=models.DateField(
                blank=True,
                help_text="Estimated date when maintenance will be completed.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="maintenancelog",
            name="repair_shop",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="maintenancelog",
            name="worker_contact",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Phone number or email for the maintenance worker.",
                max_length=255,
            ),
        ),
    ]
