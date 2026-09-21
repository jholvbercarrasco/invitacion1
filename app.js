const CONFIG = {
  apiUrl: window.INVITATION_CONFIG?.apiUrl || "",
  eventDate: "2026-11-14T11:30:00-05:00",
};

const MUSIC_START_SECONDS = 18;

const state = {
  invitation: null,
  selectedPasses: 0,
  usingPrototypeData: !CONFIG.apiUrl,
};

const elements = {
  body: document.body,
  invitation: document.getElementById("invitation"),
  music: document.getElementById("weddingMusic"),
  musicControl: document.getElementById("musicControl"),
  musicLabel: document.getElementById("musicLabel"),
  guestName: document.getElementById("guestName"),
  passMessage: document.getElementById("passMessage"),
  passOptions: document.getElementById("passOptions"),
  rsvpForm: document.getElementById("rsvpForm"),
  confirmButton: document.getElementById("confirmButton"),
  declineButton: document.getElementById("declineButton"),
  formStatus: document.getElementById("formStatus"),
  prototypeNote: document.getElementById("prototypeNote"),
};

function setMusicState(isPlaying) {
  elements.musicControl.setAttribute("aria-pressed", String(isPlaying));
  elements.musicControl.setAttribute("aria-label", isPlaying ? "Pausar música" : "Reproducir música");
  elements.musicLabel.textContent = isPlaying ? "Pausar" : "Música";
}

let musicStartPrepared = false;

async function prepareMusicStart() {
  if (musicStartPrepared) return;

  const seekToMusic = () => {
    try {
      elements.music.currentTime = MUSIC_START_SECONDS;
      musicStartPrepared = true;
    } catch {
      // El navegador volverá a intentarlo al cargar los metadatos.
    }
  };

  if (elements.music.readyState >= 1) {
    seekToMusic();
    return;
  }

  await new Promise((resolve) => {
    elements.music.addEventListener("loadedmetadata", () => {
      seekToMusic();
      resolve();
    }, { once: true });
  });
}

async function playMusic() {
  try {
    await prepareMusicStart();
    await elements.music.play();
    setMusicState(true);
  } catch {
    setMusicState(false);
  }
}

elements.musicControl.addEventListener("click", async () => {
  if (elements.music.paused) await playMusic();
  else {
    elements.music.pause();
    setMusicState(false);
  }
});

elements.music.addEventListener("play", () => setMusicState(true));
elements.music.addEventListener("pause", () => setMusicState(false));
elements.music.addEventListener("ended", () => {
  elements.music.currentTime = MUSIC_START_SECONDS;
  void playMusic();
});
void playMusic();

const startMusicOnFirstInteraction = async () => {
  if (elements.music.paused) await playMusic();
};
document.addEventListener("pointerdown", startMusicOnFirstInteraction, { once: true, passive: true });
document.addEventListener("keydown", startMusicOnFirstInteraction, { once: true });
window.addEventListener("wheel", startMusicOnFirstInteraction, { once: true, passive: true });

