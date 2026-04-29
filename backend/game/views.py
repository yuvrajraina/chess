from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, permissions
from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from .models import Game
from .serializers import GameSerializer, RegisterSerializer, serialize_game


def broadcast_game_state(game_id, game_data):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        f'game_{game_id}',
        {
            'type': 'broadcast_game',
            'game': game_data,
        },
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_single_player_game(request):
    game = Game.objects.create(
        white_player = request.user,
        mode = 'single',
        status = 'in_progress'
    )

    return Response(serialize_game(game), status=http_status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_multiplayer_game(request):
    game = Game.objects.create(
        white_player=request.user,
        mode='multi',
        status='waiting',
    )
    return Response(serialize_game(game), status=http_status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def join_multiplayer_game(request, game_id):
    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return Response({'error': 'Game not found'}, status=404)
    if game.mode != 'multi':
        return Response({'error': 'Only multiplayer games can be joined'}, status=400)
    if game.status != 'waiting':
        return Response({'error': 'Game is not waiting for an opponent'}, status=400)
    if game.white_player == request.user:
        return Response({'error': 'You cannot join your own game'}, status=400)
    if game.black_player is not None:
        return Response({'error': 'Game is already full'}, status=400)
    
    game.black_player = request.user
    game.status = 'in_progress'
    game.save()

    game_data = serialize_game(game)
    broadcast_game_state(game.id, game_data)

    return Response(game_data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_games(request):
    games = Game.objects.filter(white_player=request.user) | Game.objects.filter(black_player=request.user)
    games = games.order_by('-created_at')
    return Response(GameSerializer(games, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_game(request, game_id):
    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return Response({'error': 'Game not found'}, status=404)
    if game.white_player != request.user and game.black_player != request.user:
        return Response({'error': 'You do not have access to this game'}, status=403)

    return Response(serialize_game(game))
