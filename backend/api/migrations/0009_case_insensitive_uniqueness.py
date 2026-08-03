from django.db import migrations, models
from django.db.models.functions import Lower


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_party_purchase_party_sale_party"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="party",
            constraint=models.UniqueConstraint(
                Lower("name"), "company", name="party_company_name_ci_unique"
            ),
        ),
        migrations.AddConstraint(
            model_name="item",
            constraint=models.UniqueConstraint(
                Lower("name"), "company", name="item_company_name_ci_unique"
            ),
        ),
        migrations.AddConstraint(
            model_name="salesman",
            constraint=models.UniqueConstraint(
                Lower("name"), "company", name="salesman_company_name_ci_unique"
            ),
        ),
        migrations.AddConstraint(
            model_name="itemvariant",
            constraint=models.UniqueConstraint(
                Lower("length"), "item", name="variant_item_length_ci_unique"
            ),
        ),
    ]
