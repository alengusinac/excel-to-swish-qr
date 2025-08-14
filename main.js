import './style.css';
import * as XLSX from 'xlsx/xlsx.mjs';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

const FETCH_URL = 'https://backend-uspg.onrender.com/swish/generate-qr';

const imageContainer = document.querySelector('#output');
const nameContainer = document.querySelector('#name');
const numberContainer = document.querySelector('#number');

const messageCheck = document.querySelector('#message');
const amountCheck = document.querySelector('#amount');
const payeeCheck = document.querySelector('#swishnumber');

const input = document.querySelector('#excelFile');

let messageEditable = false;
let amountEditable = false;
let payeeEditable = false;

messageCheck.addEventListener('change', (e) => {
  messageEditable = e.target.checked;
});
amountCheck.addEventListener('change', (e) => {
  amountEditable = e.target.checked;
});
payeeCheck.addEventListener('change', (e) => {
  payeeEditable = e.target.checked;
});

const baseRequest = {
  format: 'jpg',
  size: 1000,
};

let imageArray = []; // Array to store the generated images

document.querySelector('#applyGradient').addEventListener('click', () => {
  let color1 = document.getElementById('color1').value;
  let color2 = document.getElementById('color2').value;
  let angle = document.getElementById('angle').value;
  let card = document.querySelector('.outerDiv');

  card.style.background = `linear-gradient(${angle}deg, ${color1}, ${color2})`;
});

document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const selectedFile = input.files[0];

  const fileData = await readFileAsArrayBuffer(selectedFile);
  const workbook = XLSX.read(fileData, {
    type: 'binary',
    dateNF: 'mm/dd/yyyy',
  });

  for (const sheet of workbook.SheetNames) {
    const result = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
      raw: false,
    });

    for (const row of result) {
      // Trim and limit values to 50 characters
      const swishnumber =
        row['Swishnumber'] !== undefined
          ? String(row['Swishnumber']).trim().slice(0, 50)
          : undefined;
      const message =
        row['Message'] !== undefined
          ? String(row['Message']).trim().slice(0, 50)
          : undefined;
      const amount =
        row['Amount'] !== undefined
          ? String(row['Amount']).trim().slice(0, 50)
          : undefined;

      const data = {
        ...baseRequest,
        ...(swishnumber !== undefined && {
          payee: { value: swishnumber, editable: messageEditable },
        }),
        ...(message !== undefined && {
          message: { value: message, editable: messageEditable },
        }),
        ...(amount !== undefined && {
          amount: { value: amount, editable: amountEditable },
        }),
      };

      await getSwishQR(data, row);
    }
  }

  // After all fetches, create and download a ZIP file
  await downloadAsZip();
});

const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => resolve(event.target.result);
    fileReader.onerror = (error) => reject(error);
    fileReader.readAsArrayBuffer(file);
  });
};

const getSwishQR = async (data, row) => {
  try {
    const response = await fetch(FETCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const reader = response.body.getReader();
    const stream = new ReadableStream({
      start(controller) {
        function pump() {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            return pump();
          });
        }
        return pump();
      },
    });

    const newResponse = new Response(stream);
    const blob = await newResponse.blob();
    const url = URL.createObjectURL(blob);

    imageContainer.setAttribute('src', url);
    nameContainer.innerText = row['Titel'];
    numberContainer.innerText = row['Swishnumber'] || '';

    // **Ensure HTML2Canvas has enough time to capture**
    await new Promise((resolve) => setTimeout(resolve, 50));

    const canvas = await html2canvas(document.querySelector('.outerDiv'));
    const dataUrl = canvas.toDataURL('image/jpeg');
    // Replace '/' with '-' in filename to avoid folder creation in ZIP
    const safeFilename = `${row['Titel']}`.replaceAll('/', '-') + '.jpeg';
    imageArray.push({ filename: safeFilename, dataUrl });
  } catch (err) {
    console.error('Error generating QR:', err);
  }
};

const downloadAsZip = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // **Ensure all images are added**

  const zip = new JSZip();
  imageArray.forEach(({ filename, dataUrl }) => {
    zip.file(filename, dataUrl.split(',')[1], { base64: true });
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = 'swish_qr_images.zip';
  a.click();

  URL.revokeObjectURL(zipUrl);
};
