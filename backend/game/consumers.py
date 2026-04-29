import random
from urllib.parse import parse_qs

import chess

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from django.db import transaction
from django.db.models import Q

from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import User

from .models import Game, Move
from .serializers import GameSerializer

class ChessConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'game_{self.game_id}'

        query_params = parse_qs(self.scope.get('query_string', b'').decode())
        token = query_params.get('token', [''])[0]
        self.user = await self.get_user_from_token(token)

        if self.user is None or self.user.is_anonymous:
            await self.close()
            return

        if not await self.user_can_access_game():
            await self.close(code=4403)
            return
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        game_data = await self.get_game_data()
        await self.send_json({
            'type': 'game_state',
            'game': game_data
        })  

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    async def receive_json(self, content):
        action = content.get('action')
        if action == 'move':
            move = content.get('move')
            result = await self.make_move(move)
            
            if "error" in result:
                await self.send_json(result)
                return

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_game',
                    'game': result['game']
                }
            )

    async def broadcast_game(self, event):
        await self.send_json({
            'type': 'game_state',
            'game': event['game']
        })

    @database_sync_to_async
    def get_user_from_token(self,token):
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            return user
        except Exception as e:
            print(f"Token error: {e}")
            return None
        
    @database_sync_to_async
    def get_game_data(self):
        try:
            game = Game.objects.get(id=self.game_id)
            return GameSerializer(game).data
        except Game.DoesNotExist:
            return None

    @database_sync_to_async
    def user_can_access_game(self):
        return Game.objects.filter(
            Q(white_player=self.user) | Q(black_player=self.user),
            id=self.game_id,
        ).exists()
        
    @database_sync_to_async
    def make_move(self, move_uci):
        try:
            with transaction.atomic():
                game = Game.objects.select_for_update().get(id=self.game_id)
                if game.status != 'in_progress':
                    return {'error': 'Game is not active'}
                
                board = chess.Board(game.fen)
                is_white_turn = board.turn == chess.WHITE
                if (is_white_turn and game.white_player != self.user) or (not is_white_turn and game.black_player != self.user):
                    return {'error': 'Not your turn'}
                try:
                    move = chess.Move.from_uci(move_uci)
                except ValueError:
                    return {'error': 'Invalid move format'}
                
                if move not in board.legal_moves:
                    return {'error': 'Illegal move'}
                
                board.push(move)
                Move.objects.create(
                    game= game,
                    player = self.user,
                    move = move_uci,
                    fen_after = board.fen()
                )

                game.fen = board.fen()

                if board.is_game_over():
                    game.status = 'finished'
                    game.result = board.result()
                    game.save()
                    return {'game': GameSerializer(game).data}
                
                if game.mode == 'single':
                    opponent_move = random.choice(list(board.legal_moves))
                    board.push(opponent_move)
                    Move.objects.create(
                        game= game,
                        player = None,
                        move = opponent_move.uci(),
                        fen_after = board.fen()
                    )
                    game.fen = board.fen()
                    if board.is_game_over():
                        game.status = 'finished'
                        game.result = board.result()
                    game.save()

                return {'game': GameSerializer(game).data}
        except Game.DoesNotExist:
            return {'error': 'Game not found'}
        except Exception as e:
            print(f"Move error: {e}")
            return {'error': 'An error occurred while making the move'}
            






            



