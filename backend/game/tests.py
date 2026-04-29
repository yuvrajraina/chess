import asyncio
import json
import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Game, Move
from .serializers import GameSerializer


async def receive_channel_message(channel_layer, channel_name):
    return await asyncio.wait_for(channel_layer.receive(channel_name), timeout=1)


class GameApiTests(APITestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="white", password="pass12345")
        self.black = User.objects.create_user(username="black", password="pass12345")
        self.other = User.objects.create_user(username="other", password="pass12345")

    def test_create_singleplayer_game_requires_authentication(self):
        response = self.client.post(reverse("create_single"))
        self.assertEqual(response.status_code, 401)

    def test_create_singleplayer_game(self):
        self.client.force_authenticate(self.white)

        response = self.client.post(reverse("create_single"))

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["mode"], "single")
        self.assertEqual(response.data["status"], "in_progress")
        self.assertEqual(response.data["white_name"], "white")

    def test_cannot_join_singleplayer_game(self):
        game = Game.objects.create(
            white_player=self.white,
            mode="single",
            status="in_progress",
        )
        self.client.force_authenticate(self.black)

        response = self.client.post(reverse("join_multiplayer", args=[game.id]))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Only multiplayer games can be joined")

    def test_join_missing_multiplayer_game_returns_404(self):
        self.client.force_authenticate(self.black)

        response = self.client.post(reverse("join_multiplayer", args=[uuid.uuid4()]))

        self.assertEqual(response.status_code, 404)

    def test_join_multiplayer_broadcasts_updated_game(self):
        game = Game.objects.create(
            white_player=self.white,
            mode="multi",
            status="waiting",
        )
        channel_layer = get_channel_layer()
        channel_name = async_to_sync(channel_layer.new_channel)()
        group_name = f"game_{game.id}"
        async_to_sync(channel_layer.group_add)(group_name, channel_name)
        self.client.force_authenticate(self.black)

        try:
            response = self.client.post(reverse("join_multiplayer", args=[game.id]))
            message = async_to_sync(receive_channel_message)(channel_layer, channel_name)
        finally:
            async_to_sync(channel_layer.group_discard)(group_name, channel_name)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "in_progress")
        self.assertEqual(message["type"], "broadcast_game")
        self.assertEqual(message["game"]["id"], str(game.id))
        self.assertEqual(message["game"]["status"], "in_progress")
        self.assertEqual(message["game"]["black_id"], self.black.id)

    def test_non_participant_cannot_fetch_game(self):
        game = Game.objects.create(
            white_player=self.white,
            mode="multi",
            status="waiting",
        )
        self.client.force_authenticate(self.other)

        response = self.client.get(reverse("get_game", args=[game.id]))

        self.assertEqual(response.status_code, 403)

    def test_game_serializer_is_json_serializable_for_websockets(self):
        game = Game.objects.create(
            white_player=self.white,
            mode="single",
            status="in_progress",
        )
        Move.objects.create(
            game=game,
            player=None,
            move="e7e5",
            fen_after=game.fen,
        )

        data = GameSerializer(game).data

        json.dumps(data)
        self.assertEqual(data["moves"][0]["game_id"], str(game.id))
        self.assertIsNone(data["moves"][0]["player_id"])
        self.assertEqual(data["moves"][0]["player_name"], "Bot")
