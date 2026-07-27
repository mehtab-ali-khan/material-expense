from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Company, CompanyToken
from .serializers import CompanySignupSerializer, CompanyLoginSerializer


class SignupView(generics.CreateAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySignupSerializer


class LoginView(APIView):
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

        return Response({"token": token.key, "company_name": company.name})
