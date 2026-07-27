from django.contrib import admin
from .models import Company, CompanyToken, Item, Salesman, ItemVariant, Purchase, Sale

admin.site.register(Company)
admin.site.register(CompanyToken)
admin.site.register(Item)
admin.site.register(Salesman)
admin.site.register(ItemVariant)
admin.site.register(Purchase)
admin.site.register(Sale)
