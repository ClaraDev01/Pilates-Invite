import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Cria a tabela se ainda não existir
db.query(`
  CREATE TABLE IF NOT EXISTS confirmados (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() => {
  console.log("✅ Tabela confirmados pronta.");
}).catch((err) => {
  console.error("Erro ao criar tabela:", err.message);
});

// ─── Middleware de autenticação admin ─────────────────────────────────────────

function adminAuth(req, res, next) {
  const senha = req.headers["x-admin-pass"];
  if (senha !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "Não autorizado." });
  }
  next();
}

// ─── Rotas públicas ───────────────────────────────────────────────────────────

// POST /confirmar — salva confirmações no banco
app.post("/confirmar", async (req, res) => {
  const { entries } = req.body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "Nenhuma entrada recebida." });
  }

  const invalidos = entries.filter((e) => !e.name || e.name.trim() === "");
  if (invalidos.length > 0) {
    return res.status(400).json({ error: "Todos os convidados precisam ter nome." });
  }

  try {
    for (const entry of entries) {
      await db.query(
        "INSERT INTO confirmados (name) VALUES ($1)",
        [entry.name.trim()]
      );
    }
    return res.json({ ok: true, total: entries.length });
  } catch (err) {
    console.error("Erro ao inserir:", err.message);
    return res.status(500).json({ error: "Erro ao salvar no banco." });
  }
});

// ─── Rotas admin (protegidas por senha) ───────────────────────────────────────

// GET /confirmados — lista todos os confirmados
app.get("/confirmados", adminAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM confirmados ORDER BY created_at DESC"
    );
    return res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar:", err.message);
    return res.status(500).json({ error: "Erro ao buscar dados." });
  }
});

// DELETE /confirmados — apaga todos os confirmados
app.delete("/confirmados", adminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM confirmados");
    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao deletar:", err.message);
    return res.status(500).json({ error: "Erro ao limpar dados." });
  }
});

app.delete("/confirmados/:id", adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM confirmados WHERE id = $1", [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao deletar:", err.message);
    return res.status(500).json({ error: "Erro ao deletar convidado." });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});