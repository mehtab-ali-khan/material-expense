import secrets

from django.db import models
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

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ItemVariant(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="variants")
    length = models.CharField(max_length=100)
    measurement = models.CharField(max_length=100)

    current_stock_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    avg_purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_purchased_qty = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    total_purchased_value = models.DecimalField(
        max_digits=14, decimal_places=2, default=0
    )

    class Meta:
        unique_together = ("item", "length", "measurement")

    def save(self, *args, **kwargs):
        self.length = self.length.strip()
        self.measurement = self.measurement.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item.name} ({self.length}, {self.measurement})"

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


class Purchase(models.Model):
    variant = models.ForeignKey(
        ItemVariant, on_delete=models.CASCADE, related_name="purchases"
    )
    salesman = models.ForeignKey(
        Salesman, on_delete=models.SET_NULL, null=True, related_name="purchases"
    )
    party = models.ForeignKey(
        Party, on_delete=models.SET_NULL, null=True, related_name="purchases"
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Purchase: {self.variant} x {self.quantity} @ {self.price}"

    @transaction.atomic
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            self.variant.record_purchase(self.quantity, self.price)


class Sale(models.Model):
    variant = models.ForeignKey(
        ItemVariant, on_delete=models.CASCADE, related_name="sales"
    )
    salesman = models.ForeignKey(
        Salesman, on_delete=models.SET_NULL, null=True, related_name="sales"
    )
    party = models.ForeignKey(
        Party, on_delete=models.SET_NULL, null=True, related_name="sales"
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_price_snapshot = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sale: {self.variant} x {self.quantity} @ {self.sale_price}"

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
