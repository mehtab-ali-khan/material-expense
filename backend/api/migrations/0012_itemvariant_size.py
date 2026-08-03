from django.db import migrations, models
from django.db.models.functions import Lower


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0011_group_transactions"),
        ("api", "0009_case_insensitive_uniqueness"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="itemvariant",
            name="variant_item_length_ci_unique",
        ),
        migrations.RenameField(
            model_name="itemvariant",
            old_name="length",
            new_name="size",
        ),
        migrations.AlterUniqueTogether(
            name="itemvariant",
            unique_together={("item", "size")},
        ),
        migrations.AddConstraint(
            model_name="itemvariant",
            constraint=models.UniqueConstraint(
                Lower("size"),
                "item",
                name="variant_item_size_ci_unique",
            ),
        ),
    ]
