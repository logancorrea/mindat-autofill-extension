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
    // Treat "na", "n/a", "nan" (case-insensitive) as blank
    const blankVals = ["na", "n/a", "nan"];
    let v = (typeof val === "string") ? val.trim() : val;
    if (v && blankVals.includes(String(v).toLowerCase())) v = "";
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.checked = !!v && String(v).toLowerCase() !== 'false' && v !== '0';
    } else {
      el.value = v ?? '';
    }
  }

  set('#cat_catnum',   entry['Catalog ID']);
  set('#cat_minid',    entry['MinID']);
  set('#cat_title',    entry['Specimen Title']);
  set('#cat_locality', entry['Locality']);

  // Acquisition date: "YYYY-MM-DD"
  if (entry['Date of Acquisition']) {
    const parts = entry['Date of Acquisition'].split('-');
    set('#cat_acqyear',  parts[0] ? parseInt(parts[0], 10) : '');
    set('#cat_acqmonth', parts[1] ? parseInt(parts[1], 10) : '');
    set('#cat_acqday',   parts[2] ? parseInt(parts[2], 10) : '');
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
    const parts = entry['Date Specimen Collected'].split('-');
    set('#cat_colyear',  parts[0] ? parseInt(parts[0], 10) : '');
    set('#cat_colmonth', parts[1] ? parseInt(parts[1], 10) : '');
    set('#cat_colday',   parts[2] ? parseInt(parts[2], 10) : '');
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

// Autofill minerals by simulating picker UI interaction
async function autofillMineralsByName(mineralNames) {
  for (let i = 0; i < mineralNames.length; i++) {
    // Wait for the correct "Add" button to be enabled and visible
    const btnId = `#picker_for_cat_min${i + 1}`;
    await new Promise(resolve => {
      const check = () => {
        const btn = document.querySelector(btnId);
        if (btn && !btn.disabled && btn.offsetParent !== null) resolve();
        else setTimeout(check, 100);
      };
      check();
    });

    const pickerBtn = document.querySelector(btnId);
    if (!pickerBtn) {
      console.warn(`No picker button for cat_min${i + 1}`);
      continue;
    }
    pickerBtn.click();

    // Wait for picker search box to appear
    await new Promise(resolve => {
      const check = () => {
        const el = document.querySelector("#picker_text");
        if (el) resolve();
        else setTimeout(check, 50);
      };
      check();
    });

    // Enter mineral name in search box
    const mineralName = mineralNames[i];
    const searchBox = document.querySelector("#picker_text");
    searchBox.value = mineralName;
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for AJAX results to load
    await new Promise(resolve => setTimeout(resolve, 700));

    // Find and click the exact match
    const results = Array.from(document.querySelectorAll('.picker_row .picker_name'));
    const match = results.find(el => el.textContent.trim().toLowerCase() === mineralName.trim().toLowerCase());
    if (match) {
      match.closest('.picker_row').click();
      await new Promise(resolve => setTimeout(resolve, 200)); // Let UI update
      console.log(`✅ Picked mineral: ${mineralName}`);
    } else if (results.length) {
      results[0].closest('.picker_row').click();
      await new Promise(resolve => setTimeout(resolve, 200));
      console.warn(`⚠️ No exact match for "${mineralName}", picked first result: "${results[0].textContent.trim()}"`);
    } else {
      console.error(`❌ No results for mineral: ${mineralName}`);
    }

    // Wait for Mindat to update the UI and enable the next slot
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  // Force-remove any leftover picker overlay elements
  ['picker_be_gone','picker_wrap','picker_main','picker_main2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.remove();
      console.log(`🗑️ Removed overlay element #${id}`);
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  chrome.storage.local.get('csvData', ({ csvData }) => {
    if (message.action === 'fill') {
      const data = csvData[message.catalogId];
      if (!data) {
        sendResponse({ success: false, error: 'ID not found' });
        return;
      }

      // Reusable autofill logic
      function set(selector, val) {
        const el = document.querySelector(selector);
        if (!el) return;
        // Treat "na", "n/a", "nan" (case-insensitive) as blank
        const blankVals = ["na", "n/a", "nan"];
        let v = (typeof val === "string") ? val.trim() : val;
        if (v && blankVals.includes(String(v).toLowerCase())) v = "";
        if (el.tagName === 'INPUT' && el.type === 'checkbox') {
          el.checked = !!v && String(v).toLowerCase() !== 'false' && v !== '0';
        } else {
          el.value = v ?? '';
        }
      }

      set('#cat_catnum',   data['Catalog ID']);
      set('#cat_minid',    data['MinID']);
      set('#cat_title',    data['Specimen Title']);
      set('#cat_locality', data['Locality']);

      // Acquisition date: "YYYY-MM-DD"
      if (data['Date of Acquisition']) {
        const parts = data['Date of Acquisition'].split('-');
        set('#cat_acqyear',  parts[0] ? parseInt(parts[0], 10) : '');
        set('#cat_acqmonth', parts[1] ? parseInt(parts[1], 10) : '');
        set('#cat_acqday',   parts[2] ? parseInt(parts[2], 10) : '');
      }

      // Dimensions: "WxHxD"
      if (data['Dimensions']) {
        const m = data['Dimensions'].match(/(\d+)[x×](\d+)[x×](\d+)/);
        if (m) {
          set('#cat_w', m[1]);
          set('#cat_h', m[2]);
          set('#cat_d', m[3]);
        }
      }

      set('#cat_xtal',        data['Max Crystal Size']);
      set('#cat_weight',      data['Weight']);
      set('#cat_storage',     data['Specimen Storage Location']);
      set('#cat_source',      data['Specimen Source']);
      set('input[name="cat_selfcollected"]', data['Collected by me']);

      // Date specimen collected
      if (data['Date Specimen Collected']) {
        const parts = data['Date Specimen Collected'].split('-');
        set('#cat_colyear',  parts[0] ? parseInt(parts[0], 10) : '');
        set('#cat_colmonth', parts[1] ? parseInt(parts[1], 10) : '');
        set('#cat_colday',   parts[2] ? parseInt(parts[2], 10) : '');
      }

      // Deaccessioned, Deaccessioned to
      set('input[name="cat_deaccessioned"]', data['Deaccessioned']);
      set('#cat_deaccessionedto',            data['Deaccessioned to']);

      // Prices & values
      set('#cat_labelprice',     data['Label Price']);
      set('#cat_buyprice',       data['Purchase Price']);
      set('#cat_buyvalue',       data['Cost (in $)']);
      set('#cat_appraisalvalue', data['Estimated Value']);
      set('#cat_photo',          data['Override photo ID']);

      // Long text areas
      set('#cat_owners',      data['Previous Owners']);
      set('#cat_repairs',     data['Damage']);
      set('#cat_description', data['Notes']);

      // Flag for label
      set('input[name="cat_dolabel"]', data['Labels']);

      // ===== Mineral picker autofill using Species columns =====
      const speciesCols = ['Species 1','Species 2','Species 3','Species 4','Species 5'];
      const minerals = speciesCols
        .map(col => data[col])
        .filter(name => name && !['na','n/a','nan'].includes(String(name).toLowerCase()))
        .map(name => name.trim());
      if (minerals.length) {
        console.log('[Mindat Autofill] autofilling minerals:', minerals);
        autofillMineralsByName(minerals);
      }
      // ===== end mineral picker autofill =====

      sendResponse({ success: true });
    }
  });

  // MUST return true when sending response asynchronously
  return true;
});



