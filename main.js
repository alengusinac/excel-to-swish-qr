import './style.css';
import * as XLSX from 'xlsx/xlsx.mjs';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

const FETCH_URL = 'https://backend-uspg.onrender.com/swish/generate-qr';
const MAX_FIELD_LENGTH = 50;

const form = document.querySelector('#form');
const submitButton = form.querySelector('button[type="submit"]');
const statusContainer = document.querySelector('#status');
const card = document.querySelector('.outerDiv');
const imageContainer = document.querySelector('#output');
const nameContainer = document.querySelector('#name');
const numberContainer = document.querySelector('#number');

const messageCheck = document.querySelector('#message');
const amountCheck = document.querySelector('#amount');
const payeeCheck = document.querySelector('#swishnumber');

const input = document.querySelector('#excelFile');

const color1 = document.getElementById('color1');
const color2 = document.getElementById('color2');
const angle = document.getElementById('angle');

const baseRequest = {
  format: 'jpg',
  size: 1000,
};

const angleRange = document.getElementById('angleRange');
const bgTypeInputs = document.querySelectorAll('input[name="bgType"]');
const color1Label = document.getElementById('color1Label');
const color2Field = document.getElementById('color2Field');
const angleLabel = document.getElementById('angleLabel');
const angleField = document.getElementById('angleField');

function backgroundType() {
  return document.querySelector('input[name="bgType"]:checked').value;
}

function applyBackground() {
  const type = backgroundType();
  const isGradient = type !== 'solid';

  color1Label.textContent = isGradient ? (type === 'radial' ? 'Center' : 'Start') : 'Color';
  color2Field.hidden = !isGradient;
  angleLabel.hidden = angleField.hidden = type !== 'linear';

  if (type === 'solid') {
    card.style.background = color1.value;
  } else if (type === 'radial') {
    card.style.background = `radial-gradient(circle at center, ${color1.value}, ${color2.value})`;
  } else {
    card.style.background = `linear-gradient(${angle.value}deg, ${color1.value}, ${color2.value})`;
  }
}

// Keep the slider and the number box in sync
angleRange.addEventListener('input', () => {
  angle.value = angleRange.value;
  applyBackground();
});
angle.addEventListener('input', () => {
  const value = Math.min(360, Math.max(0, Number(angle.value) || 0));
  angleRange.value = value;
  applyBackground();
});

color1.addEventListener('input', applyBackground);
color2.addEventListener('input', applyBackground);
bgTypeInputs.forEach((radio) => radio.addEventListener('change', applyBackground));
applyBackground();

const titleColor = document.getElementById('titleColor');
titleColor.addEventListener('input', () => {
  nameContainer.style.color = titleColor.value;
});

function setStatus(text, isError = false) {
  statusContainer.textContent = text;
  statusContainer.classList.toggle('error', isError);
}

// --- File picker / drag-and-drop ---------------------------------------

const dropzone = document.querySelector('#dropzone');
const fileNameLabel = document.querySelector('#fileName');
const fileSizeLabel = document.querySelector('#fileSize');

const isExcelFile = (file) => /\.xlsx$/i.test(file.name);

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showSelectedFile() {
  const file = input.files[0];
  dropzone.classList.toggle('has-file', Boolean(file));
  dropzone.classList.remove('invalid');
  fileNameLabel.textContent = file ? file.name : '';
  fileSizeLabel.textContent = file ? formatSize(file.size) : '';
}

function rejectFile(file) {
  dropzone.classList.add('invalid');
  setStatus(`"${file.name}" is not an Excel (.xlsx) file.`, true);
}

input.addEventListener('change', () => {
  const file = input.files[0];
  if (file && !isExcelFile(file)) {
    input.value = '';
    showSelectedFile();
    rejectFile(file);
    return;
  }
  setStatus('');
  showSelectedFile();
});

// dragenter/dragleave fire for every child element, so count them to
// avoid the highlight flickering while moving over the text inside.
let dragDepth = 0;
dropzone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragDepth++;
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
dropzone.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  dropzone.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!isExcelFile(file)) {
    rejectFile(file);
    return;
  }
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change'));
});

