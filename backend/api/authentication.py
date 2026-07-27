from rest_framework import authentication, exceptions

from .models import CompanyToken


class CompanyTokenAuthentication(authentication.BaseAuthentication):
    """
    Authenticates requests using a token in the format:
    Authorization: Token <key>
    """

    keyword = "Token"

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()

        if not auth_header or auth_header[0].decode() != self.keyword:
            return None

        if len(auth_header) != 2:
            raise exceptions.AuthenticationFailed("Invalid token header.")

        key = auth_header[1].decode()

        try:
            token = CompanyToken.objects.select_related("company").get(key=key)
        except CompanyToken.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid token.")

        return (token.company, token)
