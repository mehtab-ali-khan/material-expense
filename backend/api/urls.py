from django.urls import path
from .views import (
    ContactMessageCreateView,
    MeView,
    PartyListCreateView,
    SignupView,
    LoginView,
    ItemListCreateView,
    SalesmanListCreateView,
    ItemVariantListView,
    PurchaseListCreateView,
    PurchaseDetailView,
    SaleListCreateView,
    SaleDetailView,
)

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("items/", ItemListCreateView.as_view(), name="item-list"),
    path("salesmen/", SalesmanListCreateView.as_view(), name="salesman-list"),
    path("parties/", PartyListCreateView.as_view(), name="party-list"),
    path("variants/", ItemVariantListView.as_view(), name="variant-list"),
    path("purchases/", PurchaseListCreateView.as_view(), name="purchase-list"),
    path("purchases/<int:pk>/", PurchaseDetailView.as_view(), name="purchase-detail"),
    path("sales/", SaleListCreateView.as_view(), name="sale-list"),
    path("sales/<int:pk>/", SaleDetailView.as_view(), name="sale-detail"),
    path("contact/", ContactMessageCreateView.as_view(), name="contact-create"),
]