// Stop the browser from opening a file that is dropped outside the drop zone
for (const type of ['dragover', 'drop']) {
  window.addEventListener(type, (e) => {
    if (dropzone.contains(e.target)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'none';
  });
}

// -----------------------------------------------------------------------

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const selectedFile = input.files[0];
  if (!selectedFile) {
    dropzone.classList.add('invalid');
    setStatus('Please choose an Excel file first.', true);
    return;
  }

  submitButton.disabled = true;
  try {
    await convert(selectedFile);
  } catch (err) {
    console.error(err);
    setStatus(`Something went wrong: ${err.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});

async function convert(file) {
  const fileData = await file.arrayBuffer();
  const workbook = XLSX.read(fileData, { type: 'array' });

  const rows = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Formatted text for most fields, raw values so numeric amounts are not
    // affected by cell formatting (e.g. "1 234,00 kr").
    const textRows = XLSX.utils.sheet_to_json(sheet, { raw: false });
    const rawRows = XLSX.utils.sheet_to_json(sheet, { raw: true });
    textRows.forEach((row, i) => rows.push({ text: row, raw: rawRows[i] }));
  }

  if (rows.length === 0) {
    setStatus('The file contains no rows.', true);
    return;
  }

  const images = [];
  const failed = [];
  const usedNames = new Map();

  for (const [i, { text, raw }] of rows.entries()) {
    // "Titel" is still accepted for older sheets
    const title = clean(text['Title'] ?? text['Titel']) ?? '';
    const label = title || `row ${i + 1}`;
    setStatus(
      `Generating ${i + 1} of ${rows.length}…` +
        (i === 0 ? ' (the first one can take a while if the server is waking up)' : '')
    );

    const swishnumber = clean(text['Swishnumber']);
    const message = clean(text['Message']);
    const amount =
      typeof raw['Amount'] === 'number'
        ? String(raw['Amount'])
        : clean(text['Amount']);

    const data = {
      ...baseRequest,
      ...(swishnumber !== undefined && {
        payee: { value: swishnumber, editable: payeeCheck.checked },
      }),
      ...(message !== undefined && {
        message: { value: message, editable: messageCheck.checked },
      }),
      ...(amount !== undefined && {
        amount: { value: amount, editable: amountCheck.checked },
      }),
    };

    try {
      const dataUrl = await renderCard(data, title, swishnumber ?? '');
      images.push({ filename: uniqueFilename(title || `row-${i + 1}`, usedNames), dataUrl });
    } catch (err) {
      console.error(`Error generating QR for ${label}:`, err);
      failed.push(label);
    }
  }

  if (images.length === 0) {
    setStatus(`No QR codes could be generated. Failed: ${failed.join(', ')}`, true);
    return;
  }

  await downloadAsZip(images);

  if (failed.length > 0) {
    setStatus(
      `Downloaded ${images.length} of ${rows.length} QR codes. Failed: ${failed.join(', ')}`,
      true
    );
  } else {
    setStatus(`Done! Downloaded ${images.length} QR codes.`);
  }
}

function clean(value) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim().slice(0, MAX_FIELD_LENGTH);
  return text === '' ? undefined : text;
}

function uniqueFilename(name, usedNames) {
  // Strip characters that are invalid in file names on Windows/macOS/Linux
  const base = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').trim() || 'qr';
  const count = usedNames.get(base) ?? 0;
  usedNames.set(base, count + 1);
  return count === 0 ? `${base}.jpeg` : `${base} (${count + 1}).jpeg`;
}

async function renderCard(data, title, swishnumber) {
  const response = await fetch(FETCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Server responded ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    imageContainer.src = url;
    nameContainer.innerText = title;
    numberContainer.innerText = swishnumber;

    // Wait until the new QR image is actually decoded before capturing
    await imageContainer.decode();

    const canvas = await html2canvas(card);
    return canvas.toDataURL('image/jpeg');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function downloadAsZip(images) {
  const zip = new JSZip();
  images.forEach(({ filename, dataUrl }) => {
    zip.file(filename, dataUrl.split(',')[1], { base64: true });
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = 'swish_qr_images.zip';
  a.click();

  // Revoking immediately can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(zipUrl), 10_000);
}
