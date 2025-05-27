// Immediately run when matching page loads
(async function() {
  // 1) get the parsed CSV data
  const { csvData } = await new Promise(resolve => {
    chrome.storage.local.get('csvData', resolve);
  });
  if (!csvData) {
    console.warn('Mindat Autofill: no CSV loaded');
    return;
  }

  // 2) figure out which Catalog ID to use
  const params = new URLSearchParams(window.location.search);
  const catalogId = params.get('catalog')
                  || document.querySelector('#cat_catnum')?.value
                  || '';
  const entry = csvData[catalogId];
  if (!entry) {
    console.warn(`Mindat Autofill: no record for Catalog ID ${catalogId}`);
    return;
  }

  // small helper to fill inputs/selects
  function set(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.checked = !!value && String(value).toLowerCase() !== 'false';
    } else {
      el.value = value ?? '';
    }
  }

  // --- now map your CSV columns to the form fields ---
  set('#cat_catnum',            entry['Catalog ID']);
  set('#cat_minid',             entry['MinID']);
  set('#cat_title',             entry['Specimen Title']);
  set('#cat_locality',          entry['Locality']);

  // Acquisition date: "YYYY-MM-DD"
  if (entry['Date of Acquisition']) {
    const [y,m,d] = entry['Date of Acquisition'].split('-');
    set('#cat_acqday',    parseInt(d,10));
    set('#cat_acqmonth',  parseInt(m,10));
    set('#cat_acqyear',   parseInt(y,10));
  }

  // Dimensions: "WxHxD"
  if (entry['Dimensions']) {
    const dims = entry['Dimensions'].match(/(\d+)[x×](\d+)[x×](\d+)/);
    if (dims) {
      set('#cat_w', dims[1]);
      set('#cat_h', dims[2]);
      set('#cat_d', dims[3]);
      // units default to "mm"
    }
  }

  set('#cat_xtal',              entry['Max Crystal Size']);
  set('#cat_weight',            entry['Weight']);
  set('#cat_storage',           entry['Specimen Storage Location']);
  set('#cat_source',            entry['Specimen Source']);

  // Collected by me → checkbox name="cat_selfcollected"
  set('input[name="cat_selfcollected"]', entry['Collected by me']);

  // Date specimen collected
  if (entry['Date Specimen Collected']) {
    const [y,m,d] = entry['Date Specimen Collected'].split('-');
    set('#cat_colday',   parseInt(d,10));
    set('#cat_colmonth', parseInt(m,10));
    set('#cat_colyear',  parseInt(y,10));
  }

  // Deaccessioned, Deaccessioned to
  set('input[name="cat_deaccessioned"]', entry['Deaccessioned']);
  set('#cat_deaccessionedto',            entry['Deaccessioned to']);

  // Prices & values
  set('#cat_labelprice',        entry['Label Price']);
  set('#cat_buyprice',          entry['Purchase Price']);
  set('#cat_buyvalue',          entry['Cost (in $)']);
  set('#cat_appraisalvalue',    entry['Estimated Value']);
  set('#cat_photo',             entry['Override photo ID']);

  // Long text areas
  set('#cat_owners',            entry['Previous Owners']);
  set('#cat_repairs',           entry['Damage']);
  set('#cat_description',       entry['Notes']);

  // Flag for label
  set('input[name="cat_dolabel"]', entry['Labels']);

  console.log(`✅ Mindat Autofill: filled form for Catalog ID ${catalogId}`);
})();
