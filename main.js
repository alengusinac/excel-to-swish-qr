import './style.css';
import * as XLSX from 'xlsx/xlsx.mjs';
import html2canvas from 'html2canvas';

const FETCH_URL = 'https://backend-uspg.onrender.com/swish/generate-qr';

const imageContainer = document.querySelector('#output');
const numberContainer = document.querySelector('#number');
const nameContainer = document.querySelector('#name');

const links = [];

const request = {
  format: 'jpg',
  size: 300,
};

function truncateText(text) {
  const maxlength = 50;
  if (text.length <= maxlength) {
    return text;
  }

  return text.substr(0, maxlength);
}

document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const selectedFile = e.target.children[1].files[0];

  let fileReader = new FileReader();

  fileReader.readAsArrayBuffer(selectedFile);

  // Process the file data when it's loaded
  fileReader.onload = (event) => {
    let fileData = event.target.result;

    // Read the Excel workbook
    let workbook = XLSX.read(
      fileData,
      { type: 'binary' },
      { dateNF: 'mm/dd/yyyy' }
    );

    // Change each sheet in the workbook to json
    workbook.SheetNames.forEach(async (sheet) => {
      const result = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
        raw: false,
      });

      result.forEach(async (row, index) => {
        setTimeout(async () => {
          const data = {
            ...request,
            payee: { value: row['Swishnummer'], editable: false },
            message: {
              value: truncateText(row['Meddelande']),
              editable: false,
            },
          };

          const reader = await getSwishQR(data, row);
        }, index * 500);
      });
    });
  };

  const getSwishQR = async (data, row) => {
    console.log('fetching...');

    fetch(FETCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        const reader = response.body.getReader();
        return new ReadableStream({
          start(controller) {
            return pump();
            function pump() {
              return reader.read().then(({ done, value }) => {
                // When no more data needs to be consumed, close the stream
                if (done) {
                  controller.close();
                  return;
                }
                // Enqueue the next data chunk into our target stream
                controller.enqueue(value);
                return pump();
              });
            }
          },
        });
      })
      // Create a new response out of the stream
      .then((stream) => new Response(stream))
      // Create an object URL for the response
      .then((response) => response.blob())
      .then((blob) => URL.createObjectURL(blob))
      // Update image
      .then((url) => {
        imageContainer.setAttribute('src', url);
        // numberContainer.innerText = row['Swishnummer'];
        nameContainer.innerText = row['Titel'];
        setTimeout(() => {
          html2canvas(document.querySelector('.outerDiv')).then((canvas) => {
            console.log(canvas);
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/jpeg');
            a.download = `${row['Grupper']} - ${row['Titel']}.jpeg`;
            a.click();
          });
        }, 1);
      })
      .catch((err) => console.error(err));
  };
});
