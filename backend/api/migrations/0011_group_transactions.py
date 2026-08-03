import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("api", "0010_quotation_quotationitem")]

    operations = [
        migrations.DeleteModel(name="Purchase"),
        migrations.DeleteModel(name="Sale"),
        migrations.CreateModel(
            name="Purchase",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="purchases", to="api.company")),
                ("party", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="purchases", to="api.party")),
                ("salesman", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="purchases", to="api.salesman")),
            ],
        ),
        migrations.CreateModel(
            name="Sale",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sales", to="api.company")),
                ("party", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sales", to="api.party")),
                ("salesman", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sales", to="api.salesman")),
            ],
        ),
        migrations.CreateModel(
            name="PurchaseItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.DecimalField(decimal_places=2, max_digits=12)),
                ("price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("purchase", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="api.purchase")),
                ("variant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="purchases", to="api.itemvariant")),
            ],
        ),
        migrations.CreateModel(
            name="SaleItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.DecimalField(decimal_places=2, max_digits=12)),
                ("sale_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("purchase_price_snapshot", models.DecimalField(decimal_places=2, max_digits=12)),
                ("sale", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="api.sale")),
                ("variant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sales", to="api.itemvariant")),
            ],
        ),
    ]
