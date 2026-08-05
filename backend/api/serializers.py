from django.db import transaction
from rest_framework import serializers

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from .models import (
    Company,
    ContactMessage,
    Item,
    Party,
    Quotation,
    QuotationItem,
    Salesman,
    ItemVariant,
    Purchase,
    PurchaseItem,
    Sale,
    SaleItem,
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


class CompanyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["name", "first_name", "last_name", "phone"]
        extra_kwargs = {
            "name": {"required": False},
            "phone": {"required": False},
        }


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
        fields = ["id", "name", "contact", "party_type"]


class ItemVariantSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    last_purchase_salesman = serializers.SerializerMethodField()

    class Meta:
        model = ItemVariant
        fields = [
            "id",
            "item",
            "item_name",
            "size",
            "price",
            "current_stock_qty",
            "last_purchase_salesman",
        ]

    def get_last_purchase_salesman(self, obj):
        latest = next(iter(obj.recent_purchases), None)
        if latest and latest.purchase.salesman:
            return latest.purchase.salesman.name
        return None


class PurchaseLineSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    item_name = serializers.CharField(write_only=True, required=False)
    size = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = PurchaseItem
        fields = ["id", "item_name", "size", "quantity", "price"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["item_name"] = instance.variant.item.name
        data["size"] = instance.variant.size
        data["price"] = str(instance.variant.price)
        return data


class SaleLineSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    item_id = serializers.IntegerField(source="variant.item_id", read_only=True)
    item_name = serializers.CharField(source="variant.item.name", read_only=True)
    size = serializers.CharField(source="variant.size", read_only=True)
    variant_price = serializers.DecimalField(
        source="variant.price", max_digits=12, decimal_places=2, read_only=True
    )
    current_stock_qty = serializers.DecimalField(
        source="variant.current_stock_qty",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    cost_price_at_sale = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            "id",
            "item_id",
            "variant",
            "item_name",
            "size",
            "variant_price",
            "current_stock_qty",
            "quantity",
            "sale_price",
            "cost_price_at_sale",
            "profit",
        ]
        read_only_fields = ["cost_price_at_sale", "profit"]


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseLineSerializer(many=True, allow_empty=False)
    salesman_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, allow_null=True
    )
    party_name = serializers.CharField(write_only=True)
    party_contact = serializers.CharField(write_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id",
            "items",
            "salesman_name",
            "party_name",
            "party_contact",
            "date",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def _header(self, validated_data):
        company = self.context["request"].user
        salesman_name = (validated_data.pop("salesman_name", None) or "").strip()
        salesman = None
        if salesman_name:
            salesman, _ = Salesman.objects.get_or_create(
                company=company,
                name__iexact=salesman_name,
                defaults={"name": salesman_name},
            )

        party_name = validated_data.pop("party_name").strip()
        party_contact = validated_data.pop("party_contact").strip()
        # Prefer existing purchase-type party; create if missing
        party = Party.objects.filter(
            company=company,
            name__iexact=party_name,
            party_type=Party.PARTY_TYPE_PURCHASE,
        ).first()
        if not party:
            party = Party.objects.create(
                company=company,
                name=party_name,
                contact=party_contact,
                party_type=Party.PARTY_TYPE_PURCHASE,
            )
        else:
            if party_contact and party_contact != party.contact:
                party.contact = party_contact
                party.save()
        return company, party, salesman

    def create(self, validated_data):
        items = validated_data.pop("items")
        company, party, salesman = self._header(validated_data)
        with transaction.atomic():
            purchase = Purchase.objects.create(
                company=company,
                party=party,
                salesman=salesman,
                date=validated_data["date"],
            )
            for item_data in items:
                item_name = (item_data.get("item_name") or "").strip()
                size = (item_data.get("size") or "").strip()
                if not item_name or not size:
                    raise DRFValidationError("Each item requires item_name and size.")
                item, _ = Item.objects.get_or_create(
                    company=company,
                    name__iexact=item_name,
                    defaults={"name": item_name},
                )
                variant, _ = ItemVariant.objects.get_or_create(
                    item=item,
                    size__iexact=size,
                    price=item_data["price"],
                    defaults={"size": size, "price": item_data["price"]},
                )
                PurchaseItem.objects.create(
                    purchase=purchase,
                    variant=variant,
                    quantity=item_data["quantity"],
                    price=item_data["price"],
                )
        return purchase

    def update(self, instance, validated_data):
        items = validated_data.pop("items")
        company, party, salesman = self._header(validated_data)
        with transaction.atomic():
            instance.party = party
            instance.salesman = salesman
            instance.date = validated_data["date"]
            instance.save(update_fields=["party", "salesman", "date"])

            existing_items = {
                item.id: item
                for item in instance.items.select_related("variant", "variant__item")
            }
            submitted_ids = set()

            for item_data in items:
                item_name = (item_data.get("item_name") or "").strip()
                size = (item_data.get("size") or "").strip()
                if not item_name or not size:
                    raise DRFValidationError("Each item requires item_name and size.")
                item, _ = Item.objects.get_or_create(
                    company=company,
                    name__iexact=item_name,
                    defaults={"name": item_name},
                )
                variant, _ = ItemVariant.objects.get_or_create(
                    item=item,
                    size__iexact=size,
                    price=item_data["price"],
                    defaults={"size": size, "price": item_data["price"]},
                )

                item_id = item_data.get("id")
                old_item = existing_items.get(item_id) if item_id else None
                if old_item:
                    submitted_ids.add(old_item.id)
                    try:
                        if old_item.variant_id == variant.id:
                            old_item.variant.adjust_purchase(
                                old_item.quantity, item_data["quantity"]
                            )
                        else:
                            old_item.variant.remove_purchase_effect(old_item.quantity)
                            variant.record_purchase(item_data["quantity"])
                    except DjangoValidationError as exc:
                        raise DRFValidationError(exc.message)

                    old_item.variant = variant
                    old_item.quantity = item_data["quantity"]
                    old_item.price = item_data["price"]
                    old_item.save(update_fields=["variant", "quantity", "price"])
                else:
                    PurchaseItem.objects.create(
                        purchase=instance,
                        variant=variant,
                        quantity=item_data["quantity"],
                        price=item_data["price"],
                    )

            for old_item in existing_items.values():
                if old_item.id not in submitted_ids:
                    try:
                        old_item.variant.remove_purchase_effect(
                            old_item.quantity, old_item.price
                        )
                    except DjangoValidationError as exc:
                        raise DRFValidationError(exc.message)
                    old_item.delete()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["salesman_name"] = instance.salesman.name if instance.salesman else None
        data["party_name"] = instance.party.name if instance.party else None
        data["party_contact"] = instance.party.contact if instance.party else None
        return data


class SaleSerializer(serializers.ModelSerializer):
    items = SaleLineSerializer(many=True, allow_empty=False)
    salesman_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, allow_null=True
    )
    party_name = serializers.CharField(write_only=True)
    party_contact = serializers.CharField(write_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "items",
            "salesman_name",
            "party_name",
            "party_contact",
            "date",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        company = self.context["request"].user
        items = validated_data.pop("items")
        salesman_name = (validated_data.pop("salesman_name", None) or "").strip()
        salesman = None
        if salesman_name:
            salesman, _ = Salesman.objects.get_or_create(
                company=company,
                name__iexact=salesman_name,
                defaults={"name": salesman_name},
            )
        party_name = validated_data.pop("party_name").strip()
        party_contact = validated_data.pop("party_contact").strip()
        party = Party.objects.filter(
            company=company,
            name__iexact=party_name,
            party_type=Party.PARTY_TYPE_SALE,
        ).first()
        if not party:
            party = Party.objects.create(
                company=company,
                name=party_name,
                contact=party_contact,
                party_type=Party.PARTY_TYPE_SALE,
            )
        else:
            if party_contact and party_contact != party.contact:
                party.contact = party_contact
                party.save()

        try:
            with transaction.atomic():
                sale = Sale.objects.create(
                    company=company,
                    party=party,
                    salesman=salesman,
                    date=validated_data["date"],
                )
                for item_data in items:
                    variant = item_data["variant"]
                    if variant.item.company_id != company.id:
                        raise DRFValidationError("Invalid variant.")
                    SaleItem.objects.create(
                        sale=sale,
                        variant=variant,
                        quantity=item_data["quantity"],
                        sale_price=item_data["sale_price"],
                    )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message)
        return sale

    def update(self, instance, validated_data):
        company = self.context["request"].user
        items = validated_data.pop("items")
        salesman_name = (validated_data.pop("salesman_name", None) or "").strip()
        salesman = None
        if salesman_name:
            salesman, _ = Salesman.objects.get_or_create(
                company=company,
                name__iexact=salesman_name,
                defaults={"name": salesman_name},
            )
        party_name = validated_data.pop("party_name").strip()
        party_contact = validated_data.pop("party_contact").strip()
        party = Party.objects.filter(
            company=company,
            name__iexact=party_name,
            party_type=Party.PARTY_TYPE_SALE,
        ).first()
        if not party:
            party = Party.objects.create(
                company=company,
                name=party_name,
                contact=party_contact,
                party_type=Party.PARTY_TYPE_SALE,
            )
        else:
            if party_contact and party_contact != party.contact:
                party.contact = party_contact
                party.save()

        try:
            with transaction.atomic():
                existing_items = {
                    item.id: item for item in instance.items.select_related("variant")
                }

                # Temporarily restore all stock consumed by the existing sale.
                # Existing snapshots are retained and are never recalculated.
                for old_item in existing_items.values():
                    old_item.variant.remove_sale_effect(old_item.quantity)

                instance.party = party
                instance.salesman = salesman
                instance.date = validated_data["date"]
                instance.save(update_fields=["party", "salesman", "date"])
                submitted_ids = set()
                for item_data in items:
                    variant = item_data["variant"]
                    if variant.item.company_id != company.id:
                        raise DRFValidationError("Invalid variant.")

                    item_id = item_data.get("id")
                    old_item = existing_items.get(item_id) if item_id else None
                    if old_item:
                        submitted_ids.add(old_item.id)
                        if old_item.variant_id != variant.id:
                            raise DRFValidationError(
                                "A sale item's item/size cannot be changed after creation."
                            )
                        old_item.quantity = item_data["quantity"]
                        old_item.sale_price = item_data["sale_price"]
                        old_item.variant.record_sale(old_item.quantity)
                        old_item.save(update_fields=["quantity", "sale_price"])
                    else:
                        SaleItem.objects.create(
                            sale=instance,
                            variant=variant,
                            quantity=item_data["quantity"],
                            sale_price=item_data["sale_price"],
                        )

                # Lines removed from the edited sale are no longer part of it.
                for old_item in existing_items.values():
                    if old_item.id not in submitted_ids:
                        old_item.delete()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message)
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["salesman_name"] = instance.salesman.name if instance.salesman else None
        data["party_name"] = instance.party.name if instance.party else None
        data["party_contact"] = instance.party.contact if instance.party else None
        items = list(instance.items.all())
        data["total_quantity"] = sum((item.quantity for item in items), 0)
        data["total_sales"] = sum(
            (item.quantity * item.sale_price for item in items), 0
        )
        data["profit"] = sum((item.profit for item in items), 0)
        return data


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["id", "message", "created_at"]
        read_only_fields = ["created_at"]


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = ["id", "description", "qty", "price"]


