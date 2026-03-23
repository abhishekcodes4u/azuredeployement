const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const receipts = [];

function normalizeText(value) {
  return String(value || "").trim();
}

function validateReceipt(payload) {
  const studentName = normalizeText(payload.studentName);
  const term = normalizeText(payload.term);
  const notes = normalizeText(payload.notes);
  const amount = Number(payload.amount);

  if (!studentName) {
    return { error: "studentName is required" };
  }

  if (!term) {
    return { error: "term is required" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "amount must be a positive number" };
  }

  return {
    studentName,
    term,
    notes,
    amount: Number(amount.toFixed(2)),
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime()),
    receiptCount: receipts.length,
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/message", (req, res) => {
  res.json({
    app: "Azure Lab Full Stack App",
    message: "Hello from Node.js backend",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/echo", (req, res) => {
  const { text = "" } = req.body;
  res.json({
    original: text,
    echo: text.toUpperCase(),
  });
});

app.get("/api/receipts", (req, res) => {
  const query = normalizeText(req.query.q).toLowerCase();

  const filtered = query
    ? receipts.filter((receipt) => {
        return (
          receipt.studentName.toLowerCase().includes(query) ||
          receipt.term.toLowerCase().includes(query) ||
          receipt.notes.toLowerCase().includes(query)
        );
      })
    : receipts;

  res.json({
    count: filtered.length,
    items: filtered,
  });
});

app.post("/api/receipts", (req, res) => {
  const validated = validateReceipt(req.body || {});

  if (validated.error) {
    return res.status(400).json({
      ok: false,
      error: validated.error,
    });
  }

  const receipt = {
    id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...validated,
    createdAt: new Date().toISOString(),
  };

  receipts.unshift(receipt);

  return res.status(201).json({
    ok: true,
    item: receipt,
  });
});

app.get("/api/receipts/summary", (req, res) => {
  const totalAmount = receipts.reduce(
    (sum, receipt) => sum + receipt.amount,
    0,
  );

  const byTerm = receipts.reduce((acc, receipt) => {
    const current = acc[receipt.term] || { count: 0, amount: 0 };
    current.count += 1;
    current.amount = Number((current.amount + receipt.amount).toFixed(2));
    acc[receipt.term] = current;
    return acc;
  }, {});

  res.json({
    totalCount: receipts.length,
    totalAmount: Number(totalAmount.toFixed(2)),
    byTerm,
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
