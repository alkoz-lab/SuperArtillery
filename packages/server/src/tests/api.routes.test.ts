import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApiRouter } from '../routes/api';
import { GameManager } from '../services/gameManager';
import { CONTRACT_VERSION } from '@superartillery/core';

describe('API routes', () => {
  let app: express.Express;
  let gameManager: GameManager;

  beforeEach(() => {
    gameManager = new GameManager();
    app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(gameManager));
  });

  it('creates a game and returns invite details', async () => {
    const response = await request(app)
      .post('/api/v1/games')
      .send({ name: 'Alice' })
      .expect(201);

    expect(response.body.gameId).toBeTruthy();
    expect(response.body.playerToken).toBeTruthy();
    expect(response.body.inviteCode).toMatch(/^[A-Z0-9]{4}$/i);
    expect(response.body.inviteUrl).toContain('invite=');
  });

  it('creates a hot-seat game with credentials for both players', async () => {
    const response = await request(app)
      .post('/api/v1/hot-seat/games')
      .send({ names: ['Alice', 'Bob'] })
      .expect(201);

    expect(response.body.gameId).toBeTruthy();
    expect(response.body.players).toHaveLength(2);
    expect(response.body.players[0]).toMatchObject({ playerId: 0, name: 'Alice' });
    expect(response.body.players[1]).toMatchObject({ playerId: 1, name: 'Bob' });
    expect(response.body.players[0].playerToken).toBeTruthy();
    expect(response.body.players[1].playerToken).toBeTruthy();
  });

  it('creates a hot-seat game with up to 9 players', async () => {
    const names = ['Alice', 'Bob', 'Carl', 'Dana', 'Eve', 'Finn', 'Gia', 'Hana', 'Ivo'];
    const response = await request(app)
      .post('/api/v1/hot-seat/games')
      .send({ names })
      .expect(201);

    expect(response.body.players).toHaveLength(9);
  });

  it('accepts an invitation by code', async () => {
    const created = gameManager.createGame('Alice');
    if ('error' in created) throw new Error('Expected created game');

    const response = await request(app)
      .post('/api/v1/invitations/accept')
      .send({ inviteCode: created.inviteCode, name: 'Bob' })
      .expect(200);

    expect(response.body.gameId).toBe(created.gameId);
    expect(response.body.playerToken).toBeTruthy();
  });

  it('requires a session token for status polling', async () => {
    const created = gameManager.createGame('Alice');
    if ('error' in created) throw new Error('Expected created game');

    const response = await request(app)
      .get(`/api/v1/games/${created.gameId}/status`)
      .expect(401);

    expect(response.body.code).toBe('MISSING_SESSION_TOKEN');
  });

  it('returns status for a valid session token', async () => {
    const created = gameManager.createGame('Alice');
    if ('error' in created) throw new Error('Expected created game');

    const response = await request(app)
      .get(`/api/v1/games/${created.gameId}/status`)
      .query({ sessionToken: created.playerToken })
      .expect(200);

    expect(response.body.status).toBe('pending');
    expect(response.body.playersConnected).toBe(0);
    expect(response.body.required).toBe(2);
    expect(response.body.ready).toBe(false);
    expect(response.body.readyCount).toBe(0);
  });

  it('rejects a rematch request before the game has finished', async () => {
    const created = gameManager.createGame('Alice');
    if ('error' in created) throw new Error('Expected created game');

    const response = await request(app)
      .post(`/api/v1/games/${created.gameId}/rematch`)
      .query({ sessionToken: created.playerToken })
      .expect(400);

    expect(response.body.code).toBe('REMATCH_NOT_AVAILABLE');
  });

  it('requires a session token for rematch requests', async () => {
    const response = await request(app)
      .post('/api/v1/games/game-1/rematch')
      .expect(401);

    expect(response.body.code).toBe('MISSING_SESSION_TOKEN');
  });

  it('rejects fire without required payload fields', async () => {
    const response = await request(app)
      .post('/api/v1/fire')
      .query({ sessionToken: 'abc' })
      .send({ gameId: 'x', angle: 45 })
      .expect(400);

    expect(response.body.code).toBe('MISSING_FIELDS');
  });

  it('reports lightweight health without totals', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      games: expect.any(Number),
      invites: expect.any(Number),
      timestamp: expect.any(String),
      uptime: expect.stringMatching(/^\d+\.\d{2}:\d{2}:\d{2}\.\d{3}$/),
      contractVersion: CONTRACT_VERSION
    });
    expect(response.body.totals).toBeUndefined();
  });

  it('reports stats including webSockets and lifetime totals', async () => {
    const response = await request(app)
      .get('/api/v1/stats')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      games: expect.any(Number),
      invites: expect.any(Number),
      webSockets: expect.any(Number),
      totals: {
        internet: { games: expect.any(Number), rematches: expect.any(Number) },
        device: { games: expect.any(Number), rematches: expect.any(Number) }
      },
      timestamp: expect.any(String),
      uptime: expect.stringMatching(/^\d+\.\d{2}:\d{2}:\d{2}\.\d{3}$/),
      contractVersion: CONTRACT_VERSION
    });
  });
});
