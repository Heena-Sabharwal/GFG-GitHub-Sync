
const problemElement = document.getElementById("problem");
const statusElement = document.getElementById("status");
const syncButton = document.getElementById("syncButton");
const tokenInput = document.getElementById("token");
const saveTokenButton = document.getElementById("saveToken");

const historyElement = document.getElementById("history");
const updateReview = document.getElementById("updateReview");
const reviewDescription = document.getElementById("reviewDescription");
const existingCodeElement = document.getElementById("existingCode");
const newCodeElement = document.getElementById("newCode");
const confirmUpdateButton = document.getElementById("confirmUpdate");
const cancelUpdateButton = document.getElementById("cancelUpdate");


const repoOwnerInput = document.getElementById("repoOwner");
const repoNameInput = document.getElementById("repoName");
const repoBranchInput = document.getElementById("repoBranch");
const repoFolderInput = document.getElementById("repoFolder");
const saveSettingsButton = document.getElementById("saveSettings");
const settingsStatus = document.getElementById("settingsStatus");

const HISTORY_LIMIT = 50;

let pendingUpdate = null;
let pendingUpdates = [];
let pendingUpdateIndex = 0;

let activeSyncSummary = null;
// -------------------------
// GitHub URL helpers
// -------------------------


function normalizeTopicTag(tag) {
    return tag
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}


