from rest_framework import serializers

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from .models import (
    Company,
    ContactMessage,
    Item,
    Party,
    Salesman,
    ItemVariant,
    Purchase,
    Sale,
)


class CompanySignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "password", "first_name", "last_name", "phone"]
        extra_kwargs = {
            "password": {"write_only": True},
            "phone": {"required": True},
        }

    def create(self, validated_data):
        company = Company(
            name=validated_data["name"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone=validated_data["phone"],
        )
        company.set_password(validated_data["password"])
        company.save()
        return company


class CompanyLoginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True)


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ["id", "name"]


class SalesmanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salesman
        fields = ["id", "name"]


class PartySerializer(serializers.ModelSerializer):
    class Meta:
        model = Party
        fields = ["id", "name", "contact"]


class ItemVariantSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = ItemVariant
        fields = [
            "id",
            "item",
            "item_name",
            "length",
            "current_stock_qty",
            "avg_purchase_price",
        ]


class PurchaseSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(write_only=True)
    length = serializers.CharField(write_only=True)
    salesman_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, allow_null=True
    )
    party_name = serializers.CharField(write_only=True)
    party_contact = serializers.CharField(write_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id",
            "item_name",
            "length",
            "salesman_name",
            "party_name",
            "party_contact",
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
        data["salesman_name"] = instance.salesman.name if instance.salesman else None
        data["party_name"] = instance.party.name if instance.party else None
        data["party_contact"] = instance.party.contact if instance.party else None
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
            defaults={"length": validated_data["length"].strip()},
        )
        salesman_name = (validated_data.get("salesman_name") or "").strip()
        salesman = None
        if salesman_name:
            salesman, _ = Salesman.objects.get_or_create(
                company=company,
                name__iexact=salesman_name,
                defaults={"name": salesman_name},
            )
        party_name = validated_data["party_name"].strip()
        party_contact = validated_data["party_contact"].strip()

        party, created = Party.objects.get_or_create(
            company=company,
            name__iexact=party_name,
            defaults={"name": party_name, "contact": party_contact},
        )
        if not created and party_contact and party_contact != party.contact:
            party.contact = party_contact
            party.save()

        return Purchase.objects.create(
            variant=variant,
            salesman=salesman,
            party=party,
            quantity=validated_data["quantity"],
            price=validated_data["price"],
            date=validated_data["date"],
        )


class SaleSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="variant.item.name", read_only=True)
    length = serializers.CharField(source="variant.length", read_only=True)
    salesman_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, allow_null=True
    )
    party_name = serializers.CharField(write_only=True)
    party_contact = serializers.CharField(write_only=True)
    profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "variant",
            "item_name",
            "length",
            "salesman_name",
            "party_name",
            "party_contact",
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
        data["party_name"] = instance.party.name if instance.party else None
        data["party_contact"] = instance.party.contact if instance.party else None
        return data

    def create(self, validated_data):
        company = self.context["request"].user
        variant = validated_data["variant"]

        if variant.item.company_id != company.id:
            raise DRFValidationError("Invalid variant.")

        salesman_name = (validated_data.get("salesman_name") or "").strip()
        salesman = None
        if salesman_name:
            salesman, _ = Salesman.objects.get_or_create(
                company=company,
                name__iexact=salesman_name,
                defaults={"name": salesman_name},
            )
        party_name = validated_data["party_name"].strip()
        party_contact = validated_data["party_contact"].strip()

        party, created = Party.objects.get_or_create(
            company=company,
            name__iexact=party_name,
            defaults={"name": party_name, "contact": party_contact},
        )
        if not created and party_contact and party_contact != party.contact:
            party.contact = party_contact
            party.save()

        sale = Sale(
            variant=variant,
            salesman=salesman,
            party=party,
            quantity=validated_data["quantity"],
            sale_price=validated_data["sale_price"],
            date=validated_data["date"],
        )

        try:
            sale.save()
        except DjangoValidationError as e:
            raise DRFValidationError(e.message)

        return sale


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["id", "message", "created_at"]
        read_only_fields = ["created_at"]
