from django.db import models
import uuid
from django.contrib.auth.models import User

# Create your models here.

class Game(models.Model):
    MODE_CHOICES = (
        ('single', 'Single Player'),
        ('multi', 'Multiplayer'),
    )

    STATUS_CHOICES = (
        ('waiting', 'Waiting for opponent'),
        ('in_progress', 'In Progress'),
        ('finished', 'Finished'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    white_player = models.ForeignKey(User, on_delete=models.CASCADE, related_name='white_games')
    black_player = models.ForeignKey(User, on_delete=models.CASCADE, related_name='black_games', null=True, blank=True)

    mode = models.CharField(max_length=10, choices=MODE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')

    fen = models.TextField(default = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

    result = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Move(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='moves')
    player = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    move = models.CharField(max_length=10)
    fen_after = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)