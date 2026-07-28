from rest_framework import serializers

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from .models import Company, Item, Salesman, ItemVariant, Purchase, Sale


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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["item_name"] = instance.variant.item.name
        data["length"] = instance.variant.length
        data["measurement"] = instance.variant.measurement
        data["salesman_name"] = instance.salesman.name if instance.salesman else None
        return data

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


class SaleSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="variant.item.name", read_only=True)
    length = serializers.CharField(source="variant.length", read_only=True)
    measurement = serializers.CharField(source="variant.measurement", read_only=True)
    salesman_name = serializers.CharField(write_only=True)
    profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "variant",
            "item_name",
            "length",
            "measurement",
            "salesman_name",
            "quantity",
            "sale_price",
            "purchase_price_snapshot",
            "profit",
            "date",
            "created_at",
        ]
        read_only_fields = ["purchase_price_snapshot", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["salesman_name"] = instance.salesman.name if instance.salesman else None
        return data

    def create(self, validated_data):
        company = self.context["request"].user
        variant = validated_data["variant"]

        if variant.item.company_id != company.id:
            raise DRFValidationError("Invalid variant.")

        salesman, _ = Salesman.objects.get_or_create(
            company=company,
            name__iexact=validated_data["salesman_name"].strip(),
            defaults={"name": validated_data["salesman_name"].strip()},
        )

        sale = Sale(
            variant=variant,
            salesman=salesman,
            quantity=validated_data["quantity"],
            sale_price=validated_data["sale_price"],
            date=validated_data["date"],
        )

        try:
            sale.save()
        except DjangoValidationError as e:
            raise DRFValidationError(e.message)

        return sale
