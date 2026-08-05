from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.db.models import Q, Prefetch

from .models import (
    Company,
    CompanyToken,
    Item,
    Party,
    PurchaseItem,
    Quotation,
    Salesman,
    ItemVariant,
    Purchase,
    Sale,
)
from .models import normalize_phone

from .serializers import (
    CompanyProfileSerializer,
    CompanySignupSerializer,
    CompanyLoginSerializer,
    ContactMessageSerializer,
    ItemSerializer,
    PartySerializer,
    QuotationSerializer,
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

    def patch(self, request):
        company = request.user
        serializer = CompanyProfileSerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
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

        phone = normalize_phone(serializer.validated_data["phone"].strip())
        password = serializer.validated_data["password"]

        try:
            company = Company.objects.get(phone=phone)
        except Company.DoesNotExist:
            return Response(
                {"detail": "Invalid phone number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not company.check_password(password):
            return Response(
                {"detail": "Invalid phone number or password."},
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


class PartyListCreateView(generics.ListCreateAPIView):
    serializer_class = PartySerializer

    def get_queryset(self):
        qs = Party.objects.filter(company=self.request.user)
        party_type = self.request.query_params.get("type")
        if party_type in (Party.PARTY_TYPE_PURCHASE, Party.PARTY_TYPE_SALE):
            qs = qs.filter(party_type=party_type)
        return qs.order_by("name")

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

        qs = qs.prefetch_related(
            Prefetch(
                "purchases",
                queryset=PurchaseItem.objects.select_related(
                    "purchase__salesman"
                ).order_by("-purchase__date", "-purchase__id"),
                to_attr="recent_purchases",
            )
        )
        return qs.order_by("size")


class PurchaseListCreateView(generics.ListCreateAPIView):
    serializer_class = PurchaseSerializer

    def get_queryset(self):
        qs = Purchase.objects.filter(company=self.request.user).order_by("-created_at")

        date = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        search = self.request.query_params.get("search")
        salesman = self.request.query_params.get("salesman")

        if date:
            qs = qs.filter(date=date)
        else:
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)

        if search:
            search = search.strip()
            qs = qs.filter(
                Q(items__variant__item__name__icontains=search)
                | Q(party__name__icontains=search)
                | Q(party__contact__icontains=search)
            ).distinct()

        if salesman:
            salesman = salesman.strip()
            if salesman.isdigit():
                qs = qs.filter(salesman_id=salesman)
            else:
                qs = qs.filter(salesman__name__iexact=salesman)

        return qs


class PurchaseDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PurchaseSerializer

    def get_queryset(self):
        return Purchase.objects.filter(company=self.request.user)


class SaleListCreateView(generics.ListCreateAPIView):
    serializer_class = SaleSerializer

    def get_queryset(self):
        qs = Sale.objects.filter(company=self.request.user).order_by("-created_at")

        date = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        search = self.request.query_params.get("search")
        salesman = self.request.query_params.get("salesman")

        if date:
            qs = qs.filter(date=date)
        else:
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)

        if search:
            search = search.strip()
            qs = qs.filter(
                Q(items__variant__item__name__icontains=search)
                | Q(party__name__icontains=search)
                | Q(party__contact__icontains=search)
            ).distinct()

        if salesman:
            salesman = salesman.strip()
            if salesman.isdigit():
                qs = qs.filter(salesman_id=salesman)
            else:
                qs = qs.filter(salesman__name__iexact=salesman)

        return qs


class SaleDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = SaleSerializer

    def get_queryset(self):
        return Sale.objects.filter(company=self.request.user)


class ContactMessageCreateView(generics.CreateAPIView):
    serializer_class = ContactMessageSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.request.user)


class QuotationListCreateView(generics.ListCreateAPIView):
    serializer_class = QuotationSerializer

    def get_queryset(self):
        qs = Quotation.objects.filter(company=self.request.user).order_by("-created_at")

        date = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        search = self.request.query_params.get("search")

        if date:
            qs = qs.filter(date=date)
        else:
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)

        if search:
            search = search.strip()
            qs = qs.filter(
                Q(party__name__icontains=search) | Q(party__contact__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        serializer.save()


class QuotationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = QuotationSerializer

    def get_queryset(self):
        return Quotation.objects.filter(company=self.request.user)