function getGitHubFileUrl(filePath, settings) {
    const encodedPath = filePath
        .split("/")
        .map(encodeURIComponent)
        .join("/");

    const owner = encodeURIComponent(settings.repoOwner);
    const repo = encodeURIComponent(settings.repoName);

    return `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
}


// -------------------------
// Code comparison helpers
// -------------------------

function normalizeCode(code) {
    return code
        .replace(/\r\n/g, "\n")
        .replace(/\n+$/, "");
}

function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";

    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

function decodeBase64(base64) {
    const binary = atob(base64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(
        binary,
        character => character.charCodeAt(0)
    );

    return new TextDecoder().decode(bytes);
}

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || `GitHub API error: ${response.status}`
        );
    }

    return data;
}


async function checkRepositoryAccess(token, settings) {
    const owner = encodeURIComponent(settings.repoOwner);
    const repo = encodeURIComponent(settings.repoName);

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json"
            }
        }
    );

    await readResponse(response);
}


// -------------------------
// Sync history
// -------------------------

async function recordHistory(entry) {
    const result = await chrome.storage.local.get(["syncHistory"]);
    const history = Array.isArray(result.syncHistory)
        ? result.syncHistory
        : [];

    history.unshift({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...entry
    });

    await chrome.storage.local.set({
        syncHistory: history.slice(0, HISTORY_LIMIT)
    });

    await renderHistory();
}

async function renderHistory() {
    const result = await chrome.storage.local.get(["syncHistory"]);
    const history = Array.isArray(result.syncHistory)
        ? result.syncHistory
        : [];

    historyElement.replaceChildren();

    if (history.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "muted";
        emptyMessage.textContent = "No sync history yet.";
        historyElement.appendChild(emptyMessage);
        return;
    }

    for (const item of history.slice(0, 10)) {
        const container = document.createElement("div");
        container.className = "history-item";

        const title = document.createElement("strong");
        title.textContent = item.title || "Unknown problem";

        const details = document.createElement("p");
        details.textContent =
            `${item.status} · ${new Date(item.timestamp).toLocaleString()}`;

        const path = document.createElement("p");
        path.className = "muted";
        path.textContent = item.filePath || "";

        container.append(title, details, path);

        if (item.url && isGitHubUrl(item.url)) {
            const link = document.createElement("a");
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Open on GitHub";
            container.appendChild(link);
        }

        if (item.message) {
            const message = document.createElement("p");
            message.textContent = item.message;
            container.appendChild(message);
        }

        historyElement.appendChild(container);
    }
}

function isGitHubUrl(value) {
    try {
        return new URL(value).hostname === "github.com";
    } catch {
        return false;
    }
}

// -------------------------
// Token management
// -------------------------

async function loadSavedToken() {
    const result = await chrome.storage.local.get(["githubToken"]);

    if (result.githubToken) {
        statusElement.textContent = "GitHub token is saved.";
    }
}


const DEFAULT_SETTINGS = {
    repoOwner: "Heena-Sabharwal",
    repoName: "GeekforGeeks-Solutions",
    repoBranch: "main",
    repoFolder: "GFG"
};

async function loadSavedSettings() {
    const data = await chrome.storage.local.get(["repoSettings"]);
    const settings = {
        ...DEFAULT_SETTINGS,
        ...(data.repoSettings || {})
    };

    repoOwnerInput.value = settings.repoOwner;
    repoNameInput.value = settings.repoName;
    repoBranchInput.value = settings.repoBranch;
    repoFolderInput.value = settings.repoFolder;
}

saveSettingsButton.addEventListener("click", async () => {
    const settings = {
        repoOwner: repoOwnerInput.value.trim(),
        repoName: repoNameInput.value.trim(),
        repoBranch: repoBranchInput.value.trim(),
        repoFolder: repoFolderInput.value.trim()
    };

    if (
        !settings.repoOwner ||
        !settings.repoName ||
        !settings.repoBranch
    ) {
        settingsStatus.textContent =
            "Username, repository, and branch are required.";
        return;
    }

    settings.repoFolder = settings.repoFolder.replace(/^\/+|\/+$/g, "");

    try {
        await chrome.storage.local.set({
            repoSettings: settings
        });

        repoFolderInput.value = settings.repoFolder;
        settingsStatus.textContent = "Settings saved successfully!";
    } catch (error) {
        settingsStatus.textContent =
            "Could not save settings: " + error.message;
    }
});


saveTokenButton.addEventListener("click", async () => {
    const token = tokenInput.value.trim();

    if (!token) {
        statusElement.textContent = "Please enter a token.";
        return;
    }

    try {
        await chrome.storage.local.set({ githubToken: token });
        tokenInput.value = "";
        statusElement.textContent = "GitHub token saved.";
    } catch (error) {
        statusElement.textContent =
            "Could not save token: " + error.message;
    }
});

// -------------------------
// Extract problem from GFG
// -------------------------

async function extractProblem(tab) {
    const results = await chrome.scripting.executeScript({
        target: {
            tabId: tab.id,
            allFrames: true
        },

        func: () => {
            let code = "";
            let source = "";
                    
        function detectLanguage() {
            const selectedOption = document.querySelector(
                ".problems_language_dropdown__DgjFb [role='option'][aria-checked='true']"
            );

            const languageText = selectedOption?.innerText
                ?.trim()
                .toLowerCase();

            if (!languageText) {
                return "unknown";
            }

            if (languageText.includes("c++")) return "cpp";
            if (languageText.includes("python")) return "python";
            if (languageText.includes("java") &&
                !languageText.includes("javascript")) {
                return "java";
            }
            if (languageText.includes("javascript")) return "javascript";
            if (languageText.includes("typescript")) return "typescript";
            if (/^c(?:\s|$)/.test(languageText)) return "c";

            return "unknown";
        }


            let title = document.title
                .replace(/\s*[| -]\s*GeeksforGeeks\s*$/i, "")
                .trim();

            const ace = document.querySelector(".ace_editor");

            if (ace) {
                const lines = ace.querySelector(".ace_text-layer");

                if (lines) {
                    code = lines.innerText.trim();
                    source = "ACE DOM";
                }
            }

            if (!code) {
                const lines = document.querySelector(".view-lines");

                if (lines) {
                    code = lines.innerText.trim();
                    source = "Monaco DOM";
                }
            }

            if (!code) {
                const editor = document.querySelector(".CodeMirror");
                const lines = editor?.querySelector(".CodeMirror-code");

                if (lines) {
                    code = lines.innerText.trim();
                    source = "CodeMirror DOM";
                }
            }

            if (!code) {
                const textareas = document.querySelectorAll("textarea");

                for (const textarea of textareas) {
                    if (textarea.value.trim()) {
                        code = textarea.value.trim();
                        source = "Textarea";
                        break;
                    }
                }
            }

            if (!title) {
                title = document.querySelector("h1")?.innerText.trim()
                    || "Unknown problem";
            }

            
                        
            const topicTags = (() => {
                const headings = [
                    ...document.querySelectorAll("h1, h2, h3, h4, h5, h6, div, span, p")
                ];

                const heading = headings.find(element =>
                    element.children.length < 3 &&
                    element.innerText?.trim() === "Topic Tags"
                );

                if (!heading) return [];

                let section = heading.parentElement;

                // Find the smallest parent containing the topic heading
                // and its associated tag elements.
                for (let level = 0; level < 4 && section; level++) {
                    const text = section.innerText || "";

                    if (text.includes("Topic Tags")) {
                        const nextHeading = [
                            ...section.querySelectorAll("h1, h2, h3, h4, h5, h6, div, span, p")
                        ].find(element =>
                            element !== heading &&
                            element.innerText?.trim() === "Company Tags"
                        );

                        if (nextHeading) {
                            section = heading.parentElement;
                            break;
                        }
                    }

                    section = section.parentElement;
                }

                const parent = heading.parentElement;
                if (!parent) return [];

                const candidates = [
                    ...parent.querySelectorAll("a, button, [class*='tag'], [class*='chip']")
                ];

                return [...new Set(
                    candidates
                        .map(element => element.innerText?.trim())
                        .filter(tag =>
                            tag &&
                            tag !== "Topic Tags" &&
                            tag !== "Company Tags" &&
                            tag.length < 80
                        )
                )];
            })();


            console.log("Detected GFG topic tags:", topicTags);

            return {
                title,
                code,
                source,
                language: detectLanguage(),
                topicTags,
                url: window.location.href
            };

        }
    });

    return results.find(result =>
        result.result?.code?.trim()
    )?.result;
}

// -------------------------
// Check GitHub file
// -------------------------

async function getExistingFile(fileUrl, token) {
    const response = await fetch(fileUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
        }
    });

    // Only a confirmed 404 means the file is absent.
    // Authentication, permission, and network errors must not
    // be treated as evidence that the file does not exist.
    if (response.status === 404) {
        return null;
    }

    const file = await readResponse(response);

    if (!file.content || !file.sha) {
        throw new Error(
            "Could not retrieve the existing file content and SHA."
        );
    }

    return {
        sha: file.sha,
        content: decodeBase64(file.content),
        url: file.html_url
    };
}

// -------------------------
// Display safe-update preview
// -------------------------



function showUpdateReview(attempt, existingFile) {
    pendingUpdate = {
        ...attempt,
        existingFile
    };

    const { problem, filePath } = attempt;

    reviewDescription.textContent =
        `File "${filePath}" already exists. ` +
        `Review file ${pendingUpdateIndex + 1} of ${pendingUpdates.length} ` +
        "before confirming the overwrite.";

    existingCodeElement.textContent = existingFile.content;
    newCodeElement.textContent = problem.code;

    updateReview.hidden = false;
    syncButton.disabled = true;

    statusElement.textContent =
        "Changes detected. Review the code before overwriting.";
}

function showNextPendingUpdate() {
    if (pendingUpdateIndex >= pendingUpdates.length) {
        finishPendingReviews();
        return;
    }

    const next = pendingUpdates[pendingUpdateIndex];

    showUpdateReview(next, next.existingFile);
}

function hideUpdateReview() {
    pendingUpdate = null;
    updateReview.hidden = true;
    syncButton.disabled = false;
}

function finishPendingReviews() {
    const summary = activeSyncSummary;

    pendingUpdate = null;
    pendingUpdates = [];
    pendingUpdateIndex = 0;
    updateReview.hidden = true;
    syncButton.disabled = false;

    if (!summary) {
        statusElement.textContent = "Sync review finished.";
        return;
    }

    const parts = [
        `Uploaded: ${summary.uploaded}`,
        `Unchanged: ${summary.unchanged}`,
        `Failed: ${summary.failed}`,
        `Cancelled: ${summary.cancelled}`
    ];

    statusElement.textContent = "Sync finished. " + parts.join(" | ");

    activeSyncSummary = null;
}


// -------------------------
// Upload new or confirmed solution
// -------------------------

async function uploadSolution(attempt, existingFile) {
        const {
        problem,
        filePath,
        fileUrl,
        token,
        settings
    } = attempt;

    const uploadData = {
        message: existingFile
            ? `Update solution: ${problem.title}`
            : `Add solution: ${problem.title}`,
        content: encodeBase64(problem.code),
        branch: settings.repoBranch
    };

    if (existingFile) {
        uploadData.sha = existingFile.sha;
    }

    const response = await fetch(fileUrl, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(uploadData)
    });

    const data = await readResponse(response);
    const action = existingFile ? "updated" : "created";

    await recordHistory({
        title: problem.title,
        filePath,
        status: action,
        url: data.content?.html_url || existingFile?.url || "",
        source: problem.source,
        message: existingFile
            ? "Existing solution updated."
            : "New solution uploaded."
    });

    statusElement.textContent = existingFile
        ? "Solution updated successfully!"
        : "Solution uploaded successfully!";
}

// -------------------------
// Main sync workflow
// -------------------------

syncButton.addEventListener("click", async () => {
    let attempt = null;
    syncButton.disabled = true;
    statusElement.textContent = "Reading GFG solution...";

    try {
        
        const tokenData = await chrome.storage.local.get(["githubToken"]);
        const token = tokenData.githubToken;

        if (!token) {
            throw new Error("Save your GitHub token first.");
        }

        const settingsData = await chrome.storage.local.get(["repoSettings"]);

        const settings = {
            ...DEFAULT_SETTINGS,
            ...(settingsData.repoSettings || {})
        };

        if (
            !settings.repoOwner ||
            !settings.repoName ||
            !settings.repoBranch
        ) {
            throw new Error(
                "Please configure your GitHub repository settings first."
            );
        }

        settings.repoFolder = (settings.repoFolder || "")
            .trim()
            .replace(/^\/+|\/+$/g, "");

        if (
            settings.repoFolder &&
            settings.repoFolder.split("/").some(
                part => !part || part === "." || part === ".."
            )
        ) {
            throw new Error("Please enter a valid destination folder.");
        }

        statusElement.textContent = "Checking repository access...";
        await checkRepositoryAccess(token, settings);


        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id || !tab.url ||
            !/^https:\/\/(www\.)?geeksforgeeks\.org\//i.test(tab.url)) {
            throw new Error(
                "Open a GeeksforGeeks problem page before syncing."
            );
        }

        const problem = await extractProblem(tab);
        console.log("Detected language:", problem?.language);
        console.log("Tags received by sync:", problem?.topicTags);

        console.log(
            "Normalized topic folders:",
            (problem?.topicTags || [])
                .map(normalizeTopicTag)
                .filter(Boolean)
        );

        if (!problem?.code?.trim()) {
            throw new Error(
                "Could not extract solution code from the editor."
            );
        }

        if (!problem.title || problem.title === "Unknown problem") {
            throw new Error("Could not identify the problem title.");
        }

        problemElement.textContent = problem.title;

                
        const languageConfig = {
            cpp: {
                folder: "CPP",
                extension: ".cpp"
            },
            python: {
                folder: "Python",
                extension: ".py"
            },
            java: {
                folder: "Java",
                extension: ".java"
            },
            javascript: {
                folder: "JavaScript",
                extension: ".js"
            },
            typescript: {
                folder: "TypeScript",
                extension: ".ts"
            },
            c: {
                folder: "C",
                extension: ".c"
            }
        };

        const language = problem.language;
        const config = languageConfig[language];

        if (!config) {
            statusElement.textContent =
                `Unsupported or undetected language: ${language}`;
            return;
        }

        
        const fileName =
            problem.title
                .replace(/[^a-zA-Z0-9]+/g, "-")
                .replace(/^-|-$/g, "") +
            config.extension;

        const topicTags = [
            ...new Set(
                (problem.topicTags || [])
                    .map(normalizeTopicTag)
                    .filter(Boolean)
            )
        ];

        const topics = topicTags.length > 0
            ? topicTags
            : ["Other"];

        const destinations = topics.map(topic => {
            const filePath = [
                settings.repoFolder,
                topic,
                config.folder,
                fileName
            ].filter(Boolean).join("/");

            return {
                filePath,
                fileUrl: getGitHubFileUrl(filePath, settings)
            };
        });

        console.log("GitHub destinations:", destinations);

        // Temporary test: display the planned destinations.
        // statusElement.textContent =
        //     `Found ${destinations.length} topic destination(s). Check the console.`;

        // return;



        
        activeSyncSummary = {
            uploaded: 0,
            unchanged: 0,
            failed: 0,
            cancelled: 0,
            failedPaths: []
        };

        pendingUpdates = [];
        pendingUpdateIndex = 0;

        for (const destination of destinations) {
            const attemptForFile = {
                problem,
                filePath: destination.filePath,
                fileUrl: destination.fileUrl,
                token,
                settings
            };

            try {
                statusElement.textContent =
                    `Checking ${destination.filePath}...`;

                const existingFile = await getExistingFile(
                    destination.fileUrl,
                    token
                );

                if (!existingFile) {
                    await uploadSolution(attemptForFile, null);
                    activeSyncSummary.uploaded++;
                    continue;
                }

                const oldCode = normalizeCode(existingFile.content);
                const newCode = normalizeCode(problem.code);

                if (oldCode === newCode) {
                    await recordHistory({
                        title: problem.title,
                        filePath: destination.filePath,
                        status: "unchanged",
                        url: existingFile.url,
                        source: problem.source,
                        message: "No changes detected. Commit skipped."
                    });

                    activeSyncSummary.unchanged++;
                    continue;
                }

                pendingUpdates.push({
                    ...attemptForFile,
                    existingFile
                });
            } catch (error) {
                console.error(
                    `Sync failed for ${destination.filePath}:`,
                    error
                );

                activeSyncSummary.failed++;

                await recordHistory({
                    title: problem.title,
                    filePath: destination.filePath,
                    status: "failed",
                    message: error.message
                });
            }
        }

        if (pendingUpdates.length > 0) {
            showNextPendingUpdate();
            return;
        }

        finishPendingReviews();


    } catch (error) {
        statusElement.textContent = "Sync failed: " + error.message;

        if (attempt) {
            try {
                await recordHistory({
                    title: attempt.problem.title,
                    filePath: attempt.filePath,
                    status: "failed",
                    message: error.message
                });
            } catch (historyError) {
                console.error("Could not save sync history:", historyError);
            }
        }

        console.error("Sync error:", error);

    } finally {
        syncButton.disabled = Boolean(pendingUpdate) || pendingUpdates.length > 0;
    }
});

// -------------------------
// Confirm or cancel overwrite
// -------------------------

confirmUpdateButton.addEventListener("click", async () => {
    if (!pendingUpdate) return;

    const attempt = pendingUpdate;
    const filePath = attempt.filePath;

    confirmUpdateButton.disabled = true;
    cancelUpdateButton.disabled = true;

    statusElement.textContent = `Updating ${filePath}...`;

    try {
        await uploadSolution(attempt, attempt.existingFile);

        if (activeSyncSummary) {
            activeSyncSummary.uploaded++;

            activeSyncSummary.failedPaths =
                (activeSyncSummary.failedPaths || []).filter(
                    path => path !== filePath
                );
        }

        pendingUpdateIndex++;
        showNextPendingUpdate();
    } catch (error) {
        console.error("Update failed:", error);

        if (activeSyncSummary) {
            activeSyncSummary.failedPaths =
                activeSyncSummary.failedPaths || [];

            if (!activeSyncSummary.failedPaths.includes(filePath)) {
                activeSyncSummary.failedPaths.push(filePath);
            }
        }

        statusElement.textContent =
            `Update failed for ${filePath}: ${error.message}. ` +
            "You can retry or cancel this file.";
    } finally {
        confirmUpdateButton.disabled = false;
        cancelUpdateButton.disabled = false;
    }
});

cancelUpdateButton.addEventListener("click", async () => {
    if (!pendingUpdate) return;

    const filePath = pendingUpdate.filePath;

    await recordHistory({
        title: pendingUpdate.problem.title,
        filePath,
        status: "cancelled",
        message: "Overwrite cancelled by user"
    });

    if (activeSyncSummary) {
        activeSyncSummary.cancelled++;
    }

    pendingUpdateIndex++;
    showNextPendingUpdate();

    statusElement.textContent =
        `Skipped overwrite for ${filePath}.`;
});


// -------------------------
// Initialize popup
// -------------------------

loadSavedToken().catch(console.error);
renderHistory().catch(console.error);
loadSavedSettings().catch(console.error);

