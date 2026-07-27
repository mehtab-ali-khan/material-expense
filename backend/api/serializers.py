from rest_framework import serializers

from .models import Company, Item, Salesman, ItemVariant, Purchase


class CompanySignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        company = Company(name=validated_data["name"])
        company.set_password(validated_data["password"])
        company.save()
        return company


class CompanyLoginSerializer(serializers.Serializer):
    name = serializers.CharField()
    password = serializers.CharField(write_only=True)


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ["id", "name"]


class SalesmanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salesman
        fields = ["id", "name"]


class ItemVariantSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = ItemVariant
        fields = [
            "id",
            "item",
            "item_name",
            "length",
            "measurement",
            "current_stock_qty",
            "avg_purchase_price",
        ]


class PurchaseSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(write_only=True)
    length = serializers.CharField(write_only=True)
    measurement = serializers.CharField(write_only=True)
    salesman_name = serializers.CharField(write_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id",
            "item_name",
            "length",
            "measurement",
            "salesman_name",
            "quantity",
            "price",
            "date",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def create(self, validated_data):
        company = self.context["request"].user

        item, _ = Item.objects.get_or_create(
            company=company,
            name__iexact=validated_data["item_name"].strip(),
            defaults={"name": validated_data["item_name"].strip()},
        )
        variant, _ = ItemVariant.objects.get_or_create(
            item=item,
            length__iexact=validated_data["length"].strip(),
            measurement__iexact=validated_data["measurement"].strip(),
            defaults={
                "length": validated_data["length"].strip(),
                "measurement": validated_data["measurement"].strip(),
            },
        )
        salesman, _ = Salesman.objects.get_or_create(
            company=company,
            name__iexact=validated_data["salesman_name"].strip(),
            defaults={"name": validated_data["salesman_name"].strip()},
        )

        return Purchase.objects.create(
            variant=variant,
            salesman=salesman,
            quantity=validated_data["quantity"],
            price=validated_data["price"],
            date=validated_data["date"],
        )
