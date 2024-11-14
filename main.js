import './style.css';
import * as XLSX from 'xlsx/xlsx.mjs';
import html2canvas from 'html2canvas';

const FETCH_URL = 'https://backend-uspg.onrender.com/swish/generate-qr';

const imageContainer = document.querySelector('#output');
const nameContainer = document.querySelector('#name');

const request = {
  format: 'jpg',
  size: 300,
};

document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const selectedFile = e.target.children[1].files[0];

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
      const data = {
        ...request,
        payee: { value: row['Swishnummer'], editable: false },
        message: { value: row['Meddelande'], editable: false },
      };

      await getSwishQR(data, row);
    }
  }
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

    setTimeout(() => {
      html2canvas(document.querySelector('.outerDiv')).then((canvas) => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/jpeg');
        a.download = `${row['Titel']}.jpeg`;
        a.click();
      });
    }, 1);
  } catch (err) {
    console.error(err);
  }
};
