from django.contrib import admin
from .models import Company, CompanyToken, Item, Salesman, ItemVariant

admin.site.register(Company)
admin.site.register(CompanyToken)
admin.site.register(Item)
admin.site.register(Salesman)
admin.site.register(ItemVariant)
