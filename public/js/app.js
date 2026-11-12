// ============================================================
// Smart Wall Paint Visualizer - front-end logic
// ============================================================

const MAX_CANVAS_WIDTH = 1100;   // keeps big phone photos fast
const CLOSE_DISTANCE = 14;       // px: click this close to the first point to close a wall

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const fileInput = $('fileInput');
const placeholder = $('placeholder');
const finishBtn = $('finishBtn');
const undoPointBtn = $('undoPointBtn');
const clearBtn = $('clearBtn');
const saveBtn = $('saveBtn');
const downloadBtn = $('downloadBtn');
const guidesToggle = $('guidesToggle');
const opacityInput = $('opacity');
const blendSelect = $('blend');

// ---------- State ----------
let image = null;            // the loaded HTMLImageElement
let originalFile = null;     // File/Blob of the original photo (for saving)
let colors = [];             // palette from the server
let walls = [];              // [{ points:[{x,y}], color, colorName }]
let current = [];            // points of the wall being drawn
let selectedWall = -1;       // index in walls
let activeColor = { hex: '#3D7EA6', name: 'Ocean Blue' };
let hoverPoint = null;       // mouse position for the live preview line

// ---------- Helpers ----------
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// Convert a mouse/touch event into canvas pixel coordinates
function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updateButtons() {
  const hasImage = !!image;
  finishBtn.disabled = current.length < 3;
  undoPointBtn.disabled = current.length === 0;
  clearBtn.disabled = !hasImage || (walls.length === 0 && current.length === 0);
  saveBtn.disabled = !hasImage || walls.length === 0;
  downloadBtn.disabled = !hasImage || walls.length === 0;
}

// ---------- Drawing ----------
function paintWalls() {
  const alpha = Number(opacityInput.value) / 100;
  const mode = blendSelect.value;

  walls.forEach(wall => {
    if (wall.points.length < 3) return;
    ctx.save();
    ctx.beginPath();
    wall.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = wall.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  });
}

