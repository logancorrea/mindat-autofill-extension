let lastCatalogId = null;

window.addEventListener('mindat-autofill', (e) => {
  const catalogId = e.detail.catalogId;
  if (catalogId && catalogId !== lastCatalogId) {
    lastCatalogId = catalogId;
    autofillMindatForm(catalogId);
  }
});

async function autofillMindatForm(catalogId) {
  // Fetch the CSV file from the extension's directory
  const url = chrome.runtime.getURL("mindat_export.csv");
  const response = await fetch(url);
  const csvText = await response.text();

  // Parse CSV (simple parser for your format)
  const rows = csvText.split('\n').map(row => row.split(','));
  const headers = rows[0].map(h => h.replace(/(^"|"$)/g, '').trim());
  const dataRows = rows.slice(1);

  // Find the row with the matching Catalog ID
  const row = dataRows.find(r => r[0] === catalogId);
  if (!row) return console.warn("Not found");

  // Map row to object
  const data = {};
  headers.forEach((h, i) => data[h] = (row[i] || "").replace(/(^"|"$)/g, '').trim());

  // Now autofill as before
  document.querySelector("#cat_catnum").value = data["Catalog ID"] || "";
  document.querySelector("#cat_title").value = data["Specimen Title"] || "";
  document.querySelector("#cat_locality").value = data["Locality"] || "";

  // Date of acquisition
  if (data["Acquisition Year"]) {
    const dateStr = data["Acquisition Year"].split(' ')[0];
    const [year, month, day] = dateStr.split('-');
    if (year) document.querySelector("#cat_acqyear").value = year;
    if (month) document.querySelector("#cat_acqmonth").value = String(Number(month));
    if (day) document.querySelector("#cat_acqday").value = String(Number(day));
  }

  const dims = (data["Dimensions"] || "").match(/(\d+)[x×](\d+)[x×](\d+)/);
  if (dims) {
    document.querySelector("#cat_w").value = dims[1];
    document.querySelector("#cat_h").value = dims[2];
    document.querySelector("#cat_d").value = dims[3];
  }

  document.querySelector("#cat_source").value = data["Source"] || "";
  document.querySelector("#cat_storage").value = data["Storage"] || "";
  document.querySelector("#cat_description").value = data["Description"] || "";
  const notesField = document.querySelector("#cat_notes");
  if (notesField) notesField.value = data["Notes"] || "";

  if (data["Mindat ID"]) {
    document.querySelector("#cat_minid").value = data["Mindat ID"];
  }
  if (data["Max Crystal Size"]) {
    document.querySelector("#cat_xtal").value = data["Max Crystal Size"];
    document.querySelector("#cat_xtalunits").value = data["Xtal Units"] || "mm";
  }

  // Autofill multiple species fields (array support)
  if (Array.isArray(data["Species"])) {
    data["Species"].forEach((s, idx) => {
      const field = document.querySelector(`#cat_min${idx + 1}`);
      if (field && s.id) {
        field.value = s.id;
        field.dispatchEvent(new Event('change', { bubbles: true })); // <-- trigger UI update
      }
    });
  } else {
    // Legacy support for species1-species5
    const species = [data["Species1"], data["Species2"], data["Species3"], data["Species4"], data["Species5"]];
    species.forEach((val, idx) => {
      if (val && idx < 8) {
        const field = document.querySelector(`#cat_min${idx + 1}`);
        if (field) {
          field.value = val;
          field.dispatchEvent(new Event('change', { bubbles: true })); // <-- trigger UI update
        }
      }
    });
  }

  console.log("✅ Form autofilled from CSV file");
}
