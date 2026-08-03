from decimal import Decimal
import secrets

from django.db import models
from django.db.models.functions import Lower
from django.db import transaction
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError


import re


def normalize_phone(raw):
    """
    Normalize a phone number to a canonical digits-only international format.
    Examples (Pakistan, default country code 92):
      "+92 308 8253383"  -> "923088253383"
      "0308-825-3383"     -> "923088253383"
      "923088253383"      -> "923088253383"
    """
    if not raw:
        return raw
    digits = re.sub(r"\D", "", raw)  # strip everything except digits

    if digits.startswith("0092"):
        digits = digits[2:]  # "0092..." -> "92..."
    elif digits.startswith("92"):
        pass  # already has country code
    elif digits.startswith("0"):
        digits = "92" + digits[1:]  # local format "03..." -> "923..."
    else:
        digits = "92" + digits  # bare number, assume missing country code

    return digits


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

    class Meta:
        unique_together = ("company", "name")
        constraints = [
            models.UniqueConstraint(Lower("name"), "company", name="party_company_name_ci_unique")
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
            models.UniqueConstraint(Lower("name"), "company", name="item_company_name_ci_unique")
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
            models.UniqueConstraint(Lower("name"), "company", name="salesman_company_name_ci_unique")
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ItemVariant(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="variants")
    length = models.CharField(max_length=100)

    current_stock_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    avg_purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_purchased_qty = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    total_purchased_value = models.DecimalField(
        max_digits=14, decimal_places=2, default=0
    )

    class Meta:
        unique_together = ("item", "length")
        constraints = [
            models.UniqueConstraint(Lower("length"), "item", name="variant_item_length_ci_unique")
        ]

    def save(self, *args, **kwargs):
        self.length = self.length.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item.name} ({self.length})"

    def record_purchase(self, quantity, price):
        """
        Add a purchase to this variant: update stock and recalculate
        the weighted-average purchase price.
        """
        self.total_purchased_qty += quantity
        self.total_purchased_value += quantity * price
        self.avg_purchase_price = self.total_purchased_value / self.total_purchased_qty
        self.current_stock_qty += quantity
        self.save()

    def record_sale(self, quantity):
        """
        Deduct a sale from stock. Raises ValidationError if insufficient stock.
        Caller is responsible for wrapping this with the Sale creation
        in a transaction.
        """
        if quantity > self.current_stock_qty:
            raise ValidationError("Cannot sell more than available stock.")
        self.current_stock_qty -= quantity
        self.save()

    def adjust_purchase(self, old_quantity, old_price, new_quantity, new_price):
        """
        Apply the net effect of editing a purchase from
        (old_quantity, old_price) to (new_quantity, new_price) in one step.
        Validates against the FINAL resulting stock, not an intermediate one.
        """
        new_stock = self.current_stock_qty - old_quantity + new_quantity
        if new_stock < 0:
            sold_stock = old_quantity - self.current_stock_qty
            raise ValidationError(
                f"Quantity cannot be less than the sold stock {sold_stock}. Adjust the related sales first."
            )

        new_total_qty = self.total_purchased_qty - old_quantity + new_quantity
        new_total_value = (
            self.total_purchased_value
            - (old_quantity * old_price)
            + (new_quantity * new_price)
        )

        self.total_purchased_qty = new_total_qty
        self.total_purchased_value = new_total_value
        self.avg_purchase_price = (
            new_total_value / new_total_qty if new_total_qty > 0 else Decimal("0")
        )
        self.current_stock_qty = new_stock
        self.save()

    def adjust_sale(self, old_quantity, new_quantity):
        """
        Apply the net effect of editing a sale's quantity from
        old_quantity to new_quantity in one step, validated against the
        FINAL resulting stock.
        """
        new_stock = self.current_stock_qty + old_quantity - new_quantity
        if new_stock < 0:
            raise ValidationError("Cannot sell more than available stock.")
        self.current_stock_qty = new_stock
        self.save()

    def remove_purchase_effect(self, quantity, price):
        """
        Undo the stock/avg-price effect of one purchase. Used when a
        purchase's item/length changes on edit (moving off this variant),
        and will be reused by a future delete-purchase feature.
        """
        new_quantity = self.current_stock_qty - quantity

        if new_quantity < 0:
            raise ValidationError(
                f"This purchase has already {abs(new_quantity)} sold stock. Adjust the related sales first."
            )
        self.total_purchased_qty -= quantity
        self.total_purchased_value -= quantity * price
        self.avg_purchase_price = (
            self.total_purchased_value / self.total_purchased_qty
            if self.total_purchased_qty > 0
            else Decimal("0")
        )
        self.current_stock_qty -= quantity
        self.save()

    def remove_sale_effect(self, quantity):
        """
        Undo the stock effect of one sale. Used when a sale's item/length
        changes on edit (moving off this variant), and will be reused by
        a future delete-sale feature. Always safe (stock only increases).
        """
        self.current_stock_qty += quantity
        self.save()

    def is_orphaned(self, exclude_purchase_id=None, exclude_sale_id=None):
        purchases_qs = self.purchases.all()
        if exclude_purchase_id:
            purchases_qs = purchases_qs.exclude(pk=exclude_purchase_id)
        sales_qs = self.sales.all()
        if exclude_sale_id:
            sales_qs = sales_qs.exclude(pk=exclude_sale_id)
        return (
            self.total_purchased_qty <= 0
            and not purchases_qs.exists()
            and not sales_qs.exists()
        )


class Purchase(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="purchases"
    )
    salesman = models.ForeignKey(
        Salesman, on_delete=models.SET_NULL, null=True, related_name="purchases"
    )
    party = models.ForeignKey(
        Party, on_delete=models.SET_NULL, null=True, related_name="purchases"
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
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="sales"
    )
    salesman = models.ForeignKey(
        Salesman, on_delete=models.SET_NULL, null=True, related_name="sales"
    )
    party = models.ForeignKey(
        Party, on_delete=models.SET_NULL, null=True, related_name="sales"
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
    purchase_price_snapshot = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def profit(self):
        return (self.sale_price - self.purchase_price_snapshot) * self.quantity

    @transaction.atomic
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if is_new:
            self.purchase_price_snapshot = self.variant.avg_purchase_price
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
        Party, on_delete=models.SET_NULL, null=True, related_name="quotations"
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
