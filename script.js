const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const isChecklist = document.getElementById("isChecklist");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesContainer = document.getElementById("notesContainer");
const searchInput = document.getElementById("searchInput");
const darkModeToggle = document.getElementById("darkModeToggle");

// State
let notes = JSON.parse(localStorage.getItem("notes")) || [];
// Backfill ids for data without ids
notes.forEach(n => { if (!n.id) n.id = crypto.randomUUID(); });

let isEditing = false;
let editingIndex = null;

// Colors
const colors = ["#fce1e4", "#d9f0ff", "#fff4e6", "#e4f9f5", "#f3e8ff", "#fef9c3"];

// Theme persistence
const THEME_KEY = "theme";
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "dark") {
    document.body.classList.add("dark");
    darkModeToggle.setAttribute("aria-pressed", "true");
}
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    darkModeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
});

// Save notes to localStorage
function saveNotes() {
    localStorage.setItem("notes", JSON.stringify(notes));
}

// Clear input fields
function clearInputs() {
    noteTitle.value = "";
    noteContent.value = "";
    isChecklist.checked = false;
}

// Render notes
function renderNotes(filter = "") {
    notesContainer.innerHTML = "";

    const q = filter.trim().toLowerCase();
    searchInput.style.display = notes.length > 2 ? "inline-block" : "none";

    const filtered = notes
        .filter(n => {
            const inTitle = (n.title || "").toLowerCase().includes(q);
            if (n.checklist) {
                const itemsText = n.items.map(i => i.text.toLowerCase()).join(" ");
                return inTitle || itemsText.includes(q);
            }
            return inTitle || (n.content || "").toLowerCase().includes(q);
        })
        .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

    if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = q ? "No matching notes." : "No notes yet. Create one above!";
        notesContainer.appendChild(empty);
        return;
    }

    filtered.forEach(note => {
        const index = notes.findIndex(n => n.id === note.id);

        const noteDiv = document.createElement("div");
        noteDiv.className = "note";
        noteDiv.style.background = colors[index % colors.length];

        if (note.isPinned) {
            const badge = document.createElement("div");
            badge.className = "pin-badge";
            badge.setAttribute("aria-label", "Pinned");
            badge.textContent = "📌 Pinned";
            noteDiv.appendChild(badge);
        }

        const h3 = document.createElement("h3");
        h3.textContent = note.title || "Untitled";
        noteDiv.appendChild(h3);

        if (note.checklist) {
            const cl = document.createElement("div");
            cl.className = "checklist";

            note.items.forEach((item, itemIndex) => {
                const label = document.createElement("label");
                label.className = "checklist-item";

                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = !!item.checked;
                cb.addEventListener("change", () => toggleChecklistItem(index, itemIndex));

                const span = document.createElement("span");
                span.textContent = item.text;

                label.append(cb, span);
                cl.appendChild(label);
            });

            const addWrap = document.createElement("div");
            addWrap.className = "add-checklist-item";

            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "Add new item...";
            input.id = `newItem-${note.id}`;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "+";
            btn.addEventListener("click", () => addChecklistItem(index, input));

            addWrap.append(input, btn);
            cl.appendChild(addWrap);
            noteDiv.appendChild(cl);
        } else {
            const p = document.createElement("p");
            p.textContent = note.content || "";
            noteDiv.appendChild(p);
        }

        const actions = document.createElement("div");
        actions.className = "note-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "edit-btn";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => editNote(index));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "delete-btn";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => {
            if (confirm("Delete this note?")) deleteNote(index);
        });

        const pinBtn = document.createElement("button");
        pinBtn.type = "button";
        pinBtn.textContent = note.isPinned ? "Unpin" : "Pin";
        pinBtn.addEventListener("click", () => togglePin(index));

        // const expBtn = document.createElement("button");
        // expBtn.type = "button";
        // expBtn.textContent = "Export";
        // expBtn.addEventListener("click", () => exportNote(index));

        actions.append(editBtn, delBtn, pinBtn);
        noteDiv.appendChild(actions);

        notesContainer.appendChild(noteDiv);
    });
}

// Add or update note
function addOrUpdateNote() {
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    if (!title && !content) return;

    let newNote;

    if (isChecklist.checked) {
        const items = content
            .split("\n")
            .map(line => ({ text: line.trim(), checked: false }))
            .filter(item => item.text !== "");

        newNote = {
            id: isEditing ? notes[editingIndex].id : crypto.randomUUID(),
            title,
            checklist: true,
            items,
            isPinned: isEditing ? notes[editingIndex].isPinned : false
        };
    } else {
        newNote = {
            id: isEditing ? notes[editingIndex].id : crypto.randomUUID(),
            title,
            content,
            checklist: false,
            isPinned: isEditing ? notes[editingIndex].isPinned : false
        };
    }

    if (isEditing) {
        notes[editingIndex] = newNote;
        isEditing = false;
        editingIndex = null;
        addNoteBtn.innerText = "Add Note";
    } else {
        notes.unshift(newNote);
    }

    saveNotes();
    clearInputs();
    renderNotes(searchInput.value);
}

// Toggle checklist item checked state
function toggleChecklistItem(noteIndex, itemIndex) {
    notes[noteIndex].items[itemIndex].checked = !notes[noteIndex].items[itemIndex].checked;
    saveNotes();
    renderNotes(searchInput.value);
}

// Add checklist item from input
function addChecklistItem(noteIndex, inputEl) {
    const text = inputEl.value.trim();
    if (!text) return;
    notes[noteIndex].items.push({ text, checked: false });
    saveNotes();
    renderNotes(searchInput.value);
}

// Edit note - populate inputs and prepare for update
function editNote(index) {
    noteTitle.value = notes[index].title || "";
    if (notes[index].checklist) {
        noteContent.value = notes[index].items.map(i => i.text).join("\n");
        isChecklist.checked = true;
    } else {
        noteContent.value = notes[index].content || "";
        isChecklist.checked = false;
    }
    isEditing = true;
    editingIndex = index;
    addNoteBtn.innerText = "Update Note";
    noteTitle.focus();
}

// Delete note with confirmation
function deleteNote(index) {
    notes.splice(index, 1);
    saveNotes();
    renderNotes(searchInput.value);
}

// Toggle pin/unpin note
function togglePin(index) {
    notes[index].isPinned = !notes[index].isPinned;
    saveNotes();
    renderNotes(searchInput.value);
}

/*
// Export note as .txt file
function exportNote(index) {
  const note = notes[index];
  let content = "";
  if (note.checklist) {
    content = note.items.map(item => `${item.checked ? "[x]" : "[ ]"} ${item.text}`).join("\n");
  } else {
    content = note.content || "";
  }
  const blob = new Blob([`${note.title}\n\n${content}`], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${note.title || "note"}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

*/

// Event listeners
searchInput.addEventListener("input", () => renderNotes(searchInput.value));
addNoteBtn.addEventListener("click", addOrUpdateNote);

// Initial render
renderNotes();