class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True)
    party_name = serializers.CharField(write_only=True)
    party_contact = serializers.CharField(write_only=True)
    sub_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    vat_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    grand_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = Quotation
        fields = [
            "id",
            "party_name",
            "party_contact",
            "date",
            "vat_percent",
            "advance_percent",
            "items",
            "sub_total",
            "vat_amount",
            "grand_total",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["party_name"] = instance.party.name if instance.party else None
        data["party_contact"] = instance.party.contact if instance.party else None
        return data

    def _resolve_party(self, company, party_name, party_contact):
        party_name = party_name.strip()
        party_contact = party_contact.strip()
        party = Party.objects.filter(
            company=company,
            name__iexact=party_name,
            party_type=Party.PARTY_TYPE_SALE,
        ).first()
        if not party:
            party = Party.objects.create(
                company=company,
                name=party_name,
                contact=party_contact,
                party_type=Party.PARTY_TYPE_SALE,
            )
        else:
            if party_contact and party_contact != party.contact:
                party.contact = party_contact
                party.save()
        return party

    def create(self, validated_data):
        company = self.context["request"].user
        items_data = validated_data.pop("items")
        party = self._resolve_party(
            company,
            validated_data.pop("party_name"),
            validated_data.pop("party_contact"),
        )

        quotation = Quotation.objects.create(
            company=company, party=party, **validated_data
        )
        for item in items_data:
            QuotationItem.objects.create(quotation=quotation, **item)
        return quotation

    def update(self, instance, validated_data):
        company = self.context["request"].user
        items_data = validated_data.pop("items", None)

        if "party_name" in validated_data:
            instance.party = self._resolve_party(
                company,
                validated_data.pop("party_name"),
                validated_data.pop("party_contact", ""),
            )

        for attr in ["date", "vat_percent", "advance_percent"]:
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                QuotationItem.objects.create(quotation=instance, **item)

        return instance
