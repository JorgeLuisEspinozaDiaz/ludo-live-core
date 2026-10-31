import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitLudoLive1730330000000 implements MigrationInterface {
  name = 'InitLudoLive1730330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE lives_status_enum AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE rounds_status_enum AS ENUM ('CREATED', 'PURCHASES_OPEN', 'PURCHASES_CLOSED', 'FINISHED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ludo_color_enum AS ENUM ('ROJO', 'VERDE', 'AMARILLO', 'NARANJA', 'MORADO', 'AZUL');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE purchases_status_enum AS ENUM ('ACTIVE', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE wallet_movement_type_enum AS ENUM ('PURCHASE', 'PURCHASE_CANCEL', 'PAYMENT', 'PRIZE', 'POINTS_REDEMPTION', 'ADJUSTMENT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE points_movement_type_enum AS ENUM ('EARNED', 'REDEEMED', 'ADJUSTMENT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS game_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        price_cents bigint NOT NULL DEFAULT 200,
        prize_cents bigint NOT NULL DEFAULT 1000,
        slots_per_color int NOT NULL DEFAULT 50,
        points_per_sol int NOT NULL DEFAULT 10,
        cents_per_redeem_unit bigint NOT NULL DEFAULT 100,
        min_redeem_points int NOT NULL DEFAULT 10,
        redeem_points_multiple int NOT NULL DEFAULT 10,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_game_configs_tenant UNIQUE (tenant_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lives (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        title varchar(200) NOT NULL,
        description text NULL,
        status lives_status_enum NOT NULL DEFAULT 'SCHEDULED',
        room_name varchar(120) NULL,
        scheduled_at timestamptz NULL,
        started_at timestamptz NULL,
        ended_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lives_tenant_status ON lives (tenant_id, status);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS live_participants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        live_id uuid NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
        user_id uuid NOT NULL,
        connected_at timestamptz NOT NULL DEFAULT NOW(),
        disconnected_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_live_participants_live_user UNIQUE (live_id, user_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rounds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        live_id uuid NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
        number int NOT NULL DEFAULT 1,
        status rounds_status_enum NOT NULL DEFAULT 'CREATED',
        price_cents bigint NOT NULL,
        prize_cents bigint NOT NULL,
        slots_per_color int NOT NULL,
        winner_color ludo_color_enum NULL,
        purchases_opened_at timestamptz NULL,
        purchases_closed_at timestamptz NULL,
        finished_at timestamptz NULL,
        settled_at timestamptz NULL,
        cancelled_at timestamptz NULL,
        cancel_reason text NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_round_per_live
      ON rounds (live_id)
      WHERE status IN ('CREATED', 'PURCHASES_OPEN', 'PURCHASES_CLOSED');
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS round_color_stocks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        color ludo_color_enum NOT NULL,
        capacity int NOT NULL,
        sold int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_round_color UNIQUE (round_id, color),
        CONSTRAINT chk_round_color_sold CHECK (sold >= 0 AND sold <= capacity)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        color ludo_color_enum NOT NULL,
        slots int NOT NULL,
        sold int NOT NULL DEFAULT 0,
        multiplier int NOT NULL DEFAULT 2,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT chk_promo_sold CHECK (sold >= 0 AND sold <= slots),
        CONSTRAINT chk_promo_multiplier CHECK (multiplier >= 1)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        user_id uuid NOT NULL,
        color ludo_color_enum NOT NULL,
        quantity int NOT NULL,
        unit_price_cents bigint NOT NULL,
        multiplier int NOT NULL DEFAULT 1,
        promo_id uuid NULL REFERENCES promos(id) ON DELETE SET NULL,
        status purchases_status_enum NOT NULL DEFAULT 'ACTIVE',
        cancel_reason text NULL,
        cancelled_at timestamptz NULL,
        cancelled_by uuid NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchases_round_status ON purchases (round_id, status);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchases_user_round ON purchases (user_id, round_id);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        balance_cents bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_wallets_user UNIQUE (user_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wallet_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        user_id uuid NOT NULL,
        type wallet_movement_type_enum NOT NULL,
        amount_cents bigint NOT NULL,
        balance_before_cents bigint NOT NULL,
        balance_after_cents bigint NOT NULL,
        round_id uuid NULL,
        purchase_id uuid NULL,
        payment_method varchar(60) NULL,
        payment_reference varchar(120) NULL,
        note text NULL,
        author_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallet_movements_user ON wallet_movements (user_id, created_at DESC);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS points_wallets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        balance int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_points_wallets_user UNIQUE (user_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS points_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        points_wallet_id uuid NOT NULL REFERENCES points_wallets(id) ON DELETE CASCADE,
        user_id uuid NOT NULL,
        type points_movement_type_enum NOT NULL,
        amount int NOT NULL,
        balance_before int NOT NULL,
        balance_after int NOT NULL,
        round_id uuid NULL,
        purchase_id uuid NULL,
        note text NULL,
        author_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS round_history_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        live_id uuid NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
        winner_color ludo_color_enum NOT NULL,
        finished_at timestamptz NOT NULL,
        payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_round_history_round UNIQUE (round_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        actor_id uuid NULL,
        action varchar(80) NOT NULL,
        entity_type varchar(80) NOT NULL,
        entity_id uuid NULL,
        before_data jsonb NULL,
        after_data jsonb NULL,
        reason text NULL,
        ip varchar(64) NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS round_history_snapshots`);
    await queryRunner.query(`DROP TABLE IF EXISTS points_movements`);
    await queryRunner.query(`DROP TABLE IF EXISTS points_wallets`);
    await queryRunner.query(`DROP TABLE IF EXISTS wallet_movements`);
    await queryRunner.query(`DROP TABLE IF EXISTS wallets`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchases`);
    await queryRunner.query(`DROP TABLE IF EXISTS promos`);
    await queryRunner.query(`DROP TABLE IF EXISTS round_color_stocks`);
    await queryRunner.query(`DROP TABLE IF EXISTS rounds`);
    await queryRunner.query(`DROP TABLE IF EXISTS live_participants`);
    await queryRunner.query(`DROP TABLE IF EXISTS lives`);
    await queryRunner.query(`DROP TABLE IF EXISTS game_configs`);
  }
}
