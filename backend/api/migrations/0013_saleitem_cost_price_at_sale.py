from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0012_itemvariant_size"),
    ]

    operations = [
        migrations.RenameField(
            model_name="saleitem",
            old_name="purchase_price_snapshot",
            new_name="cost_price_at_sale",
        ),
    ]
