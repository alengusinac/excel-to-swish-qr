import './style.css';
import * as XLSX from 'xlsx/xlsx.mjs';

const SWISH_URL = 'https://mpc.getswish.net/qrg-swish/api/v1/prefilled';

const request = {
  format: 'jpg',
  payee: {
    value: '0706931235',
    editable: false,
  },
  amount: {
    value: 'string',
    editable: false,
  },
  message: {
    value: 'string',
    editable: false,
  },
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

      console.log(result);
      result.forEach(async (row) => {
        console.log(row['nummer']);
        const response = await fetch(SWISH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'no-cors': 'true',
          },
          body: JSON.stringify({
            ...request,
            payee: { value: row['nummer'], editable: false },
            amount: { value: row['belopp'], editable: false },
            message: { value: row['meddelande'], editable: false },
          }),
        });
        console.log(response);
      });
    });
  };
});
