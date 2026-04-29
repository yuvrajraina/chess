from django.urls import path
from .views import (
    RegisterView,
    create_single_player_game,
    create_multiplayer_game,
    join_multiplayer_game,
    my_games,
    get_game,
    )

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'), 
    path('games/singleplayer/', create_single_player_game, name='create_single'),
    path('games/<uuid:game_id>/join/', join_multiplayer_game, name='join_multiplayer'),
    path('games/multiplayer/', create_multiplayer_game, name='create_multiplayer'),
    path('games/', my_games, name='my_games'),
    path('games/<uuid:game_id>/', get_game, name='get_game'),
]
