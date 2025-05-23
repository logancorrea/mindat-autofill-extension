document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  // Use PapaParse for robust CSV parsing
  const parsed = Papa.parse(text, { header: true });
  const list = document.getElementById('catalog-list');
  list.innerHTML = '';
  parsed.data.forEach(row => {
    if (row["Catalog ID"]) {
      const div = document.createElement('div');
      div.className = 'catalog-item';
      div.textContent = `Catalog ID: ${row["Catalog ID"]}`;
      div.onclick = () => {
        // Send message to content script to autofill
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'autofill',
            catalogId: row["Catalog ID"]
          });
        });
      };
      list.appendChild(div);
    }
  });

  // Save parsed CSV to storage so it persists if the sidebar is closed/reopened
  chrome.storage.local.set({ mindatCsv: parsed.data });
});

// On sidebar load, restore CSV if available
chrome.storage.local.get('mindatCsv', (result) => {
  if (result.mindatCsv) {
    const list = document.getElementById('catalog-list');
    list.innerHTML = '';
    result.mindatCsv.forEach(row => {
      if (row["Catalog ID"]) {
        const div = document.createElement('div');
        div.className = 'catalog-item';
        div.textContent = `Catalog ID: ${row["Catalog ID"]}`;
        div.onclick = () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'autofill',
              catalogId: row["Catalog ID"]
            });
          });
        };
        list.appendChild(div);
      }
    });
  }
});