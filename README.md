# GFG GitHub Sync 

**A personal Chrome extension that syncs GeeksforGeeks coding solutions directly to GitHub.**

GFG GitHub Sync simplifies maintaining a coding portfolio by extracting solutions from the GeeksforGeeks code editor and uploading them to a GitHub repository. It uses the GitHub REST API to create new solution files or update existing ones, keeping coding practice organized in one place.

## Features

- **Solution Extraction:** Extracts source code from the GeeksforGeeks editor.
- **GitHub Integration:** Uploads solutions directly to a GitHub repository using the GitHub REST API.
- **Create and Update Files:** Creates new solution files and updates existing ones using GitHub's SHA-based file versioning.
- **Persistent Configuration:** Stores the GitHub personal access token locally using Chrome Storage.
- **Automatic File Naming:** Generates filenames from problem titles for easier organization.
- **Simple Interface:** Provides a popup to save the GitHub token and trigger synchronization.

## Tech Stack

- **Language:** JavaScript
- **Browser Extension:** Chrome Extension Manifest V3
- **APIs:** Chrome Storage API, Chrome Scripting API, GitHub REST API
- **Web Technologies:** HTML, CSS
- **Data Encoding:** Base64

## How It Works

1. Open a coding problem on GeeksforGeeks.
2. Write your solution in the code editor.
3. Open the GFG GitHub Sync extension.
4. Save your GitHub personal access token in the extension.
5. Click **Sync to GitHub**.
6. The extension extracts the problem title and source code.
7. It creates or updates the corresponding `.cpp` file in the configured GitHub repository.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Heena-Sabharwal/GFG-GitHub-Sync.git
```

### 2. Load the extension in Chrome

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the cloned `GFG-GitHub` project folder.

### 3. Configure GitHub access

1. Create a GitHub personal access token with **Contents: Read and write** permission, restricted to your target solutions repository.
2. Open the extension popup.
3. Paste the token and click **Save Token**.

**Security note:** Never commit your personal access token to the repository or share it publicly. The extension stores it in Chrome's local extension storage.

## Output

Solutions are stored in the configured GitHub repository under the `GFG/` directory.

Example:

```text
GeekforGeeks-Solutions/
└── GFG/
    ├── Maximum-Value-in-a-Bitonic-Array.cpp
    └── Problem-Name.cpp
```

## Motivation

I wanted a simpler and more reliable way to maintain my GeeksforGeeks solutions on GitHub. Instead of manually copying code into files and pushing each solution, I built a personal browser extension that connects the coding environment directly to my repository.

## Future Improvements

- Detect accepted submissions and trigger synchronization automatically.
- Support multiple programming languages.
- Organize solutions by topic and difficulty.
- Add solution metadata, including problem links and difficulty.
- Improve sync history and error reporting.

## Author

**Heena Sabharwal**

- GitHub: [Heena-Sabharwal](https://github.com/Heena-Sabharwal)

---

*Built to make coding practice easier to track, organize, and share.* 
