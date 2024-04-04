import './style.css';
import * as XLSX from 'xlsx/xlsx.mjs';

const SWISH_URL = 'https://mpc.getswish.net/qrg-swish/api/v1/prefilled';
const LOCAL_URL = 'http://localhost:3000/swish/generate-qr';

const imageContainer = document.querySelector('#output');
const linkContainer = document.querySelector('a');

const request = {
  format: 'jpg',
  size: 300,
};

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

      result.forEach(async (row) => {
        console.log(row['nummer']);

        const data = {
          ...request,
          payee: { value: row['nummer'], editable: false },
          amount: { value: row['belopp'], editable: false },
          message: { value: row['meddelande'], editable: false },
        };

        const reader = await getSwishQR(data);
      });
    });
  };

  const getSwishQR = async (data) => {
    fetch(LOCAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        console.log(response);
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
        linkContainer.href = url;
        linkContainer.setAttribute('download', `swishQR.jpeg`);
      })
      .catch((err) => console.error(err));
  };
});