function drawGuides() {
  // Finished walls
  walls.forEach((wall, index) => {
    ctx.beginPath();
    wall.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.lineWidth = index === selectedWall ? 3 : 1.5;
    ctx.strokeStyle = index === selectedWall ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.setLineDash(index === selectedWall ? [] : [6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Wall in progress
  if (current.length) {
    ctx.beginPath();
    current.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    if (hoverPoint) ctx.lineTo(hoverPoint.x, hoverPoint.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();

    current.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === 0 ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#ff6b6b' : '#ffd166';
      ctx.fill();
      ctx.strokeStyle = '#23262b';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
}

// showGuides=false gives a clean image for saving / downloading
function render(showGuides = guidesToggle.checked) {
  if (!image) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  paintWalls();
  // In-progress points are always shown, otherwise the user can't see what they're doing
  if (showGuides || current.length) drawGuides();
  updateButtons();
}

// Draws a clean result (no outlines) and returns a PNG Blob
function cleanBlob() {
  return new Promise(resolve => {
    // Draw without outlines or in-progress points
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    paintWalls();
    canvas.toBlob(blob => {
      render();               // restore the normal view
      resolve(blob);
    }, 'image/png');
  });
}

// ---------- Image loading ----------
function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
}

function setImage(img) {
  image = img;
  const scale = Math.min(1, MAX_CANVAS_WIDTH / img.naturalWidth);
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.style.display = 'block';
  placeholder.style.display = 'none';
  walls = [];
  current = [];
  selectedWall = -1;
  renderWallList();
  render();
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return toast('Image is larger than 10 MB');
  originalFile = file;
  const url = URL.createObjectURL(file);
  try {
    setImage(await loadImageFromUrl(url));
  } catch (e) {
    toast(e.message);
  }
});

// ---------- Wall drawing (mouse + touch) ----------
function addPoint(evt) {
  if (!image) return;
  const p = canvasPoint(evt);

  // Close the shape when the first point is clicked again
  if (current.length >= 3 && distance(p, current[0]) <= CLOSE_DISTANCE) {
    return finishWall();
  }
  current.push(p);
  render();
}

function finishWall() {
  if (current.length < 3) return;
  walls.push({ points: current, color: activeColor.hex, colorName: activeColor.name });
  current = [];
  selectedWall = walls.length - 1;
  hoverPoint = null;
  renderWallList();
  render();
}

canvas.addEventListener('click', addPoint);
canvas.addEventListener('dblclick', evt => {
  evt.preventDefault();
  // The two clicks of a double-click already added points; drop the duplicate
  if (current.length > 3) current.pop();
  finishWall();
});
canvas.addEventListener('mousemove', evt => {
  if (!current.length) return;
  hoverPoint = canvasPoint(evt);
  render();
});
canvas.addEventListener('mouseleave', () => {
  hoverPoint = null;
  render();
});

finishBtn.addEventListener('click', finishWall);
undoPointBtn.addEventListener('click', () => {
  current.pop();
  render();
});
clearBtn.addEventListener('click', () => {
  if (!confirm('Remove all walls?')) return;
  walls = [];
  current = [];
  selectedWall = -1;
  renderWallList();
  render();
});

// Keyboard shortcuts
document.addEventListener('keydown', evt => {
  if (evt.target.tagName === 'INPUT') return;
  if (evt.key === 'Enter') finishWall();
  if (evt.key === 'Escape') { current = []; render(); }
  if (evt.key === 'Backspace' || (evt.ctrlKey && evt.key === 'z')) {
    evt.preventDefault();
    current.pop();
    render();
  }
});

// ---------- Wall list ----------
function renderWallList() {
  const list = $('wallList');
  list.innerHTML = '';
  $('wallEmpty').style.display = walls.length ? 'none' : 'block';

  walls.forEach((wall, i) => {
    const li = document.createElement('li');
    if (i === selectedWall) li.classList.add('selected');
    li.innerHTML = `
      <span class="dot" style="background:${wall.color}"></span>
      <span class="grow">Wall ${i + 1} – ${wall.colorName}</span>
      <button class="danger" title="Delete wall">✕</button>`;
    li.addEventListener('click', () => {
      selectedWall = i;
      renderWallList();
      render();
    });
    li.querySelector('button').addEventListener('click', evt => {
      evt.stopPropagation();
      walls.splice(i, 1);
      selectedWall = -1;
      renderWallList();
      render();
    });
    list.appendChild(li);
  });
}

// ---------- Colours ----------
function setActiveColor(hex, name) {
  activeColor = { hex, name };
  $('chip').style.background = hex;
  $('chipName').textContent = `${name} (${hex})`;

  // Repaint the selected wall straight away
  if (selectedWall >= 0 && walls[selectedWall]) {
    walls[selectedWall].color = hex;
    walls[selectedWall].colorName = name;
    renderWallList();
    render();
  }
  document.querySelectorAll('.swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.hex.toLowerCase() === hex.toLowerCase())
  );
}

async function loadColors() {
  const res = await fetch('/api/colors');
  colors = await res.json();
  const box = $('swatches');
  box.innerHTML = '';
  colors.forEach(c => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = c.hex;
    b.title = `${c.name} (${c.hex})`;
    b.dataset.hex = c.hex;
    b.addEventListener('click', () => setActiveColor(c.hex, c.name));
    box.appendChild(b);
  });
  if (colors.length) setActiveColor(colors[0].hex, colors[0].name);
}

$('customColor').addEventListener('input', evt => setActiveColor(evt.target.value.toUpperCase(), 'Custom'));

opacityInput.addEventListener('input', () => {
  $('opacityVal').textContent = opacityInput.value;
  render();
});
blendSelect.addEventListener('change', () => render());
guidesToggle.addEventListener('change', () => render());

// ---------- Download ----------
downloadBtn.addEventListener('click', async () => {
  const blob = await cleanBlob();
  const link = document.createElement('a');
  const name = ($('titleInput').value.trim() || 'painted-room').replace(/[^\w\-]+/g, '_');
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.png`;
  link.click();
  URL.revokeObjectURL(link.href);
});

// ---------- Save to server ----------
saveBtn.addEventListener('click', async () => {
  if (!image || !walls.length) return;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const resultBlob = await cleanBlob();

    // Make sure we have the original photo as a Blob (also works for re-opened projects)
    let original = originalFile;
    if (!original) {
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      tmp.getContext('2d').drawImage(image, 0, 0, tmp.width, tmp.height);
      original = await new Promise(r => tmp.toBlob(r, 'image/jpeg', 0.92));
    }

    // Store points as 0-1 fractions so they work at any image size
    const savedWalls = walls.map(w => ({
      colorHex: w.color,
      colorName: w.colorName,
      points: w.points.map(p => ({ x: p.x / canvas.width, y: p.y / canvas.height }))
    }));

    const form = new FormData();
    form.append('original', original, original.name || 'original.jpg');
    form.append('result', resultBlob, 'result.png');
    form.append('title', $('titleInput').value.trim() || 'Untitled room');
    form.append('walls', JSON.stringify(savedWalls));
    form.append('opacity', Number(opacityInput.value) / 100);
    form.append('blendMode', blendSelect.value);

    const res = await fetch('/api/projects', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Save failed');

    toast('Project saved ✔');
    originalFile = null; // next save will rebuild from the canvas image if needed
    loadGallery();
  } catch (err) {
    toast(err.message);
  } finally {
    saveBtn.textContent = '💾 Save project';
    updateButtons();
  }
});

// ---------- Saved projects gallery ----------
async function loadGallery() {
  const res = await fetch('/api/projects');
  const projects = await res.json();
  const gallery = $('gallery');
  gallery.innerHTML = '';
  $('galleryEmpty').style.display = projects.length ? 'none' : 'block';

  projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.resultImage}" alt="${p.title}" />
      <div class="meta"><strong>${p.title}</strong>${new Date(p.createdAt).toLocaleDateString()}</div>
      <div class="actions">
        <button data-open>Open</button>
        <a href="${p.resultImage}" download="${p.title.replace(/[^\w\-]+/g, '_')}.png">Download</a>
      </div>`;
    card.querySelector('[data-open]').addEventListener('click', () => openProject(p._id));
    gallery.appendChild(card);
  });
}

async function openProject(id) {
  try {
    const res = await fetch('/api/projects/' + id);
    const p = await res.json();
    if (!res.ok) throw new Error(p.message);

    const img = await loadImageFromUrl(p.originalImage);
    originalFile = null;
    setImage(img);

    opacityInput.value = Math.round(p.opacity * 100);
    $('opacityVal').textContent = opacityInput.value;
    blendSelect.value = p.blendMode;
    $('titleInput').value = p.title;

    walls = p.walls.map(w => ({
      color: w.colorHex,
      colorName: w.colorName,
      points: w.points.map(pt => ({ x: pt.x * canvas.width, y: pt.y * canvas.height }))
    }));
    renderWallList();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Project opened');
  } catch (err) {
    toast(err.message);
  }
}

// ---------- Start ----------
loadColors();
loadGallery();
updateButtons();
renderWallList();