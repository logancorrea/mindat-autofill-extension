let lastCatalogId = null;

window.addEventListener('mindat-autofill', (e) => {
  const catalogId = e.detail.catalogId;
  if (catalogId && catalogId !== lastCatalogId) {
    lastCatalogId = catalogId;
    autofillMindatForm(catalogId);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'mindat-autofill' && msg.catalogId) {
    autofillMindatForm(msg.catalogId);
  }
});

async function autofillMindatForm(catalogId) {
  // Fetch the CSV file from the extension's directory
  const url = chrome.runtime.getURL("mindat_export.csv");
  const response = await fetch(url);
  const csvText = await response.text();

  // Parse CSV robustly
  const parsed = Papa.parse(csvText, { header: true });
  const dataRows = parsed.data;
  const row = dataRows.find(r => r["Catalog ID"] === catalogId);
  if (!row) return console.warn("Not found");
  const data = row;

  // Autofill form fields
  document.querySelector("#cat_catnum").value = data["Catalog ID"] || "";
  document.querySelector("#cat_title").value = data["Specimen Title"] || "";
  document.querySelector("#cat_locality").value = data["Locality"] || "";

  // Date of acquisition
  console.log("Date of Acquisition raw:", data["Date of Acquisition"]);
  const dateStr = data["Date of Acquisition"] ? data["Date of Acquisition"].split(' ')[0] : "";
  console.log("dateStr:", dateStr);
  const parts = dateStr.split('-');
  console.log("Parsed parts:", parts);

  // Year (dropdown)
  if (parts[0]) {
    const yearSel = document.querySelector("#cat_acqyear");
    if (yearSel) {
      yearSel.value = parts[0];
      yearSel.dispatchEvent(new Event('change', { bubbles: true }));
      console.log("Set year:", parts[0]);
    }
  }

  // Month (dropdown, 1-12)
  if (parts[1]) {
    const monthVal = String(Number(parts[1])); // "05" → "5"
    const monthSel = document.querySelector("#cat_acqmonth");
    if (monthSel) {
      monthSel.value = monthVal;
      monthSel.dispatchEvent(new Event('change', { bubbles: true }));
      console.log("Set month:", monthVal);
    }
  }

  // Day (text input)
  if (parts[2]) {
    const dayInput = document.querySelector("#cat_acqday");
    if (dayInput) {
      dayInput.value = String(Number(parts[2]));
      dayInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log("Set day:", String(Number(parts[2])));
    }
  }

  if (data["Dimensions"]) {
    // Accepts "WxHxD" or "W x H x D" or "W×H×D"
    const dims = data["Dimensions"].match(/(\d+)[x×](\d+)[x×](\d+)/);
    if (dims) {
      document.querySelector("#cat_w").value = dims[1];
      document.querySelector("#cat_h").value = dims[2];
      document.querySelector("#cat_d").value = dims[3];
    }
  }

  document.querySelector("#cat_source").value = data["Source"] || "";
  // Storage Location
  document.querySelector("#cat_storage").value = data["Storage Location"] || "";

  // Notes
  const notesField = document.querySelector("#cat_notes");
  if (notesField) notesField.value = data["Notes"] || "";

  // Min ID
  if (data["Min ID"]) {
    document.querySelector("#cat_minid").value = data["Min ID"];
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
    for (let i = 1; i <= 8; i++) {
      // Use your CSV columns: "Species ID", "Species ID 2", ..., "Species ID 8"
      const speciesId = data[`Species ID${i > 1 ? ' ' + i : ''}`]; // "Species ID", "Species ID 2", ...
      if (speciesId) {
        const minInput = document.querySelector(`#cat_min${i}`);
        if (minInput) {
          minInput.value = speciesId;
          minInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`Set cat_min${i} to mineral ID:`, speciesId);
        }
      }
    }
  }

  // Autofill the first mineral/fossil/rock name using Species ID
  if (data["Species ID"]) {
    const minInput = document.querySelector("#cat_min1");
    if (minInput) {
      minInput.value = data["Species ID"];
      minInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log("Set cat_min1 to mineral ID:", data["Species ID"]);
    }
  }

  // Autofill mineral/fossil/rock pickers from Species ID column (newline-separated IDs)
  if (data["Species ID"]) {
    // Split on newlines, trim, and filter out empty lines
    const speciesIds = data["Species ID"]
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    // If you have names in a parallel column:
    const speciesNames = (data["Species Info"] || "")
      .split(/\r?\n/)
      .map(s => s.trim());

    speciesIds.forEach((id, idx) => {
      const minInput = document.querySelector(`#cat_min${idx + 1}`);
      const minButton = document.querySelector(`#picker_for_cat_min${idx + 1}`);
      if (minInput) {
        minInput.value = id;
        minInput.dispatchEvent(new Event('change', { bubbles: true }));
        // Set button label if name is available
        if (minButton && speciesNames[idx]) {
          minButton.textContent = speciesNames[idx];
        }
        console.log(`Set cat_min${idx + 1} to mineral ID:`, id, "name:", speciesNames[idx]);
      }
    });
  }

  console.log("✅ Form autofilled from CSV file");
  const yearSel = document.querySelector("#cat_acqyear");
  if (yearSel) {
    console.log("Year options:", Array.from(yearSel.options).map(o => o.value));
  }
  const monthSel = document.querySelector("#cat_acqmonth");
  if (monthSel) {
    console.log("Month options:", Array.from(monthSel.options).map(o => o.value));
  }

  if (!data["Date of Acquisition"]) {
    console.warn("No Date of Acquisition in CSV for this Catalog ID");
  }
}
