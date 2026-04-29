import json

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Game, Move

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username = validated_data['username'],
            email = validated_data.get('email', ""),
            password = validated_data['password']
        )
        return user
    
class MoveSerializer(serializers.ModelSerializer):
    player_name = serializers.SerializerMethodField()
    game_id = serializers.SerializerMethodField()
    player_id = serializers.SerializerMethodField()

    class Meta:
        model = Move
        # Important: WebSocket consumers use Channels' send_json (plain json.dumps),
        # so everything here must be JSON-serializable (UUIDs must be strings).
        fields = ('id', 'game_id', 'player_id', 'player_name', 'move', 'fen_after', 'created_at')

    def get_player_name(self, obj):
        if obj.player_id is None:
            return "Bot"
        return obj.player.username

    def get_game_id(self, obj):
        return str(obj.game_id)

    def get_player_id(self, obj):
        if obj.player_id is None:
            return None
        return obj.player_id
        
    
class GameSerializer(serializers.ModelSerializer):
    white_id = serializers.IntegerField(source='white_player.id', read_only=True)
    white_name = serializers.CharField(source='white_player.username', read_only=True)
    black_id = serializers.SerializerMethodField()
    black_name = serializers.SerializerMethodField()
    moves= MoveSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ['id', 'white_id', 'white_name', 'black_id', 'black_name',
                'mode', 'status', 'fen', 'result',
                'created_at', 'moves'
        ]

    def get_black_id(self, obj):
        if obj.black_player_id is None:
            return None
        return obj.black_player_id

    def get_black_name(self, obj):
        if obj.black_player_id is None:
            return None
        return obj.black_player.username


def serialize_game(game):
    return json.loads(json.dumps(GameSerializer(game).data))
