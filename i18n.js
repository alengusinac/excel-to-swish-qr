// Translations for the UI. Strings may contain simple HTML (<b>, <u>) and
// {placeholders} that are filled in by t().

export const translations = {
  en: {
    pageTitle: 'Excel to Swish QR Generator',
    heading: 'Excel to Swish QR Generator',
    howToHeading: 'How to Generate Swish QR Codes',
    step1:
      'Prepare an Excel file with at least one of the following columns: <b>Swishnumber</b>, <b>Message</b>, <b>Amount</b>, and <b>Title</b> (the title on the card).',
    step2: 'Select which fields should be editable in the QR Code.',
    step3: 'Choose your preferred colors for the card.',
    step4: 'Upload the file using the area below.',
    step5: 'Click "Convert" to generate QR codes.',
    step6: 'Download will automatically start when all QR codes are generated.',
    exampleHeading: 'Example Excel:',
    exampleImage: './excel-example.png',
    exampleAlt:
      'Example Excel sheet with Title, Message, Amount and Swishnumber columns',
    editableHeading: 'Fields that should be editable:',
    fieldMessage: 'Message',
    fieldAmount: 'Amount',
    fieldSwishnumber: 'Swishnumber',
    colorsHeading: 'Colors:',
    background: 'Background',
    solid: 'Solid',
    linearGradient: 'Linear gradient',
    radialGradient: 'Radial gradient',
    colors: 'Colors',
    colorStart: 'Start',
    colorEnd: 'End',
    colorCenter: 'Center',
    colorSingle: 'Color',
    angle: 'Angle',
    title: 'Title',
    textColor: 'Text color',
    fileHeading: 'Excel file:',
    dropTitle: 'Drag &amp; drop your Excel file here',
    dropBrowse: 'or <u>click to browse</u> (.xlsx)',
    dropReplace: 'Click or drop another file to replace it',
    convert: 'Convert',
    previewHeading: 'Preview',
    qrAlt: 'Swish QR code',
    placeholderName: 'John Doe',
    languageLabel: 'Language',

    // Status messages
    noFile: 'Please choose an Excel file first.',
    notExcel: '"{name}" is not an Excel (.xlsx) file.',
    error: 'Something went wrong: {message}',
    noRows: 'The file contains no rows.',
    generating: 'Generating {n} of {total}…',
    firstSlow: ' (the first one can take a while if the server is waking up)',
    noneGenerated: 'No QR codes could be generated. Failed: {failed}',
    partial: 'Downloaded {done} of {total} QR codes. Failed: {failed}',
    done: 'Done! Downloaded {count} QR codes.',
    rowLabel: 'row {n}',
    rowFile: 'row-{n}',
  },

  sv: {
    pageTitle: 'Excel till Swish QR-generator',
    heading: 'Excel till Swish QR-generator',
    howToHeading: 'Så skapar du Swish QR-koder',
    step1:
      'Förbered en Excel-fil med minst en av följande kolumner: <b>Swishnummer</b>, <b>Meddelande</b>, <b>Belopp</b> och <b>Titel</b> (titeln på kortet). Engelska kolumnnamn (Swishnumber, Message, Amount, Title) fungerar också.',
    step2: 'Välj vilka fält som ska gå att ändra i QR-koden.',
    step3: 'Välj färger för kortet.',
    step4: 'Ladda upp filen i fältet nedan.',
    step5: 'Klicka på ”Konvertera” för att skapa QR-koderna.',
    step6: 'Nedladdningen startar automatiskt när alla QR-koder är klara.',
    exampleHeading: 'Exempel på Excel-fil:',
    exampleImage: './excel-example-sv.png',
    exampleAlt:
      'Exempel på Excel-ark med kolumnerna Titel, Meddelande, Belopp och Swishnummer',
    editableHeading: 'Fält som ska gå att ändra:',
    fieldMessage: 'Meddelande',
    fieldAmount: 'Belopp',
    fieldSwishnumber: 'Swishnummer',
    colorsHeading: 'Färger:',
    background: 'Bakgrund',
    solid: 'Enfärgad',
    linearGradient: 'Linjär toning',
    radialGradient: 'Radiell toning',
    colors: 'Färger',
    colorStart: 'Start',
    colorEnd: 'Slut',
    colorCenter: 'Mitten',
    colorSingle: 'Färg',
    angle: 'Vinkel',
    title: 'Titel',
    textColor: 'Textfärg',
    fileHeading: 'Excel-fil:',
    dropTitle: 'Dra och släpp din Excel-fil här',
    dropBrowse: 'eller <u>klicka för att välja</u> (.xlsx)',
    dropReplace: 'Klicka eller släpp en annan fil för att byta',
    convert: 'Konvertera',
    previewHeading: 'Förhandsvisning',
    qrAlt: 'Swish QR-kod',
    placeholderName: 'Anna Andersson',
    languageLabel: 'Språk',

    noFile: 'Välj en Excel-fil först.',
    notExcel: '”{name}” är inte en Excel-fil (.xlsx).',
    error: 'Något gick fel: {message}',
    noRows: 'Filen innehåller inga rader.',
    generating: 'Skapar {n} av {total}…',
    firstSlow: ' (den första kan ta en stund om servern håller på att starta)',
    noneGenerated: 'Inga QR-koder kunde skapas. Misslyckades: {failed}',
    partial: 'Laddade ner {done} av {total} QR-koder. Misslyckades: {failed}',
    done: 'Klart! Laddade ner {count} QR-koder.',
    rowLabel: 'rad {n}',
    rowFile: 'rad-{n}',
  },
};

// Swedish is the primary language; English is available from the switch
export const DEFAULT_LANGUAGE = 'sv';
const STORAGE_KEY = 'language';
const listeners = [];

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch {
    // Storage can be blocked (private mode etc.); use the default
  }
  return DEFAULT_LANGUAGE;
}

let currentLanguage = initialLanguage();

export const getLanguage = () => currentLanguage;

export function t(key, vars = {}) {
  const text =
    translations[currentLanguage][key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

// Text-only version, for places that must not contain HTML
export const tText = (key, vars) =>
  t(key, vars).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

/** Fill every element marked with data-i18n / -src / -alt / -aria-label */
export function applyTranslations(root = document) {
  document.documentElement.lang = currentLanguage;
  document.title = tText('pageTitle');

  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-src]').forEach((el) => {
    el.src = t(el.dataset.i18nSrc);
  });
  root.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    el.alt = tText(el.dataset.i18nAlt);
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', tText(el.dataset.i18nAriaLabel));
  });
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not critical: the choice just won't be remembered
  }
  applyTranslations();
  listeners.forEach((fn) => fn(lang));
}

export const onLanguageChange = (fn) => listeners.push(fn);
