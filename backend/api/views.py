from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .models import Company, CompanyToken, Item, Salesman, ItemVariant, Purchase, Sale
from .serializers import (
    CompanySignupSerializer,
    CompanyLoginSerializer,
    ItemSerializer,
    SalesmanSerializer,
    ItemVariantSerializer,
    PurchaseSerializer,
    SaleSerializer,
)


class MeView(APIView):
    def get(self, request):
        company = request.user
        return Response(
            {
                "company_name": company.name,
                "first_name": company.first_name,
                "last_name": company.last_name,
                "phone": company.phone,
            }
        )


class SignupView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    queryset = Company.objects.all()
    serializer_class = CompanySignupSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CompanyLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data["name"].strip()
        password = serializer.validated_data["password"]

        try:
            company = Company.objects.get(name__iexact=name)
        except Company.DoesNotExist:
            return Response(
                {"detail": "Invalid company name or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not company.check_password(password):
            return Response(
                {"detail": "Invalid company name or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = CompanyToken.objects.get_or_create(company=company)

        return Response(
            {
                "token": token.key,
                "company_name": company.name,
                "first_name": company.first_name,
                "last_name": company.last_name,
                "phone": company.phone,
            }
        )


class ItemListCreateView(generics.ListCreateAPIView):
    serializer_class = ItemSerializer

    def get_queryset(self):
        return Item.objects.filter(company=self.request.user).order_by("name")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user)


class SalesmanListCreateView(generics.ListCreateAPIView):
    serializer_class = SalesmanSerializer

    def get_queryset(self):
        return Salesman.objects.filter(company=self.request.user).order_by("name")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user)


class ItemVariantListView(generics.ListAPIView):
    """Returns variants for a given item, used to populate the sale page dropdowns."""

    serializer_class = ItemVariantSerializer

    def get_queryset(self):
        item_id = self.request.query_params.get("item")
        qs = ItemVariant.objects.filter(item__company=self.request.user)
        if item_id:
            qs = qs.filter(item_id=item_id)
        return qs.order_by("length", "measurement")


class PurchaseListCreateView(generics.ListCreateAPIView):
    serializer_class = PurchaseSerializer

    def get_queryset(self):
        qs = Purchase.objects.filter(variant__item__company=self.request.user).order_by(
            "-created_at"
        )

        date = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if date:
            qs = qs.filter(date=date)
        else:
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)

        return qs


class SaleListCreateView(generics.ListCreateAPIView):
    serializer_class = SaleSerializer

    def get_queryset(self):
        qs = Sale.objects.filter(variant__item__company=self.request.user).order_by(
            "-created_at"
        )

        date = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if date:
            qs = qs.filter(date=date)
        else:
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)

        return qs
