const assert = require("node:assert");

// Mocking response formats and testing helpers

// 1. Error Normalization logic (matching lib/api/client.ts)
function mockNormalizeError(status, data) {
  if (data && data.detail) {
    if (Array.isArray(data.detail)) {
      const validationErrors = {};
      data.detail.forEach((err) => {
        const field = err.loc[err.loc.length - 1];
        validationErrors[field] = err.msg;
      });
      return {
        message: "Erro de validação nos campos informados.",
        status,
        validationErrors,
      };
    }
    return {
      message: typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail),
      status,
    };
  }
  return {
    message: data.message || `Erro do servidor (${status})`,
    status,
  };
}

// 2. Safe rate calculations (matching campaigns page)
function mockCalculateRates(m) {
  if (!m) return null;
  const queued = m.sends?.queued || 0;
  const processing = m.sends?.processing || 0;
  const sent = m.sends?.sent || 0;
  const delivered = m.sends?.delivered || 0;
  const failed = m.sends?.failed || 0;

  const totalSends = queued + processing + sent + delivered + failed;
  const deliveredRate = totalSends > 0 ? (delivered / totalSends) * 100 : 0;
  
  const opens = m.events?.open || 0;
  const clicks = m.events?.click || 0;
  const bounces = m.events?.bounce || 0;
  const unsubscribes = m.events?.unsub || 0;

  const openRate = delivered > 0 ? (opens / delivered) * 100 : 0;
  const clickRate = delivered > 0 ? (clicks / delivered) * 100 : 0;
  const bounceRate = totalSends > 0 ? (bounces / totalSends) * 100 : 0;
  const unsubRate = totalSends > 0 ? (unsubscribes / totalSends) * 100 : 0;

  return {
    totalSends,
    deliveredRate,
    openRate,
    clickRate,
    bounceRate,
    unsubRate,
  };
}

// --- Test Executions ---

console.log("=== INICIANDO TESTES DO FRONTEND ===");

// Test 1: Normalize standard FastAPI 400 error
try {
  const err = mockNormalizeError(400, { detail: "invalid credentials" });
  assert.strictEqual(err.message, "invalid credentials");
  assert.strictEqual(err.status, 400);
  console.log("✓ Teste 1: Normalização de erro 400 padrão passou");
} catch (e) {
  console.error("✗ Teste 1 falhou", e);
  process.exit(1);
}

// Test 2: Normalize FastAPI 422 validation error array
try {
  const validationPayload = {
    detail: [
      { loc: ["body", "password"], msg: "ensure this value has at least 10 characters", type: "value_error.any_str.min_length" }
    ]
  };
  const err = mockNormalizeError(422, validationPayload);
  assert.strictEqual(err.message, "Erro de validação nos campos informados.");
  assert.strictEqual(err.status, 422);
  assert.ok(err.validationErrors);
  assert.strictEqual(err.validationErrors.password, "ensure this value has at least 10 characters");
  console.log("✓ Teste 2: Normalização de validação 422 passou");
} catch (e) {
  console.error("✗ Teste 2 falhou", e);
  process.exit(1);
}

// Test 3: Safe rate calculation (typical numbers)
try {
  const metrics = {
    sends: { queued: 5, processing: 0, sent: 0, delivered: 90, failed: 5 },
    events: { open: 45, click: 9, bounce: 3, unsub: 1 }
  };
  const rates = mockCalculateRates(metrics);
  assert.strictEqual(rates.totalSends, 100);
  assert.strictEqual(rates.deliveredRate, 90);
  assert.strictEqual(rates.openRate, 50); // 45 / 90 * 100
  assert.strictEqual(rates.clickRate, 10); // 9 / 90 * 100
  console.log("✓ Teste 3: Cálculos de taxas com dados típicos passou");
} catch (e) {
  console.error("✗ Teste 3 falhou", e);
  process.exit(1);
}

// Test 4: Safe rate calculation (division by zero / empty metrics)
try {
  const metrics = {
    sends: {},
    events: {}
  };
  const rates = mockCalculateRates(metrics);
  assert.strictEqual(rates.totalSends, 0);
  assert.strictEqual(rates.deliveredRate, 0);
  assert.strictEqual(rates.openRate, 0);
  assert.strictEqual(rates.clickRate, 0);
  console.log("✓ Teste 4: Proteção contra divisão por zero passou");
} catch (e) {
  console.error("✗ Teste 4 falhou", e);
  process.exit(1);
}

console.log("=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");
process.exit(0);
