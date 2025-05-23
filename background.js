chrome.action.onClicked.addListener(async (tab) => {
  const catalogId = prompt("Enter Catalog ID:");
  if (!catalogId) return;

  const url = chrome.runtime.getURL("mindat_export.csv");
  const res = await fetch(url);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true });

  const match = parsed.data.find(row => row["Catalog ID"] === catalogId);
  if (!match) {
    alert("Catalog ID not found in CSV.");
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: "autofill",
    data: match
  });
});