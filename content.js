console.log("GFG GitHub Sync: content script loaded");

function getProblemTitle() {
    const titleElement = document.querySelector("h1");

    if (titleElement) {
        return titleElement.innerText.trim();
    }

    return "Problem title not found";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getProblem") {
        const title = getProblemTitle();

        sendResponse({
            title: title
        });
    }
});