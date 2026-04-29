const API_URL = "https://prana-backend-jkri.onrender.com";
let adminPassInput = "";

let guestCount = 1;

// ─── Formulário de convidados ─────────────────────────────────────────────────

function addGuest() {
  guestCount++;
  const container = document.getElementById("guestFields");

  const block = document.createElement("div");
  block.className = "guest-block";
  block.innerHTML = `
    <div class="guest-block-header">
      <div class="guest-block-label">Pessoa ${guestCount}</div>
      <button class="btn-remove" onclick="removeGuest(this)">✕ remover</button>
    </div>
    <div class="form-group">
      <label class="form-label">Nome completo</label>
      <input class="form-input guest-name" type="text" placeholder="Nome completo">
    </div>
  `;
  container.appendChild(block);
  block.scrollIntoView({ behavior: "smooth", block: "center" });
}

function removeGuest(btn) {
  btn.closest(".guest-block").remove();
  renumberGuests();
}

function renumberGuests() {
  document.querySelectorAll(".guest-block").forEach((block, i) => {
    const label = block.querySelector(".guest-block-label");
    if (label) label.textContent = `Pessoa ${i + 1}`;
  });
  guestCount = document.querySelectorAll(".guest-block").length;
}

// ─── Confirmar presença ───────────────────────────────────────────────────────

async function confirmRSVP() {
  const blocks = document.querySelectorAll(".guest-block");
  const entries = [];
  let hasError = false;

  blocks.forEach((block) => {
    const nameInput = block.querySelector(".guest-name");
    const name = nameInput.value.trim();

    if (!name) {
      nameInput.style.borderColor = "#c05050";
      if (!hasError) nameInput.focus();
      hasError = true;
      return;
    }

    nameInput.style.borderColor = "";
    entries.push({ name });
  });

  if (hasError) return;

  const btn = document.querySelector(".btn-confirm");
  btn.textContent = "Salvando...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });

    if (!res.ok) throw new Error("Erro ao confirmar");

    const total = entries.length;
    const firstName = entries[0].name.split(" ")[0];

    document.getElementById("successTitle").textContent =
      total === 1
        ? `Presença confirmada, ${firstName}!`
        : `${total} presenças confirmadas!`;

    document.getElementById("rsvpForm").style.display = "none";
    document.getElementById("successMsg").style.display = "block";

  } catch (e) {
    btn.textContent = "✓ Confirmar presença";
    btn.disabled = false;
    alert("Erro ao confirmar presença. Tente novamente.");
  }
}

// ─── Painel admin ─────────────────────────────────────────────────────────────

function toggleAdmin() {
  const panel = document.getElementById("adminPanel");

  if (panel.classList.contains("open")) {
    closeAdmin();
  } else {
    panel.classList.add("open");
  }
}

async function checkPass() {
  const input = document.getElementById("passInput");
  const error = document.getElementById("passError");
  const btn = document.querySelector(".btn-pass");

  error.classList.remove("show");
  input.classList.remove("error");

  btn.textContent = "Entrando...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/confirmados`, {
      headers: { "x-admin-pass": input.value },
    });

    if (!res.ok) throw new Error();

    const data = await res.json();

    document.getElementById("passGate").style.display = "none";
    document.getElementById("adminContent").style.display = "block";

    renderAdmin(data);

  } catch {
    error.classList.add("show");
    input.classList.add("error");
    input.value = "";
    input.focus();
  } finally {
    btn.textContent = "Entrar";
    btn.disabled = false;
  }
}


async function renderAdmin(data = null) {
  const list = document.getElementById("guestList");

  if (!data) {
    list.innerHTML = '<div class="empty-list">Carregando... ✨</div>';

    const res = await fetch(`${API_URL}/confirmados`, {
      headers: { "x-admin-pass": adminPassInput },
    });

    data = await res.json();
  }

  document.getElementById("statPessoas").textContent = data.length;

  if (data.length === 0) {
    list.innerHTML = '<div class="empty-list">Nenhuma confirmação ainda ✨</div>';
    return;
  }

  list.innerHTML = data.map((g) => {
    const date = new Date(g.created_at).toLocaleDateString("pt-BR");
    const time = new Date(g.created_at).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <div class="guest-item">
        <div>
          <div class="guest-name">${g.name}</div>
          <div class="guest-meta">${date} às ${time}</div>
        </div>
        <button onclick="deleteGuest(${g.id})">ⓧ</button>
      </div>
    `;
  }).join("");
}

async function clearAll() {
  if (!confirm("Apagar todas as confirmações?")) return;

  await fetch(`${API_URL}/confirmados`, {
    method: "DELETE",
    headers: { "x-admin-pass": adminPassInput },
  });

  renderAdmin();
}

async function exportList() {
  try {
    const res = await fetch(`${API_URL}/confirmados`, {
      headers: { "x-admin-pass": adminPassInput },
    });
    const data = await res.json();

    const lines = ["PRANA STUDIOS — INAUGURAÇÃO 02/05\n", "Lista de confirmados:\n"];

    data.forEach((g, i) => {
      const date = new Date(g.created_at).toLocaleDateString("pt-BR");
      const time = new Date(g.created_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      lines.push(`${i + 1}. ${g.name} | ${date} às ${time}`);
    });

    lines.push(`\nTotal: ${data.length} pessoa(s) confirmada(s).`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "confirmados_prana.txt";
    a.click();

  } catch (e) {
    alert("Erro ao exportar lista.");
  }
}

async function deleteGuest(id) {
  if (!confirm("Remover esse convidado?")) return;

  try {
    await fetch(`${API_URL}/confirmados/${id}`, {
      method: "DELETE",
      headers: { "x-admin-pass": adminPassInput },
    });

    renderAdmin(); // recarrega lista
  } catch (e) {
    alert("Erro ao remover.");
  }
}

function closeAdmin() {
  document.getElementById("adminPanel").classList.remove("open");

  // reseta tudo
  adminPassInput = "";

  document.getElementById("passGate").style.display = "block";
  document.getElementById("adminContent").style.display = "none";
  document.getElementById("passInput").value = "";
  document.getElementById("passError").style.display = "none";
  document.getElementById("passInput").addEventListener("input", () => {
  passInput.classList.remove("error");
  passError.classList.remove("show");
});
  
}
