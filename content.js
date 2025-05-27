console.log("🔌 Mindat Autofill content script loaded");

// Reusable autofill logic
async function autofillRecord(catalogId) {
  const { csvData } = await new Promise(r => chrome.storage.local.get('csvData', r));
  if (!csvData) return console.warn('Mindat Autofill: no CSV loaded');
  const entry = csvData[catalogId];
  if (!entry) return console.warn(`Mindat Autofill: no record for Catalog ID ${catalogId}`);

  function set(selector, val) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.checked = !!val && String(val).toLowerCase() !== 'false' && val !== '0';
    } else {
      el.value = val ?? '';
    }
  }

  set('#cat_catnum',   entry['Catalog ID']);
  set('#cat_minid',    entry['MinID']);
  set('#cat_title',    entry['Specimen Title']);
  set('#cat_locality', entry['Locality']);

  // Acquisition date: "YYYY-MM-DD"
  if (entry['Date of Acquisition']) {
    const [y, m, d] = entry['Date of Acquisition'].split('-');
    set('#cat_acqday',   parseInt(d, 10));
    set('#cat_acqmonth', parseInt(m, 10));
    set('#cat_acqyear',  parseInt(y, 10));
  }

  // Dimensions: "WxHxD"
  if (entry['Dimensions']) {
    const m = entry['Dimensions'].match(/(\d+)[x×](\d+)[x×](\d+)/);
    if (m) {
      set('#cat_w', m[1]);
      set('#cat_h', m[2]);
      set('#cat_d', m[3]);
    }
  }

  set('#cat_xtal',        entry['Max Crystal Size']);
  set('#cat_weight',      entry['Weight']);
  set('#cat_storage',     entry['Specimen Storage Location']);
  set('#cat_source',      entry['Specimen Source']);
  set('input[name="cat_selfcollected"]', entry['Collected by me']);

  // Date specimen collected
  if (entry['Date Specimen Collected']) {
    const [y, m, d] = entry['Date Specimen Collected'].split('-');
    set('#cat_colday',   parseInt(d, 10));
    set('#cat_colmonth', parseInt(m, 10));
    set('#cat_colyear',  parseInt(y, 10));
  }

  // Deaccessioned, Deaccessioned to
  set('input[name="cat_deaccessioned"]', entry['Deaccessioned']);
  set('#cat_deaccessionedto',            entry['Deaccessioned to']);

  // Prices & values
  set('#cat_labelprice',     entry['Label Price']);
  set('#cat_buyprice',       entry['Purchase Price']);
  set('#cat_buyvalue',       entry['Cost (in $)']);
  set('#cat_appraisalvalue', entry['Estimated Value']);
  set('#cat_photo',          entry['Override photo ID']);

  // Long text areas
  set('#cat_owners',      entry['Previous Owners']);
  set('#cat_repairs',     entry['Damage']);
  set('#cat_description', entry['Notes']);

  // Flag for label
  set('input[name="cat_dolabel"]', entry['Labels']);

  console.log(`✅ Mindat Autofill: filled form for Catalog ID ${catalogId}`);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'fill' && msg.catalogId) {
    autofillRecord(msg.catalogId);
  }
});

// Optionally: auto-run on page load if ?catalog= in URL
const urlParams = new URLSearchParams(location.search);
if (urlParams.has('catalog')) {
  autofillRecord(urlParams.get('catalog'));
}