function updateCountdown() {
  const total = Math.max(0, new Date(CONFIG.eventDate).getTime() - Date.now());
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total / 3600000) % 24);
  const minutes = Math.floor((total / 60000) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  document.getElementById("days").textContent = String(days);
  document.getElementById("hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
  document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains("story-block")) {
          entry.target.querySelectorAll(".text-sweep").forEach((node) => node.classList.add("is-visible"));
        } else if (entry.target.classList.contains("motion-block")) {
          entry.target.querySelectorAll(".motion-text").forEach((node) => node.classList.add("is-visible"));
        } else if (entry.target.classList.contains("event-block")) {
          entry.target.querySelectorAll(".event-asset").forEach((node) => node.classList.add("is-visible"));
        } else if (entry.target.classList.contains("timeline-block")) {
          entry.target.querySelectorAll(".timeline-asset").forEach((node) => node.classList.add("is-visible"));
        } else if (entry.target.classList.contains("layered-art")) {
          entry.target.querySelectorAll(".art-asset").forEach((node) => node.classList.add("is-visible"));
        } else {
          entry.target.classList.add("is-visible");
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal, .story-block, .motion-block, .event-block, .timeline-block, .layered-art").forEach((node) => observer.observe(node));
} else {
  document.querySelectorAll(".reveal, .text-sweep, .motion-text, .event-asset, .timeline-asset, .art-asset").forEach((node) => node.classList.add("is-visible"));
}

const timelineTrack = document.getElementById("timelineTrack");
const timelineDot = document.getElementById("timelineDot");
let timelineFrame = 0;

function updateTimelineProgress() {
  if (!timelineTrack || !timelineDot || timelineFrame) return;
  timelineFrame = window.requestAnimationFrame(() => {
    timelineFrame = 0;
    const block = timelineTrack.closest(".timeline-block");
    const rect = block.getBoundingClientRect();
    const travel = Math.max(0, timelineTrack.clientHeight - timelineDot.offsetHeight);
    const start = window.innerHeight * 0.72;
    const distance = rect.height + window.innerHeight * 0.42;
    const progress = Math.min(1, Math.max(0, (start - rect.top) / distance));
    timelineTrack.style.setProperty("--dot-y", `${progress * travel}px`);
  });
}

if (!reduceMotion) {
  window.addEventListener("scroll", updateTimelineProgress, { passive: true });
  window.addEventListener("resize", updateTimelineProgress);
  updateTimelineProgress();
}

function tokenFromUrl() {
  return new URLSearchParams(window.location.search).get("i")?.trim() || "";
}

async function getPrototypeInvitation(token) {
  const response = await fetch("guests.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar la lista de prueba.");
  const guests = await response.json();
  if (!token) return { name: "INVITADO DE PRUEBA", maxPasses: 3, status: "Pendiente", confirmed: false, used: 0, token: "demo" };
  const guest = guests.find((item) => item.token === token);
  if (!guest) throw new Error("Este enlace de invitación no es válido.");
  const local = JSON.parse(localStorage.getItem(`rsvp:${token}`) || "null");
  return local ? { ...guest, ...local } : guest;
}

async function getLiveInvitation(token) {
  const url = new URL(CONFIG.apiUrl);
  url.searchParams.set("action", "get");
  url.searchParams.set("token", token);
  const response = await fetch(url, { redirect: "follow" });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.message || "No se pudo consultar la invitación.");
  return payload.invitation;
}

async function loadInvitation() {
  const token = tokenFromUrl();
  try {
    state.invitation = CONFIG.apiUrl && token
      ? await getLiveInvitation(token)
      : await getPrototypeInvitation(token);
    renderInvitation(state.invitation);
  } catch (error) {
    elements.guestName.textContent = "Enlace no encontrado";
    elements.passMessage.textContent = error.message;
    elements.formStatus.className = "form-status error";
    elements.prototypeNote.hidden = true;
  }
}

function renderInvitation(invitation) {
  invitation.status = invitation.status || (invitation.confirmed ? "Confirmado" : "Pendiente");
  elements.guestName.textContent = invitation.name;
  elements.passMessage.textContent = invitation.maxPasses === 1
    ? "Tienes 1 pase disponible."
    : `Tienes hasta ${invitation.maxPasses} pases disponibles.`;
  elements.passOptions.replaceChildren();
  for (let value = 1; value <= invitation.maxPasses; value += 1) {
    const label = document.createElement("label");
    label.className = "pass-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "passes";
    input.value = String(value);
    input.checked = Number(invitation.used) === value;
    const display = document.createElement("span");
    display.textContent = String(value);
    label.append(input, display);
    elements.passOptions.append(label);
  }
  state.selectedPasses = Number(invitation.used) || 0;
  elements.confirmButton.disabled = state.selectedPasses === 0;
  elements.confirmButton.textContent = invitation.confirmed ? "Actualizar confirmación" : "Confirmar asistencia";
  elements.declineButton.textContent = "No podré asistir, gracias";
  elements.rsvpForm.hidden = false;
  elements.prototypeNote.hidden = !state.usingPrototypeData;
  if (invitation.status === "Confirmado") showStatus(`Confirmación actual: ${invitation.used} pase${invitation.used === 1 ? "" : "s"}.`, "success");
  if (invitation.status === "No asistirá") showStatus("Registramos que no podrás asistir. Gracias por avisarnos.", "success");
}

