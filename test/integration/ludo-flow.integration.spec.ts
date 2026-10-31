import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { LudoColor } from 'src/common/enums';

const hasDb = process.env.RUN_INTEGRATION === '1';

(hasDb ? describe : describe.skip)('Ludo live integration (14 casos)', () => {
  let app: INestApplication;
  let adminToken: string;
  let participantToken: string;
  let tenantId: string;
  let participantId: string;
  let liveId: string;
  let roundId: string;
  const slug = `it_${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const boot = await request(app.getHttpServer())
      .post('/auth/bootstrap')
      .send({
        tenantName: 'IT Tenant',
        tenantSlug: slug,
        username: 'admin',
        password: 'admin123',
        email: 'admin@it.test',
      })
      .expect(201);

    tenantId = boot.body.tenant.id;

    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123', tenant: slug })
      .expect(201);
    adminToken = loginAdmin.body.access_token;

    const part = await request(app.getHttpServer())
      .post('/users/participants')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        username: 'player1',
        password: 'player123',
        email: 'p1@it.test',
      })
      .expect(201);
    participantId = part.body.id;

    const loginP = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'player1', password: 'player123', tenant: slug })
      .expect(201);
    participantToken = loginP.body.access_token;

    const live = await request(app.getHttpServer())
      .post('/lives')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ title: 'Live IT' })
      .expect(201);
    liveId = live.body.id;

    await request(app.getHttpServer())
      .post(`/lives/${liveId}/start`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(201);
  }, 120000);

  afterAll(async () => {
    await app?.close();
  });

  async function newRound() {
    const round = await request(app.getHttpServer())
      .post(`/lives/${liveId}/rounds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ priceCents: 200, prizeCents: 1000, slotsPerColor: 10 })
      .expect(201);
    roundId = round.body.id;
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/open-purchases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(201);
    return roundId;
  }

  async function walletMe(token = participantToken) {
    const res = await request(app.getHttpServer())
      .get('/wallets/me')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .expect(200);
    return res.body.balanceCents as number;
  }

  it('1) compro 3 ROJO → -600', async () => {
    await newRound();
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/purchases`)
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({ color: LudoColor.ROJO, quantity: 3 })
      .expect(201);
    expect(await walletMe()).toBe(-600);
  });

  it('2) pago 1000 → +400', async () => {
    await request(app.getHttpServer())
      .post(`/wallets/${participantId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ amountCents: 1000, method: 'YAPE' })
      .expect(201);
    expect(await walletMe()).toBe(400);
  });

  it('3) gana ROJO → 3400 y puntos', async () => {
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/close-purchases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/finish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ winnerColor: LudoColor.ROJO })
      .expect(201);
    expect(await walletMe()).toBe(3400);
    const pts = await request(app.getHttpServer())
      .get('/points/me')
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .expect(200);
    expect(pts.body.balance).toBeGreaterThanOrEqual(3);
  });

  it('4) compro 3 sin pagar y gana → +2400 neto desde 3400 = 5800', async () => {
    const before = await walletMe();
    await newRound();
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/purchases`)
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({ color: LudoColor.ROJO, quantity: 3 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/close-purchases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/finish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ winnerColor: LudoColor.ROJO })
      .expect(201);
    expect(await walletMe()).toBe(before - 600 + 3000);
  });

  it('5) pierde → solo cargo -600', async () => {
    const before = await walletMe();
    await newRound();
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/purchases`)
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({ color: LudoColor.ROJO, quantity: 3 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/close-purchases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/finish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ winnerColor: LudoColor.AZUL })
      .expect(201);
    expect(await walletMe()).toBe(before - 600);
  });

  it('6) promo x5 → 25 puntos ganados en liquidación', async () => {
    const ptsBefore = (
      await request(app.getHttpServer())
        .get('/points/me')
        .set('Authorization', `Bearer ${participantToken}`)
        .set('x-tenant-id', tenantId)
    ).body.balance;
    await newRound();
    const promo = await request(app.getHttpServer())
      .post(`/rounds/${roundId}/promos`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ color: LudoColor.NARANJA, slots: 5, multiplier: 5 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/purchases`)
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        color: LudoColor.NARANJA,
        quantity: 5,
        promoId: promo.body.id,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/close-purchases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/finish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ winnerColor: LudoColor.AZUL })
      .expect(201);
    const ptsAfter = (
      await request(app.getHttpServer())
        .get('/points/me')
        .set('Authorization', `Bearer ${participantToken}`)
        .set('x-tenant-id', tenantId)
    ).body.balance;
    expect(ptsAfter - ptsBefore).toBe(25);
  });

  it('8) canje 300 puntos → +3000 céntimos', async () => {
    // Ajuste puntos si hace falta
    await request(app.getHttpServer())
      .post(`/points/${participantId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ amount: 300, reason: 'seed test' })
      .expect(201);
    const before = await walletMe();
    await request(app.getHttpServer())
      .post('/points/redeem')
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({ points: 300 })
      .expect(201);
    expect(await walletMe()).toBe(before + 3000);
  });

  it('9) cancelar compras impagas restaura saldo y cupo', async () => {
    await newRound();
    const before = await walletMe();
    const buy = await request(app.getHttpServer())
      .post(`/rounds/${roundId}/purchases`)
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({ color: LudoColor.ROJO, quantity: 5 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/purchases/${buy.body.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ reason: 'impago', force: true })
      .expect(201);
    expect(await walletMe()).toBe(before);
    const inv = await request(app.getHttpServer())
      .get(`/rounds/${roundId}/inventory`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(200);
    const rojo = inv.body.find((s: { color: string }) => s.color === 'ROJO');
    expect(rojo.sold).toBe(0);
  });

  it('10) carrera por última casilla: solo uno gana', async () => {
    await newRound();
    await request(app.getHttpServer())
      .patch(`/rounds/${roundId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId);
    // Fill 9 of 10 then race for last
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/purchases`)
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({ color: LudoColor.VERDE, quantity: 9 })
      .expect(201);

    const part2 = await request(app.getHttpServer())
      .post('/users/participants')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ username: 'player2', password: 'player123' })
      .expect(201);
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'player2', password: 'player123', tenant: slug });
    const token2 = login2.body.access_token;

    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post(`/rounds/${roundId}/purchases`)
        .set('Authorization', `Bearer ${participantToken}`)
        .set('x-tenant-id', tenantId)
        .send({ color: LudoColor.VERDE, quantity: 1 }),
      request(app.getHttpServer())
        .post(`/rounds/${roundId}/purchases`)
        .set('Authorization', `Bearer ${token2}`)
        .set('x-tenant-id', tenantId)
        .send({ color: LudoColor.VERDE, quantity: 1 }),
    ]);
    const oks = [r1.status, r2.status].filter((s) => s === 201).length;
    const fails = [r1.status, r2.status].filter((s) => s >= 400).length;
    expect(oks).toBe(1);
    expect(fails).toBe(1);
    void part2;
  });

  it('11) finalizar dos veces falla', async () => {
    await newRound();
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/close-purchases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/finish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ winnerColor: LudoColor.AZUL })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/finish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .send({ winnerColor: LudoColor.AZUL })
      .expect(409);
  });

  it('12) comprar cerrada → 409', async () => {
    await newRound();
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/close-purchases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/rounds/${roundId}/purchases`)
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({ color: LudoColor.ROJO, quantity: 1 })
      .expect(409);
  });

  it('14) participante no puede gestionar live → 403', async () => {
    await request(app.getHttpServer())
      .post('/lives')
      .set('Authorization', `Bearer ${participantToken}`)
      .set('x-tenant-id', tenantId)
      .send({ title: 'hack' })
      .expect(403);
  });

  it('13) aislamiento tenant: otro tenant 401/404 en acceso cruzado', async () => {
    const other = await request(app.getHttpServer())
      .post('/auth/bootstrap')
      .send({
        tenantName: 'Other',
        tenantSlug: `${slug}_b`,
        username: 'adminb',
        password: 'admin123',
      })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/lives/${liveId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', other.body.tenant.id)
      .expect((res) => {
        expect([400, 403, 404]).toContain(res.status);
      });
  });
});
