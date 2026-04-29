from django.urls import path
from .consumers import ChessConsumer

websocket_urlpatterns = [
    path('ws/game/<uuid:game_id>/', ChessConsumer.as_asgi()),
]

