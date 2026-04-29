import json
import uuid

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Game, Move
from .serializers import GameSerializer


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

