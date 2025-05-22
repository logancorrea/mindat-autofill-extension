let lastCatalogId = null;

window.addEventListener('mindat-autofill', (e) => {
  const catalogId = e.detail.catalogId;
  if (catalogId && catalogId !== lastCatalogId) {
    lastCatalogId = catalogId;
    autofillMindatForm(catalogId);
  }
});

async function autofillMindatForm(catalogId) {
  const url = chrome.runtime.getURL("mindat_export.csv");
  const response = await fetch(url);
  const csvText = await response.text();

  // Use PapaParse for robust CSV parsing
  const parsed = Papa.parse(csvText, { header: true });
  const row = parsed.data.find(r => r["Catalog ID"] === catalogId);
  if (!row) return console.warn("Not found");

  // Now autofill as before, using row["Locality"], etc.
  document.querySelector("#cat_catnum").value = row["Catalog ID"] || "";
  document.querySelector("#cat_title").value = row["Specimen Title"] || "";
  document.querySelector("#cat_locality").value = row["Locality"] || "";

  // Date of acquisition
  if (row["Acquisition Year"]) {
    const dateStr = row["Acquisition Year"].split(' ')[0];
    const [year, month, day] = dateStr.split('-');
    if (year) document.querySelector("#cat_acqyear").value = year;
    if (month) document.querySelector("#cat_acqmonth").value = String(Number(month));
    if (day) document.querySelector("#cat_acqday").value = String(Number(day));
  }

  const dims = (row["Dimensions"] || "").match(/(\d+)[x×](\d+)[x×](\d+)/);
  if (dims) {
    document.querySelector("#cat_w").value = dims[1];
    document.querySelector("#cat_h").value = dims[2];
    document.querySelector("#cat_d").value = dims[3];
  }

  document.querySelector("#cat_source").value = row["Source"] || "";
  document.querySelector("#cat_storage").value = row["Storage"] || "";
  document.querySelector("#cat_description").value = row["Description"] || "";
  const notesField = document.querySelector("#cat_notes");
  if (notesField) notesField.value = row["Notes"] || "";

  if (row["Mindat ID"]) {
    document.querySelector("#cat_minid").value = row["Mindat ID"];
  }
  if (row["Max Crystal Size"]) {
    document.querySelector("#cat_xtal").value = row["Max Crystal Size"];
    document.querySelector("#cat_xtalunits").value = row["Xtal Units"] || "mm";
  }

  // Autofill multiple species fields (array support)
  if (Array.isArray(row["Species"])) {
    row["Species"].forEach((s, idx) => {
      const field = document.querySelector(`#cat_min${idx + 1}`);
      if (field && s.id) {
        field.value = s.id;
        field.dispatchEvent(new Event('change', { bubbles: true })); // <-- trigger UI update
      }
    });
  } else {
    // Legacy support for species1-species5
    const species = [row["Species1"], row["Species2"], row["Species3"], row["Species4"], row["Species5"]];
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
