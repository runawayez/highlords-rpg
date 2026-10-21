/* Universal sheets: host-authoritative field revisions, local drafts and modular editors. */
const sheetDrafts = new Map();
let sheetsFingerprint = "",
  sheetDraftSequence = 0;
const sheetKinds = {
  text: "Texto",
  number: "Número",
  notes: "Notas",
  resource: "Recurso atual / máximo",
  list: "Lista",
  inventory: "Inventário",
  portrait: "Retrato",
};
function validSheetValue(type, value, format) {
  if (typeof value !== "string" || value.length > 5000) return false;
  if (type === "portrait")
    return (
      !value ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
    );
  if (type === "number") return value === "" || Number.isFinite(Number(value));
  if (type === "resource") {
    try {
      const a = JSON.parse(value);
      return (
        Array.isArray(a) &&
        a.length === 2 &&
        a.every((v) => Number.isFinite(v) && Math.abs(v) <= 1e9)
      );
    } catch {
      return false;
    }
  }
  if (type === "inventory" || type === "list") {
    // Older campaigns used plain text; keep it readable and editable until converted explicitly.
    if (type === "inventory" && format !== "items") return true;
    try {
      const a = JSON.parse(value);
      return (
        Array.isArray(a) &&
        a.length <= 60 &&
        a.every(
          (r) =>
            r &&
            typeof r === "object" &&
            !Array.isArray(r) &&
            typeof r.name === "string" &&
            r.name.length <= 200 &&
            (type === "list"
              ? typeof r.done === "boolean"
              : Number.isFinite(r.quantity) &&
                r.quantity >= 0 &&
                r.quantity <= 1e6 &&
                typeof r.notes === "string" &&
                r.notes.length <= 500),
        )
      );
    } catch {
      return false;
    }
  }
  return true;
}
function sheetKey(id, fieldId) {
  return id + ":" + (fieldId || "text");
}
function sheetValue(id, fieldId) {
  const c = state.characters.find((c) => c.id === id);
  const f = fieldId ? c?.fields?.find((f) => f.id === fieldId) : c;
  return f
    ? {
        value: fieldId ? f.value : f.text,
        version: fieldId ? f.version || 0 : c.textVersion || 0,
        field: f,
        character: c,
      }
    : null;
}
function resetSheetDrafts() {
  for (const d of sheetDrafts.values()) clearTimeout(d.timer);
  sheetDrafts.clear();
  sheetsFingerprint = "";
}
function sheetReply(playerId, p, status) {
  const result = {
    kind: "sheet-result",
    id: p.id,
    fieldId: p.fieldId || null,
    requestId: p.requestId,
    status,
  };
  if (playerId === myId) receiveSheetReply(result);
  else
    for (const c of contacts.values())
      if (c.playerId === playerId && c.open) {
        try { c.send(result); sendView(c); } catch { /* Reconnection reconciles uncertain acknowledgements. */ }
      }
}
function receiveSheetReply(m) {
  const d = sheetDrafts.get(sheetKey(m.id, m.fieldId));
  if (!d || d.requestId !== m.requestId) return;
  d.pending = false;
  if (m.status === "saved") {
    // An acknowledgement may arrive after the user has continued typing.
    d.baseVersion = d.sentVersion + 1;
    d.baseValue = d.sentValue;
    d.conflict = false;
    d.error = false;
    if (d.value === d.sentValue) {
      clearTimeout(d.timer);
      sheetDrafts.delete(sheetKey(m.id, m.fieldId));
    } else d.timer = setTimeout(() => saveSheetDraft(m.id, m.fieldId), 700);
  } else {
    d.conflict = m.status === "conflict";
    d.error = m.status !== "conflict";
  }
  renderSheetsStatus();
}
function editSheetDraft(id, fieldId, value) {
  const current = sheetValue(id, fieldId);
  if (!current) return;
  const key = sheetKey(id, fieldId);
  let d = sheetDrafts.get(key);
  if (!d) {
    d = {
      id,
      fieldId,
      value,
      baseVersion: current.version,
      baseValue: current.value,
    };
    sheetDrafts.set(key, d);
  }
  d.value = value;
  d.error = false;
  clearTimeout(d.timer);
  if (!d.conflict && !d.pending)
    d.timer = setTimeout(() => saveSheetDraft(id, fieldId), 700);
  renderSheetsStatus();
}
function saveSheetDraft(id, fieldId, resolve = false) {
  const key = sheetKey(id, fieldId),
    d = sheetDrafts.get(key),
    current = sheetValue(id, fieldId);
  if (!d || !current || d.pending) return;
  if (!validSheetValue(fieldId ? current.field.type : 'notes', d.value, d.format || current.field.format)) { d.error=true; renderSheetsStatus(); return; }
  if (d.conflict && !resolve) return;
  if (!hostMode && !hostLink?.open) {
    d.offline = true;
    renderSheetsStatus();
    return;
  }
  if (resolve) {
    d.baseVersion = current.version;
    d.conflict = false;
  }
  d.offline = false;
  d.pending = true;
  d.sentValue = d.value;
  d.sentVersion = d.baseVersion;
  d.requestId = String(++sheetDraftSequence);
  clearTimeout(d.timer);
  dispatch(fieldId ? "character:field" : "character:update", {
    id,
    fieldId: fieldId || undefined,
    format: d.format,
    [fieldId ? "value" : "text"]: d.value,
    baseVersion: d.baseVersion,
    requestId: d.requestId,
  });
  renderSheetsStatus();
}
function renderSheetsStatus() {
  document.querySelectorAll("[data-sheet-status]").forEach((el) => {
    const d = sheetDrafts.get(el.dataset.sheetStatus);
    el.replaceChildren();
    if (!d) {
      el.textContent = "Sincronizado";
      return;
    }
    if (d.conflict) {
      el.append(
        document.createTextNode(
          "Este campo mudou em outro navegador. Seu rascunho foi preservado. ",
        ),
      );
      const use = document.createElement("button");
      use.textContent = "Aplicar meu rascunho";
      use.onclick = () => saveSheetDraft(d.id, d.fieldId, true);
      const remote = document.createElement("button");
      remote.textContent = "Usar valor recebido";
      remote.onclick = () => {
        clearTimeout(d.timer);
        sheetDrafts.delete(el.dataset.sheetStatus);
        sheetsFingerprint = "";
        render();
      };
      el.append(use, remote);
    } else
      el.textContent = d.error
        ? "Valor inválido. Revise o campo."
        : !hostMode && !hostLink?.open
          ? "Sem conexão · rascunho neste navegador"
          : d.pending
            ? "Enviando…"
            : "Rascunho · aguardando envio";
    el.classList.toggle("conflict", !!d.conflict);
  });
}
function sheetElement(tag, text, cls) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
function sheetButton(text, fn) {
  const b = sheetElement("button", text);
  b.type = "button";
  b.onclick = fn;
  return b;
}
function bindSheetInput(input, c, f) {
  const id = f?.id,
    key = sheetKey(c.id, id),
    current = sheetValue(c.id, id),
    d = sheetDrafts.get(key);
  input.value = d?.value ?? current.value;
  input.dataset.draftKey = key;
  input.disabled =
    !hostMode && (c.owner !== myId || f?.editableByOwner === false);
  input.oninput = () => editSheetDraft(c.id, id, input.value);
  return input;
}
function renderSheetBlock(c, f) {
  const box = sheetElement("div", undefined, "sheet-block");
  const heading = sheetElement("div", undefined, "block-heading");
  heading.append(sheetElement("label", f.name));
  if (f.visibility === "master")
    heading.append(sheetElement("span", "Só mestre", "badge"));
  box.append(heading);
  const allowed = hostMode || (c.owner === myId && f.editableByOwner !== false);
  const key = sheetKey(c.id, f.id),
    value = sheetDrafts.get(key)?.value ?? f.value;
  function emit(v) {
    editSheetDraft(c.id, f.id, v);
  }
  if (f.type === "portrait") {
    if (value) {
      const image = sheetElement("img");
      image.src = value;
      image.alt = f.name;
      image.className = "sheet-portrait";
      box.append(image);
    }
    if (allowed) {
      const upload = sheetElement("input");
      upload.type = "file";
      upload.accept = "image/png,image/jpeg,image/webp";
      upload.setAttribute("aria-label", "Enviar " + f.name);
      upload.onchange = async () => {
        const file = upload.files[0];
        if (!file) return;
        if (file.size > 1000000) return announce("Retrato acima de 1 MB");
        try {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 64;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0, 64, 64);
          bitmap.close();
          const data = canvas.toDataURL("image/webp", 0.65);
          if (data.length > 5000)
            return announce("Escolha um retrato mais simples");
          emit(data);
          sheetsFingerprint = "";
          render();
        } catch {
          announce("Não foi possível abrir o retrato");
        }
      };
      box.append(upload);
    }
  } else if (f.type === "resource") {
    let pair;
    try {
      pair = JSON.parse(value);
    } catch {
      pair = [0, 0];
    }
    const row = sheetElement("div", undefined, "resource-row");
    for (let i = 0; i < 2; i++) {
      const input = sheetElement("input");
      input.type = "number";
      input.value = pair[i];
      input.disabled = !allowed;
      input.setAttribute("aria-label", f.name + (i ? " máximo" : " atual"));
      input.dataset.draftKey = key + "-" + i;
      input.oninput = () => {
        pair[i] = Number(input.value);
        emit(JSON.stringify(pair));
      };
      row.append(input);
      if (!i) row.append(sheetElement("span", "/"));
    }
    box.append(row);
  } else if (["inventory", "list"].includes(f.type) && (f.type === "list" || (sheetDrafts.get(key)?.format || f.format) === "items")) {
    let rows;
    try {
      rows = JSON.parse(value);
    } catch {
      rows = [];
    }
    const list = sheetElement("div", undefined, "sheet-items");
    const commit = () => emit(JSON.stringify(rows));
    function draw() {
      list.replaceChildren();
      rows.forEach((item, i) => {
        const row = sheetElement("div", undefined, "item-row");
        if (f.type === "list") {
          const done = sheetElement("input");
          done.type = "checkbox";
          done.checked = item.done;
          done.disabled = !allowed;
          done.setAttribute("aria-label", "Concluir item " + (i + 1));
          done.onchange = () => {
            item.done = done.checked;
            commit();
          };
          row.append(done);
        }
        const name = sheetElement("input");
        name.value = item.name;
        name.placeholder = "Nome";
        name.maxLength = 200;
        name.disabled = !allowed;
        name.setAttribute("aria-label", f.name + " item " + (i + 1));
        name.dataset.draftKey = key + "-name-" + i;
        name.oninput = () => {
          item.name = name.value;
          commit();
        };
        row.append(name);
        if (f.type === "inventory") {
          const qty = sheetElement("input");
          qty.type = "number";
          qty.min = 0;
          qty.max = 1000000;
          qty.value = item.quantity;
          qty.dataset.draftKey = key + "-quantity-" + i;
          qty.disabled = !allowed;
          qty.setAttribute("aria-label", "Quantidade do item " + (i + 1));
          qty.oninput = () => {
            item.quantity = Number(qty.value);
            commit();
          };
          const notes = sheetElement("input");
          notes.value = item.notes;
          notes.dataset.draftKey = key + "-notes-" + i;
          notes.maxLength = 500;
          notes.placeholder = "Observações";
          notes.disabled = !allowed;
          notes.setAttribute("aria-label", "Observações do item " + (i + 1));
          notes.oninput = () => {
            item.notes = notes.value;
            commit();
          };
          row.append(qty, notes);
        }
        if (allowed)
          row.append(
            sheetButton("Remover item", () => {
              rows.splice(i, 1);
              commit();
              draw();
            }),
          );
        list.append(row);
      });
    }
    draw();
    box.append(list);
    if (allowed)
      box.append(
        sheetButton("Adicionar item", () => {
          if (rows.length >= 60) return;
          rows.push(
            f.type === "list"
              ? { name: "", done: false }
              : { name: "", quantity: 1, notes: "" },
          );
          commit();
          draw();
        }),
      );
  } else {
    const input = sheetElement(
      ["notes", "inventory", "list"].includes(f.type) ? "textarea" : "input",
    );
    if (input.tagName === "INPUT")
      input.type = f.type === "number" && (value === "" || Number.isFinite(Number(value))) ? "number" : "text";
    input.setAttribute("aria-label", f.name);
    input.maxLength = 5000;
    bindSheetInput(input, c, f);
    box.append(input);
    if (allowed && ["inventory", "list"].includes(f.type))
      box.append(
        sheetButton("Converter texto em itens", () => {
          const rows = input.value
            .split("\n")
            .filter(Boolean)
            .slice(0, 60)
            .map((name) =>
              f.type === "list"
                ? { name: name.slice(0, 200), done: false }
                : { name: name.slice(0, 200), quantity: 1, notes: "" },
            );
          emit(JSON.stringify(rows));
          sheetDrafts.get(key).format="items";
          sheetsFingerprint = "";
          render();
        }),
      );
  }
  const status = sheetElement("div", undefined, "field-status");
  status.dataset.sheetStatus = key;
  status.setAttribute("role", "status");
  box.append(status);
  if (allowed)
    box.append(
      sheetButton("Salvar " + f.name, () => saveSheetDraft(c.id, f.id)),
    );
  if (hostMode) {
    const actions = sheetElement("div", undefined, "block-actions");
    actions.append(
      sheetButton("Subir", () =>
        dispatch("character:field:order", {
          id: c.id,
          fieldId: f.id,
          direction: -1,
        }),
      ),
      sheetButton("Descer", () =>
        dispatch("character:field:order", {
          id: c.id,
          fieldId: f.id,
          direction: 1,
        }),
      ),
      sheetButton("Excluir campo", () => {
        if (confirm("Excluir o campo " + f.name + "?"))
          dispatch("character:field:remove", { id: c.id, fieldId: f.id });
      }),
    );
    box.append(actions);
    const settings = sheetElement("details", undefined, "block-settings");
    settings.dataset.details = c.id + ":" + f.id;
    settings.append(sheetElement("summary", "Configurar campo"));
    const name = sheetElement("input");
    name.value = f.name;
    name.maxLength = 50;
    name.setAttribute("aria-label", "Nome do campo " + f.name);
    const group = sheetElement("input");
    group.value = f.section || "";
    group.maxLength = 40;
    group.setAttribute("aria-label", "Seção de " + f.name);
    const visibility = sheetElement("select");
    visibility.setAttribute("aria-label", "Acesso a " + f.name);
    for (const [value, label] of [
      ["owner", "Jogador e mestre"],
      ["master", "Apenas mestre"],
    ]) {
      const option = sheetElement("option", label);
      option.value = value;
      visibility.append(option);
    }
    visibility.value = f.visibility || "owner";
    const editable = sheetElement("input");
    editable.type = "checkbox";
    editable.checked = f.editableByOwner !== false;
    editable.setAttribute("aria-label", "Permitir editar " + f.name);
    const editLabel = sheetElement("label", " Jogador pode editar");
    editLabel.prepend(editable);
    [name, group, visibility, editable].forEach((el, i) => {
      el.dataset.builder = c.id + ":" + f.id + ":" + i;
    });
    settings.append(
      name,
      group,
      visibility,
      editLabel,
      sheetButton("Aplicar configuração", () =>
        dispatch("character:field:configure", {
          id: c.id,
          fieldId: f.id,
          name: name.value,
          section: group.value,
          visibility: visibility.value,
          editableByOwner: editable.checked,
        }),
      ),
    );
    box.append(settings);
  }
  return box;
}
function renderSheets(players) {
  // Reconcile only permitted fields. Clear drafts immediately when ownership is revoked.
  for (const [key, d] of sheetDrafts) {
    const current = sheetValue(d.id, d.fieldId);
    if (
      !current ||
      (!hostMode &&
        (current.character.owner !== myId ||
          current.field.visibility === "master" ||
          current.field.editableByOwner === false))
    ) {
      clearTimeout(d.timer);
      sheetDrafts.delete(key);
      continue;
    }
    if (!d.pending && current.version !== d.baseVersion) {
      d.conflict = true;
      clearTimeout(d.timer);
    }
  }
  const fingerprint = JSON.stringify([state.characters, players, hostMode]);
  if (fingerprint === sheetsFingerprint) {
    renderSheetsStatus();
    return;
  }
  sheetsFingerprint = fingerprint;
  const focused = document.activeElement,
    focusKey = focused?.dataset.draftKey,
    focusBuilder = focused?.dataset.builder,
    selection = focused?.selectionStart,
    scroll = $("sheetsPanel").scrollTop;
  // Builder controls are local UI state; preserve them across any remote update.
  const openDetails = new Set(
    [...$("characters").querySelectorAll("details[open][data-details]")].map(
      (el) => el.dataset.details,
    ),
  );
  const builderValues = new Map(
    [...$("characters").querySelectorAll("[data-builder]")].map((e) => [
      e.dataset.builder,
      e.type === "checkbox" ? e.checked : e.value,
    ]),
  );
  const ch = $("characters");
  ch.replaceChildren();
  if (!state.characters.length)
    ch.append(
      sheetElement(
        "p",
        hostMode
          ? "Crie uma ficha livre e adicione os blocos que sua mesa usa."
          : "O mestre pode criar e atribuir sua ficha.",
        "empty-state",
      ),
    );
  for (const c of state.characters) {
    const card = sheetElement("article", undefined, "char");
    card.dataset.character = c.id;
    const head = sheetElement("div", undefined, "sheet-title");
    head.append(sheetElement("strong", c.name));
    card.append(head);
    if (hostMode) {
      const selector = sheetElement("select");
      selector.setAttribute("aria-label", "Responsável por " + c.name);
      for (const x of [{ id: "", name: "Sem dono" }, ...players]) {
        const option = sheetElement("option", x.name);
        option.value = x.id;
        selector.append(option);
      }
      if (c.owner && !players.some((x) => x.id === c.owner)) {
        const option = sheetElement("option", "Jogador ausente");
        option.value = c.owner;
        selector.append(option);
      }
      selector.value = c.owner;
      selector.onchange = () =>
        dispatch("character:assign", { id: c.id, playerId: selector.value });
      card.append(selector);
      head.append(
        sheetButton("Renomear", () => {
          const name = prompt("Nome do personagem", c.name);
          if (name) dispatch("character:rename", { id: c.id, name });
        }),
        sheetButton("Duplicar / usar como modelo", () =>
          dispatch("character:duplicate", { id: c.id }),
        ),
      );
    }
    const text = bindSheetInput(sheetElement("textarea"), c);
    text.setAttribute("aria-label", "Descrição de " + c.name);
    text.placeholder = "História, aparência e anotações do personagem";
    text.maxLength = 5000;
    card.append(text);
    const status = sheetElement("div", undefined, "field-status");
    status.dataset.sheetStatus = sheetKey(c.id);
    status.setAttribute("role", "status");
    card.append(status);
    if (hostMode || c.owner === myId)
      card.append(sheetButton("Salvar ficha", () => saveSheetDraft(c.id)));
    let group = "";
    for (const f of c.fields || []) {
      if (!hostMode && f.visibility === "master") continue;
      if (f.section && group !== f.section) {
        group = f.section;
        card.append(sheetElement("h4", group, "sheet-section"));
      }
      card.append(renderSheetBlock(c, f));
    }
    if (hostMode) {
      const builder = sheetElement("details", undefined, "block-builder");
      builder.dataset.details = c.id + ":new";
      builder.open = !(c.fields || []).length;
      builder.append(sheetElement("summary", "Adicionar bloco"));
      const name = sheetElement("input");
      name.placeholder = "Novo campo";
      name.setAttribute("aria-label", "Novo campo da ficha");
      name.maxLength = 50;
      const type = sheetElement("select");
      type.setAttribute("aria-label", "Tipo de campo");
      for (const [value, label] of Object.entries(sheetKinds)) {
        const op = sheetElement("option", label);
        op.value = value;
        type.append(op);
      }
      const group = sheetElement("input");
      group.placeholder = "Seção (opcional)";
      group.maxLength = 40;
      group.setAttribute("aria-label", "Seção do campo");
      const visibility = sheetElement("select");
      visibility.setAttribute("aria-label", "Visibilidade do campo");
      for (const [value, label] of [
        ["owner", "Jogador e mestre"],
        ["master", "Apenas mestre"],
      ]) {
        const op = sheetElement("option", label);
        op.value = value;
        visibility.append(op);
      }
      const editable = sheetElement("input");
      editable.type = "checkbox";
      editable.checked = true;
      const editLabel = sheetElement("label", " Jogador pode editar");
      editLabel.prepend(editable);
      [name, type, group, visibility, editable].forEach((el, i) => {
        el.dataset.builder = c.id + ":" + i;
        if (builderValues.has(el.dataset.builder)) {
          if (el.type === "checkbox")
            el.checked = builderValues.get(el.dataset.builder);
          else el.value = builderValues.get(el.dataset.builder);
        }
      });
      builder.append(
        name,
        type,
        group,
        visibility,
        editLabel,
        sheetButton("+ Campo", () =>
          dispatch("character:field:add", {
            id: c.id,
            name: name.value,
            type: type.value,
            section: group.value,
            visibility: visibility.value,
            editableByOwner: editable.checked,
          }),
        ),
      );
      card.append(builder);
    }
    ch.append(card);
  }
  for (const el of ch.querySelectorAll("[data-builder]"))
    if (builderValues.has(el.dataset.builder)) {
      if (el.type === "checkbox")
        el.checked = builderValues.get(el.dataset.builder);
      else el.value = builderValues.get(el.dataset.builder);
    }
  for (const el of ch.querySelectorAll("details[data-details]"))
    if (openDetails.has(el.dataset.details)) el.open = true;
  renderSheetsStatus();
  $("sheetsPanel").scrollTop = scroll;
  if (focusKey || focusBuilder) {
    const target = [
      ...ch.querySelectorAll("[data-draft-key],[data-builder]"),
    ].find((e) =>
      focusKey
        ? e.dataset.draftKey === focusKey
        : e.dataset.builder === focusBuilder,
    );
    if (target) {
      target.focus({ preventScroll: true });
      try {
        target.setSelectionRange(selection, selection);
      } catch {}
    }
  }
}
function suspendSheetDrafts() {
  for (const d of sheetDrafts.values()) {
    clearTimeout(d.timer);
    d.pending = false;
    d.offline = true;
  }
  renderSheetsStatus();
}
function resumeSheetDrafts() {
  for (const [key, d] of sheetDrafts) {
    const current = sheetValue(d.id, d.fieldId);
    if (!current) continue;
    d.pending = false;
    d.offline = false;
    if (
      current.version === d.sentVersion + 1 &&
      current.value === d.sentValue
    ) {
      if (d.value === d.sentValue) {
        sheetDrafts.delete(key);
        continue;
      }
      d.baseVersion = current.version;
    } else if (current.version !== d.baseVersion) {
      d.conflict = true;
      continue;
    }
    if (!d.conflict)
      d.timer = setTimeout(() => saveSheetDraft(d.id, d.fieldId), 700);
  }
  renderSheetsStatus();
}
