screenGroups.push({
  screens: {
  p01: { title: "Acceso y sesión", icon: "◉" }
  },
  related: {

  }
});

function login(changePassword = false) {
  const form = changePassword
    ? `<h2>Cambia tu contraseña</h2><p>${sessionUser.mustChangePassword ? "Antes de continuar, reemplaza la contraseña temporal entregada por tu administrador." : "Ingresa tu contraseña actual y una nueva contraseña."}</p><form id="password-form"><label for="current-password">Contraseña actual</label><input id="current-password" name="currentPassword" type="password" autocomplete="current-password" required><label for="new-password">Nueva contraseña</label><input id="new-password" name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><p class="form-hint">Debe tener al menos 12 caracteres.</p><p class="form-message" role="alert"></p><button class="button primary" type="submit">Actualizar contraseña</button></form>${sessionUser.mustChangePassword ? "" : '<button class="text-link" data-action="cancel-password">Volver</button>'}<button class="text-link" data-action="logout">Cerrar sesión</button>`
    : `<h2>Bienvenido de nuevo</h2><p>Ingresa con la cuenta asignada por el administrador.</p><form id="login-form"><label for="login-role">Tipo de acceso</label><select id="login-role" name="role"><option value="user">Usuario</option><option value="admin">Administrador</option></select><label for="login-username">Usuario</label><input id="login-username" name="username" autocomplete="username" required><label for="login-password">Contraseña</label><input id="login-password" name="password" type="password" autocomplete="current-password" required><p class="form-message" role="alert"></p><button class="button primary" type="submit">Iniciar sesión →</button></form><div class="notice">Si no puedes acceder, contacta al administrador. La recuperación automática aún no está disponible.</div>`;
  return `<div class="login-page"><section class="login-art"><div class="brand-name">NÓMADE <small>GESTIÓN DE OBRAS</small></div><div><h1>Construyamos con más claridad.</h1><p>Una visión integral para acompañar cada etapa de tus obras, desde el presupuesto hasta el resultado.</p></div><small>CONSTRUCTORA NÓMADE &nbsp; · &nbsp; PROTOTIPO</small></section><main class="login-panel"><div class="login-box"><div class="eyebrow">P01 / ACCESO</div>${form}</div></main></div>`;
}

async function requestApi(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers }
    });
  } catch (error) {
    console.error("Error de conexión:", error);
    throw new Error("No se pudo conectar al servidor. Comprueba que esté iniciado.");
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No fue posible completar la solicitud.");
  return result;
}

async function startSession() {
  try {
    const result = await requestApi("/api/session");
    sessionUser = result.user;
    sessionReady = true;
    render();
  } catch (error) {
    sessionReady = true;
    render();
    const message = document.querySelector(".form-message");
    if (message) message.textContent = error.message;
  }
}

async function logout() {
  try {
    await requestApi("/api/logout", { method: "POST" });
    sessionUser = null;
    passwordChangeRequested = false;
    history.replaceState(null, "", "#p01");
    render();
  } catch (error) {
    showDialog("No se pudo cerrar la sesión", error.message);
  }
}

document.addEventListener("submit", async event => {
  const form = event.target;
  if (!["login-form", "password-form", "create-user-form"].includes(form.id)) return;
  event.preventDefault();
  const message = form.querySelector(".form-message");
  const button = form.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(form));
  message.textContent = "";
  button.disabled = true;
  try {
    if (form.id === "login-form") {
      const result = await requestApi("/api/login", { method: "POST", body: JSON.stringify(values) });
      sessionUser = result.user;
      history.replaceState(null, "", "#p02");
      render();
    } else if (form.id === "password-form") {
      const result = await requestApi("/api/password", { method: "POST", body: JSON.stringify(values) });
      sessionUser = result.user;
      passwordChangeRequested = false;
      render();
    } else {
      await requestApi("/api/users", { method: "POST", body: JSON.stringify(values) });
      form.reset();
      message.textContent = "Usuario creado. Comparte la contraseña temporal de forma segura.";
      await loadUsers();
    }
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

