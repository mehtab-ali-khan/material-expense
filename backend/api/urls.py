from django.urls import path

from .views import (
    SignupView,
    LoginView,
    ItemListCreateView,
    SalesmanListCreateView,
    ItemVariantListView,
    PurchaseListCreateView,
    SaleListCreateView,
)

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("items/", ItemListCreateView.as_view(), name="item-list"),
    path("salesmen/", SalesmanListCreateView.as_view(), name="salesman-list"),
    path("variants/", ItemVariantListView.as_view(), name="variant-list"),
    path("purchases/", PurchaseListCreateView.as_view(), name="purchase-list"),
    path("sales/", SaleListCreateView.as_view(), name="sale-list"),
]
