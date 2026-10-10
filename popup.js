const problemElement = document.getElementById("problem");
const statusElement = document.getElementById("status");
const syncButton = document.getElementById("syncButton");

const tokenInput = document.getElementById("token");
const saveTokenButton = document.getElementById("saveToken");


// Check whether token is already saved
chrome.storage.local.get(["githubToken"], (result) => {

    if (result.githubToken) {
        statusElement.textContent = "GitHub token is saved.";
    }
});


// Save GitHub token
saveTokenButton.addEventListener("click", async () => {

    const token = tokenInput.value.trim();

    if (!token) {
        statusElement.textContent = "Please enter a token.";
        return;
    }

    await chrome.storage.local.set({
        githubToken: token
    });

    tokenInput.value = "";

    statusElement.textContent = "GitHub token saved.";
});


// Sync button
syncButton.addEventListener("click", async () => {

    console.log("SYNC BUTTON CLICKED");

    statusElement.textContent = "Reading GFG problem...";

    // Get GitHub token
    const tokenData =
        await chrome.storage.local.get(["githubToken"]);

    const token = tokenData.githubToken;

    if (!token) {
        statusElement.textContent =
            "GitHub token not found.";

        return;
    }


    // Get current tab
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });


    try {

        // Extract problem information from GFG
        const results =
            await chrome.scripting.executeScript({

                target: {
                    tabId: tab.id,
                    allFrames: true
                },

                func: () => {

                    let code = "";
                    let source = "";

                    // -------------------------
                    // Problem title
                    // -------------------------

                    let title = document.title;

                    title = title
                        .replace(" | GeeksforGeeks", "")
                        .replace(" - GeeksforGeeks", "")
                        .trim();


                    // -------------------------
                    // ACE editor
                    // -------------------------

                    const ace =
                        document.querySelector(".ace_editor");

                    if (ace) {

                        const lines =
                            ace.querySelector(".ace_text-layer");

                        if (lines) {

                            code =
                                lines.innerText.trim();

                            source = "ACE DOM";
                        }
                    }


                    // -------------------------
                    // Monaco editor
                    // -------------------------

                    if (!code) {

                        const monacoLines =
                            document.querySelector(".view-lines");

                        if (monacoLines) {

                            code =
                                monacoLines.innerText.trim();

                            source = "Monaco DOM";
                        }
                    }


                    // -------------------------
                    // CodeMirror
                    // -------------------------

                    if (!code) {

                        const codeMirror =
                            document.querySelector(".CodeMirror");

                        if (codeMirror) {

                            const lines =
                                codeMirror.querySelector(
                                    ".CodeMirror-code"
                                );

                            if (lines) {

                                code =
                                    lines.innerText.trim();

                                source = "CodeMirror DOM";
                            }
                        }
                    }


                    // -------------------------
                    // Textarea
                    // -------------------------

                    if (!code) {

                        const textareas =
                            document.querySelectorAll(
                                "textarea"
                            );

                        for (const textarea of textareas) {

                            if (textarea.value.trim()) {

                                code =
                                    textarea.value.trim();

                                source = "Textarea";

                                break;
                            }
                        }
                    }


                    return {
                        title: title,
                        code: code,
                        source: source,
                        url: window.location.href
                    };
                }
            });


        const found = results.find(
            result =>
                result.result &&
                result.result.code
        );


        if (!found) {

            statusElement.textContent =
                "Could not find solution code.";

            return;
        }


        const problem = found.result;

        console.log("FOUND PROBLEM:", problem);


        problemElement.textContent =
            problem.title;

        statusElement.textContent =
            "Code found. Uploading to GitHub...";


        // -------------------------
        // Create GitHub filename
        // -------------------------

        const fileName =
            problem.title
                .replace(/[^a-zA-Z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
                + ".cpp";


        const filePath =
            "GFG/" + fileName;


        // -------------------------
        // Convert code to Base64
        // -------------------------

        const base64Code =
            btoa(
                unescape(
                    encodeURIComponent(problem.code)
                )
            );


        // -------------------------
        // GitHub API
        // -------------------------

        // GitHub API

        const githubUrl =
            `https://api.github.com/repos/Heena-Sabharwal/GeekforGeeks-Solutions/contents/${encodeURIComponent(filePath)}`;


        // Check if the file already exists
        const existingResponse =
            await fetch(githubUrl, {

                method: "GET",

                headers: {

                    "Authorization": `Bearer ${token}`,

                    "Accept": "application/vnd.github+json"
                }
            });


        let existingFile = null;

        if (existingResponse.ok) {

            existingFile =
                await existingResponse.json();

            console.log(
                "Existing GitHub file found:",
                existingFile
            );
        }


        // Data for GitHub
        const uploadData = {

            message:
                `Add solution: ${problem.title}`,

            content:
                base64Code,

            branch:
                "main"
        };


        // If file already exists, include its SHA
        if (existingFile) {

            uploadData.sha =
                existingFile.sha;
        }


        // Upload the file
        const response =
            await fetch(githubUrl, {

                method: "PUT",

                headers: {

                    "Authorization": `Bearer ${token}`,

                    "Accept":
                        "application/vnd.github+json",

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(uploadData)
            });


        const data =
            await response.json();


        console.log(
            "GITHUB RESPONSE:",
            data
        );


        if (response.ok) {

            statusElement.textContent =
                existingFile
                    ? "Solution updated on GitHub!"
                    : "Successfully uploaded to GitHub!";

            console.log(
                "GitHub file:",
                data.content?.html_url
            );

        } else {

            statusElement.textContent =
                "GitHub error: " +
                (data.message || response.status);

            console.error(
                "GitHub upload failed:",
                data
            );
        }

    } catch (error) {

        console.error(
            "SYNC ERROR:",
            error
        );

        statusElement.textContent =
            "Error: " + error.message;
    }
});