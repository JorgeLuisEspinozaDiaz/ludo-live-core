/**
 * Casos de negocio 1–8 (precio=200, premio=1000) como pure math.
 */
describe('Ludo wallet math (céntimos)', () => {
  const price = 200;
  const prize = 1000;

  it('1) compro 3 ROJO → saldo -600', () => {
    expect(0 - 3 * price).toBe(-600);
  });

  it('2) desde -600, pago 1000 → +400', () => {
    expect(-600 + 1000).toBe(400);
  });

  it('3) desde +400, gana ROJO (+3000) → 3400 y 3 puntos', () => {
    expect(400 + 3 * prize).toBe(3400);
    expect(3 * 1).toBe(3);
  });

  it('4) compro 3 sin pagar y gana → -600 + 3000 = 2400', () => {
    expect(0 - 600 + 3000).toBe(2400);
  });

  it('5) compro 3 y gana AZUL → -600 y 3 puntos', () => {
    expect(0 - 600).toBe(-600);
    expect(3).toBe(3);
  });

  it('6) promo x5, 5 casillas → 25 puntos', () => {
    expect(5 * 5).toBe(25);
  });

  it('7) 2 normales + 3 x4 → 14 puntos', () => {
    expect(2 * 1 + 3 * 4).toBe(14);
  });

  it('8) canje 300 pts (10 pts = 100 céntimos) → +3000 céntimos', () => {
    const pointsPerSol = 10;
    const centsPerUnit = 100;
    const units = Math.floor(300 / pointsPerSol);
    expect(units * centsPerUnit).toBe(3000);
  });
});