elements.passOptions.addEventListener("change", (event) => {
  const input = event.target.closest("input[name='passes']");
  if (!input) return;
  state.selectedPasses = Number(input.value);
  elements.confirmButton.disabled = false;
  elements.formStatus.textContent = "";
});

function showStatus(message, type = "") {
  elements.formStatus.textContent = message;
  elements.formStatus.className = `form-status ${type}`.trim();
}

async function savePrototypeResponse(status, passes) {
  const payload = { status, confirmed: status === "Confirmado", used: passes };
  if (state.invitation.token !== "demo") {
    localStorage.setItem(`rsvp:${state.invitation.token}`, JSON.stringify(payload));
  }
  return payload;
}

async function saveLiveResponse(status, passes) {
  const body = new URLSearchParams({
    action: "respond",
    token: state.invitation.token,
    status,
    passes: String(passes),
  });
  const response = await fetch(CONFIG.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
    redirect: "follow",
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.message || "No se pudo guardar la confirmación.");
  return payload.invitation;
}

async function saveResponse(status, passes) {
  if (!state.invitation) throw new Error("La invitación todavía no está lista.");
  if (status === "Confirmado" && (!Number.isInteger(passes) || passes < 1 || passes > state.invitation.maxPasses)) {
    throw new Error("Selecciona una cantidad válida de pases.");
  }
  const usedPasses = status === "No asistirá" ? 0 : passes;
  elements.confirmButton.disabled = true;
  elements.declineButton.disabled = true;
  const activeButton = status === "No asistirá" ? elements.declineButton : elements.confirmButton;
  const originalLabel = activeButton.textContent;
  activeButton.textContent = "Guardando…";
  try {
    const result = state.usingPrototypeData
      ? await savePrototypeResponse(status, usedPasses)
      : await saveLiveResponse(status, usedPasses);
    state.invitation = { ...state.invitation, ...result, status, confirmed: status === "Confirmado", used: usedPasses };
    renderInvitation(state.invitation);
    if (status === "Confirmado") showStatus(`Confirmación registrada para ${usedPasses} pase${usedPasses === 1 ? "" : "s"}.`, "success");
    else showStatus("Registramos que no podrás asistir. Gracias por avisarnos.", "success");
    return { ok: true, status, passes: usedPasses };
  } catch (error) {
    activeButton.textContent = originalLabel;
    showStatus(error.message, "error");
    throw error;
  } finally {
    elements.confirmButton.disabled = state.selectedPasses === 0;
    elements.declineButton.disabled = false;
  }
}

async function confirmAttendance(passes) {
  return saveResponse("Confirmado", passes);
}

elements.rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await confirmAttendance(state.selectedPasses); } catch { /* Visible status already updated. */ }
});

elements.declineButton.addEventListener("click", async () => {
  try { await saveResponse("No asistirá", 0); } catch { /* Visible status already updated. */ }
});

async function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  try {
    await context.registerTool({
      name: "get_invitation",
      title: "Consultar invitación",
      description: "Consulta el nombre del invitado, sus pases disponibles y su confirmación actual.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        if (!state.invitation) throw new Error("La invitación todavía no está lista.");
        const { name, maxPasses, status, confirmed, used } = state.invitation;
        return { name, maxPasses, status, confirmed: Boolean(confirmed), used: Number(used) || 0 };
      },
    });
    await context.registerTool({
      name: "confirm_attendance",
      title: "Confirmar asistencia",
      description: "Confirma cuántos pases utilizará el invitado y actualiza el estado visible.",
      inputSchema: {
        type: "object",
        properties: { passes: { type: "integer", minimum: 1 } },
        required: ["passes"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        return confirmAttendance(Number(input?.passes));
      },
    });
  } catch {
    // Browsers without WebMCP continue with the visible form.
  }
  const copyButtons = document.querySelectorAll(".copy-button");
const copyFeedback = document.getElementById("copyFeedback");

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.dataset.copy;

    try {
      await navigator.clipboard.writeText(value);

      const original = button.textContent;
      button.textContent = "✓";

      copyFeedback.textContent = "Copiado";

      setTimeout(() => {
        button.textContent = original;
        copyFeedback.textContent = "";
      }, 1500);

    } catch {
      copyFeedback.textContent = "Mantén presionado el número para copiar.";
    }
  });
});
}

await loadInvitation();
await registerWebMcpTools();
