from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from integrations.services import (
    create_outgoing_crm_email,
    email_send_error_detail,
    get_user_default_email_provider,
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_email_view(request):
    to = (request.data.get('to') or '').strip()
    subject = (request.data.get('subject') or '').strip()
    body = (request.data.get('body') or '').strip()

    if not to:
        return Response({'detail': 'Recipient email is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not subject:
        return Response({'detail': 'Subject is required.'}, status=status.HTTP_400_BAD_REQUEST)

    provider = get_user_default_email_provider(request.user)
    if not provider:
        return Response(
            {'detail': 'No active CRM-synced email provider is configured for this user.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        create_outgoing_crm_email(
            provider_integration=provider,
            subject=subject,
            body=body,
            to_emails=[to],
            send_live=True,
            owner=request.user,
            metadata={
                'from_name': provider.display_name or getattr(request.user, 'email', '') or 'CRM User',
            },
        )
        return Response({'message': f'Email sent to {to}'}, status=status.HTTP_200_OK)
    except ValueError as exc:
        return Response(
            {'detail': email_send_error_detail(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
