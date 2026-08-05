from decimal import Decimal
import secrets

from django.db import models
from django.db.models import F, Sum
from django.db.models.functions import Lower
from django.db import transaction
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError


import re


def normalize_phone(raw):
    """
    Normalize a phone number by stripping formatting characters only.
    Keeps digits as typed, and preserves a leading '+' if present.
    Examples:
      "+92 308 8253383"   -> "+923088253383"
      "0308-825-3383"      -> "03088253383"
      "(555) 123-4567"     -> "5551234567"
      "923088253383"       -> "923088253383"
    """
    if not raw:
        return raw

    raw = raw.strip()
    has_plus = raw.startswith("+")
    digits = re.sub(r"\D", "", raw)
    return f"+{digits}" if has_plus else digits


class Company(models.Model):
    name = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    first_name = models.CharField(max_length=150, blank=True, default="")
    last_name = models.CharField(max_length=150, blank=True, default="")
    phone = models.CharField(max_length=32, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_authenticated(self):
        return True

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        if self.phone:
            self.phone = normalize_phone(self.phone)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CompanyToken(models.Model):
    company = models.OneToOneField(
        Company, on_delete=models.CASCADE, related_name="token"
    )
    key = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(32)
        super().save(*args, **kwargs)


class Party(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="parties"
    )
    name = models.CharField(max_length=255)
    contact = models.CharField(max_length=32)
    PARTY_TYPE_PURCHASE = "purchase"
    PARTY_TYPE_SALE = "sale"
    PARTY_TYPE_CHOICES = [
        (PARTY_TYPE_PURCHASE, "Purchase"),
        (PARTY_TYPE_SALE, "Sale"),
    ]
    party_type = models.CharField(max_length=10, choices=PARTY_TYPE_CHOICES, null=True)

    class Meta:
        unique_together = ("company", "name", "party_type")
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "company",
                "party_type",
                name="party_company_name_type_ci_unique",
            )
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        self.contact = self.contact.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.contact})"


class Item(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=255)

    class Meta:
        unique_together = ("company", "name")
        constraints = [
            models.UniqueConstraint(
                Lower("name"), "company", name="item_company_name_ci_unique"
            )
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Salesman(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="salesmen"
    )
    name = models.CharField(max_length=255)

    class Meta:
        unique_together = ("company", "name")
        constraints = [
            models.UniqueConstraint(
                Lower("name"), "company", name="salesman_company_name_ci_unique"
            )
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ItemVariant(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="variants")
    size = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    current_stock_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = ("item", "size", "price")
        constraints = [
            models.UniqueConstraint(
                Lower("size"), "item", "price", name="variant_item_size_price_ci_unique"
            )
        ]

    def save(self, *args, **kwargs):
        self.size = self.size.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item.name} ({self.size} @ {self.price})"

    def record_purchase(self, quantity, price=None):
        """Add purchased quantity to this price-locked variant."""
        self.current_stock_qty += quantity
        self.save()

    def record_sale(self, quantity):
        if quantity > self.current_stock_qty:
            raise ValidationError("Cannot sell more than available stock.")
        self.current_stock_qty -= quantity
        self.save()

    def adjust_purchase(self, old_quantity, new_quantity):
        """Net-delta quantity edit on a purchase line staying on this same
        (item, size, price) variant. Price/size/item changes are handled by
        moving off this variant instead (see remove_purchase_effect)."""
        new_stock = self.current_stock_qty - old_quantity + new_quantity
        if new_stock < 0:
            sold_stock = old_quantity - self.current_stock_qty
            raise ValidationError(
                f"Quantity cannot be less than the sold stock {sold_stock}. Adjust the related sales first."
            )
        self.current_stock_qty = new_stock
        self.save()

    def adjust_sale(self, old_quantity, new_quantity):
        new_stock = self.current_stock_qty + old_quantity - new_quantity
        if new_stock < 0:
            raise ValidationError("Cannot sell more than available stock.")
        self.current_stock_qty = new_stock
        self.save()

    def remove_purchase_effect(self, quantity, price=None):
        """Undo the stock effect of one purchase line. Used when a purchase
        line's item/size/price changes on edit (moving off this variant)."""
        new_quantity = self.current_stock_qty - quantity
        if new_quantity < 0:
            raise ValidationError(
                f"This purchase has already {abs(new_quantity)} sold stock. Adjust the related sales first."
            )
        self.current_stock_qty -= quantity
        self.save()

    def remove_sale_effect(self, quantity):
        self.current_stock_qty += quantity
        self.save()

    def is_orphaned(self, exclude_purchase_id=None, exclude_sale_id=None):
        purchases_qs = self.purchases.all()
        if exclude_purchase_id:
            purchases_qs = purchases_qs.exclude(pk=exclude_purchase_id)
        sales_qs = self.sales.all()
        if exclude_sale_id:
            sales_qs = sales_qs.exclude(pk=exclude_sale_id)
        return not purchases_qs.exists() and not sales_qs.exists()


class Purchase(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="purchases"
    )
    salesman = models.ForeignKey(
        Salesman, on_delete=models.SET_NULL, null=True, related_name="purchases"
    )
    party = models.ForeignKey(
        Party,
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchases",
        limit_choices_to={"party_type": Party.PARTY_TYPE_PURCHASE},
    )
    date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Purchase #{self.id}"


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(
        Purchase, on_delete=models.CASCADE, related_name="items"
    )
    variant = models.ForeignKey(
        ItemVariant, on_delete=models.CASCADE, related_name="purchases"
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    @transaction.atomic
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            self.variant.record_purchase(self.quantity, self.price)

    def __str__(self):
        return f"Purchase item: {self.variant} x {self.quantity} @ {self.price}"


class Sale(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="sales")
    salesman = models.ForeignKey(
        Salesman, on_delete=models.SET_NULL, null=True, related_name="sales"
    )
    party = models.ForeignKey(
        Party,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sales",
        limit_choices_to={"party_type": Party.PARTY_TYPE_SALE},
    )
    date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sale #{self.id}"


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(
        ItemVariant, on_delete=models.CASCADE, related_name="sales"
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price_at_sale = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def profit(self):
        return (self.sale_price - self.cost_price_at_sale) * self.quantity

    @transaction.atomic
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if is_new:
            self.cost_price_at_sale = self.variant.price
            self.variant.record_sale(self.quantity)
        super().save(*args, **kwargs)


class ContactMessage(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="contact_messages"
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company.name}: {self.message[:40]}"


class Quotation(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="quotations"
    )
    party = models.ForeignKey(
        Party,
        on_delete=models.SET_NULL,
        null=True,
        related_name="quotations",
        limit_choices_to={"party_type": Party.PARTY_TYPE_SALE},
    )
    date = models.DateField(db_index=True)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    advance_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quotation #{self.id} - {self.party.name if self.party else 'No party'}"

    @property
    def sub_total(self):
        return sum((i.qty * i.price for i in self.items.all()), Decimal("0"))

    @property
    def vat_amount(self):
        return self.sub_total * self.vat_percent / Decimal("100")

    @property
    def grand_total(self):
        return self.sub_total + self.vat_amount


class QuotationItem(models.Model):
    quotation = models.ForeignKey(
        Quotation, on_delete=models.CASCADE, related_name="items"
    )
    description = models.CharField(max_length=255)
    qty = models.DecimalField(max_digits=12, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.description} x {self.qty}"
