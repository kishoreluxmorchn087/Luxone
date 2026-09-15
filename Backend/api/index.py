"""Vercel Python Function entry point for the Django API."""

from crm_backend.wsgi import application


# Vercel discovers WSGI applications exported as ``app``.
app = application
