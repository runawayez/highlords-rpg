var configureWorkspace = () => {},
  renderWorkspace = () => {};
addEventListener("DOMContentLoaded", () => {
  /* Workspace composition is independent of campaign data and transport. */
  const iconPaths = {
    pan: "M8 3v18M3 8l5-5 5 5M16 9v12m-5-5 5 5 5-5",
    draw: "m4 17 12-12 3 3L7 20H4v-3",
    line: "M5 19 19 5",
    rectangle: "M4 5h16v14H4z",
    ellipse: "M20 12a8 6 0 1 1-16 0 8 6 0 1 1 16 0",
    eraser: "m4 14 9-9 7 7-8 8H9l-5-6m5-5 7 7",
    ruler: "m3 16 13-13 5 5L8 21zm6-6 3 3m1-7 3 3",
    reveal:
      "M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7m12 0a3 3 0 1 1-6 0 3 3 0 1 1 6 0",
  };
  function workspaceIcon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", iconPaths[name] || iconPaths.rectangle);
    svg.append(path);
    return svg;
  }
  const workspaceToolbar = document.createElement("div");
  workspaceToolbar.id = "boardToolbar";
  workspaceToolbar.setAttribute("aria-label", "Ferramentas do mapa");
  workspaceToolbar.append($("toolButtons"));
  $("board").append(workspaceToolbar);
  for (const button of $("toolButtons").children) {
    const label = button.textContent.trim().replace(/^\S+\s/, "");
    button.textContent = "";
    button.append(
      workspaceIcon(button.dataset.tool),
      document.createTextNode(label),
    );
    button.addEventListener("click", () => {
      if (button.dataset.tool === "reveal" && !state.fog.enabled) {
        $("tabTools").click();
        openWorkspaceSection("map");
        $("fogEnable").focus();
      }
    });
    button.title = label;
    button.setAttribute("aria-label", label);
  }
  const sceneBar = document.createElement("div");
  sceneBar.id = "sceneBar";
  sceneBar.append($("sceneSelect"), $("newScene"));
  $("board").append(sceneBar);
  const boardEmpty = document.createElement("div");
  boardEmpty.id = "boardEmpty";
  boardEmpty.innerHTML =
    "<strong>O palco da sua próxima aventura.</strong><p>Traga um mapa ou comece a história com o que já está aqui.</p>";
  const mapStart = sheetButton("Adicionar mapa", () => {
    $("tabTools").click();
    openWorkspaceSection("map");
    $("upload").click();
  });
  boardEmpty.append(mapStart);
  $("board").append(boardEmpty);
  const zoomControls = document.createElement("div");
  zoomControls.id = "zoomControls";
  zoomControls.append(
    sheetButton("−", () => {
      zoom = Math.max(0.3, zoom / 1.2);
      transform();
    }),
    sheetButton("Enquadrar", () => {
      const rect = $("board").getBoundingClientRect();
      zoom = Math.min((rect.width - 140) / boardWidth(), (rect.height - 100) / boardHeight(), 1);
      offset = { x: 90, y: 70 };
      transform();
    }),
    sheetButton("+", () => {
      zoom = Math.min(3, zoom * 1.2);
      transform();
    }),
  );
  $("board").append(zoomControls);
  // Move creation where it belongs. Sidebar no longer mixes character creation with map editing.
  const charCreation = $("charName").parentElement;
  $("sheetsPanel").insertBefore(charCreation, $("characters"));
  $("charName").setAttribute("aria-label", "Nome do novo personagem");
  $("sheetsPanel").querySelector("h3").textContent = "Personagens";
  const participants = document.createElement("section");
  participants.id = "participantsPanel";
  participants.hidden = true;
  participants.append(
    sheetElement("h3", "Participantes"),
    $("players"),
    $("identityRecovery"),
  );
  $("tableSidebar").insertBefore(participants, $("saveStatus"));
  const participantTab = sheetButton("Grupo", () => {
    activateTablePanel("chat");
    $("chatPanel").hidden = true;
    participants.hidden = false;
    document
      .querySelectorAll(".table-tab")
      .forEach((el) => el.setAttribute("aria-selected", "false"));
    participantTab.setAttribute("aria-selected", "true");
    $("layout").dataset.panel = "participants";
  });
  participantTab.id = "tabParticipants";
  participantTab.setAttribute("aria-label", "Participantes");
  $("tableSidebar").querySelector("nav").append(participantTab);
  for (const b of $("tableSidebar").querySelectorAll(".table-tab"))
    b.addEventListener("click", () => {
      participants.hidden = true;
      participantTab.setAttribute("aria-selected", "false");
    });
  $("tabChat").textContent = "Chat";
  $("tabSheets").textContent = "Fichas";
  $("tabTools").textContent = "Biblioteca";
  // Organize host controls into task-specific sections, with all IDs retained for compatibility.
  const master = $("masterTools"),
    tokenInput = $("tokenName");
  const controls = [...master.childNodes];
  master.replaceChildren();
  master.append(sheetElement("h3", "Biblioteca da mesa"));
  const nav = sheetElement("div", undefined, "workspace-sections");
  master.append(nav);
  const groups = {};
  for (const [key, label] of [
    ["map", "Mapa"],
    ["tokens", "Tokens"],
    ["properties", "Propriedades"],
  ]) {
    const group = sheetElement("div", undefined, "workspace-group");
    group.dataset.section = key;
    groups[key] = group;
    nav.append(sheetButton(label, () => openWorkspaceSection(key)));
    master.append(group);
  }
  for (const node of controls) {
    if (node.nodeType !== 1) continue;
    if (node.tagName === "H3" && node.textContent === "Ferramentas do mestre")
      continue;
    const id = node.id;
    if (
      node.contains?.(tokenInput) ||
      id === "tokenManager" ||
      (node.tagName === "H3" && node.textContent === "Tokens da cena")
    )
      groups.tokens.append(node);
    else if (node.classList.contains("editor-inspector")) {
      const props = node.querySelector("#editorInspector"),
        heading = props.previousElementSibling;
      groups.properties.append(heading, props);
      groups.map.append(node);
    } else if (node.children.length === 0 && node.tagName === "DIV") continue;
    else if (
      node.tagName === "DIV" &&
      node.classList.contains("row") &&
      !node.children.length
    )
      continue;
    else groups.map.append(node);
  }
  function openWorkspaceSection(key) {
    for (const [name, group] of Object.entries(groups))
      group.hidden = name !== key;
    [...nav.children].forEach((b, i) => {
      const chosen = Object.keys(groups)[i] === key;
      b.classList.toggle("active", chosen);
      b.setAttribute("aria-pressed", String(chosen));
    });
  }
  openWorkspaceSection("map");
  for (const el of [workspaceToolbar, sceneBar, zoomControls])
    for (const event of ["pointerdown", "pointerup", "wheel"])
      el.addEventListener(event, (e) => e.stopPropagation());
  // Campaign commands use a single menu, keeping the header readable on smaller screens.
  const campaignMenu = document.createElement("details");
  campaignMenu.id = "campaignMenu";
  campaignMenu.append(sheetElement("summary", "Campanha"));
  const menuBody = sheetElement("div", undefined, "campaign-menu-body");
  menuBody.append($("export"), $("leaveGame"));
  campaignMenu.append(menuBody);
  $("game").querySelector("header").append(campaignMenu);
  const collapse = sheetButton("Recolher painel", () => {
    $("layout").classList.toggle("sidebar-collapsed");
    collapse.textContent = $("layout").classList.contains("sidebar-collapsed")
      ? "Abrir painel"
      : "Recolher painel";
    collapse.setAttribute(
      "aria-expanded",
      String(!$("layout").classList.contains("sidebar-collapsed")),
    );
  });
  collapse.id = "collapseSidebar";
  collapse.setAttribute("aria-expanded", "true");
  $("game").querySelector("header").append(collapse);
  const resize = document.createElement("input");
  resize.id = "panelWidth";
  resize.type = "range";
  resize.min = 300;
  resize.max = 720;
  resize.value = 360;
  resize.setAttribute("aria-label", "Largura do painel");
  resize.oninput = () =>
    document.documentElement.style.setProperty(
      "--sidebar-width",
      resize.value + "px",
    );
  $("tableSidebar").append(resize);
  const workspaceNotice = sheetElement("p", undefined, "muted");
  workspaceNotice.id = "sheetConnection";
  workspaceNotice.setAttribute("role", "status");
  $("sheetsPanel").prepend(workspaceNotice);
  configureWorkspace = function () {
    workspaceToolbar.hidden = !hostMode;
    $("newScene").hidden = !hostMode;
    charCreation.hidden = !hostMode;
    $("identityRecovery").hidden = !hostMode;
    mapStart.hidden = !hostMode;
    campaignMenu.hidden = false;
    for (const b of $("toolButtons").children) b.disabled = !hostMode;
    participants.hidden = true;
  };
  renderWorkspace = function () {
    if (!$("boardEmpty")) return;
    boardEmpty.hidden =
      !!state.map || !!state.tokens.length || !!state.drawings.length;
    mapStart.hidden = !hostMode;
    $("sheetConnection").textContent = hostMode
      ? "Mestre · alterações compartilhadas com os jogadores autorizados"
      : hostLink?.open
        ? "Conectado · suas alterações são enviadas ao mestre"
        : "Sem conexão · rascunhos preservados até reconectar";
    if (selectedTokens.size || selectedToken || selectedDrawing >= 0) {
      if (!$("masterTools").hidden) openWorkspaceSection("properties");
    }
    renderSheetsStatus();
  };
  // Resource views are local UI state; no campaign or private player data is stored here.
  $("message").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("send").click();
    }
  });
  $("dice").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("roll").click();
  });
});
