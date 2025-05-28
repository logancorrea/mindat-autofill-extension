const statusEl    = document.getElementById('status');
const catalogEl   = document.getElementById('catalogId');
const fillBtn     = document.getElementById('fillBtn');
const fileInput   = document.getElementById('csvFile');

// 1) CSV loader
fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) {
    statusEl.textContent = 'No file selected';
    return;
  }
  statusEl.textContent = 'Parsing CSV…';

  const text = await file.text();
  Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    complete: results => {
      const csvData = {};
      results.data.forEach(row => {
        const key = row['Catalog ID']?.toString().trim();
        if (key) csvData[key] = row;
      });
      chrome.storage.local.set({ csvData }, () => {
        statusEl.textContent = `Loaded ${Object.keys(csvData).length} entries`;
        catalogEl.removeAttribute('disabled');
        fillBtn.removeAttribute('disabled');
        catalogEl.focus();
      });
    },
    error: err => {
      console.error('CSV parse error', err);
      statusEl.textContent = 'Error parsing CSV';
    }
  });
});

// 2) Send “fill” message on button click
fillBtn.addEventListener('click', () => {
  const id = catalogEl.value.trim();
  if (!id) return alert('Please enter a Catalog ID');

  chrome.tabs.query(
    { url: "*://www.mindat.org/catedit.php*" },
    (tabs) => {
      if (!tabs.length) {
        statusEl.textContent = "❌ Couldn't find an open Mindat edit tab.";
        return;
      }
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'fill', catalogId: id },
        (response) => {
          if (chrome.runtime.lastError) {
            statusEl.textContent = "❌ Error: " + chrome.runtime.lastError.message;
          } else if (response && response.success) {
            statusEl.textContent = "✅ Autofill completed!";
          } else {
            statusEl.textContent = "❌ Autofill failed: " + (response?.error || "Unknown error");
          }
        }
      );
    }
  );
});

