# ViewSync Application

This is a Next.js application built in Firebase Studio.

## Manual Deployment Guide

If the automatic deployment fails, it's likely because the project code was not pushed to your GitHub repository correctly. Follow these steps to fix this manually.

### Step 1: Get Your Project Code

First, you need a complete copy of your project on your local computer. There should be an option in your IDE to download the project files as a `.zip` archive. Once you have that downloaded, unzip it.

### Step 2: Push the Code Using GitHub Desktop

This is the most reliable way to get your code into the repository.

1.  **Install GitHub Desktop:** If you haven't already, download it from [desktop.github.com](https://desktop.github.com/).
2.  **Clone Your Repo:** Open the GitHub Desktop app and "Clone" your GitHub repository to your computer.
3.  **Open the Folder:** Use the "Show in Finder" (macOS) or "Show in Explorer" (Windows) button in GitHub Desktop to open the cloned folder.
4.  **Copy Your Code:** Go to the folder you unzipped in Step 1. Copy **ALL** the files and folders from inside it.
5.  **Paste into Repo Folder:** Paste everything into the cloned repository folder. It will ask to replace any existing files; allow it to do so.
6.  **Commit and Push:**
    *   Go back to GitHub Desktop. You'll see all the new files listed as changes.
    *   In the summary box in the bottom-left, type a message like `Add project files`.
    *   Click the blue **Commit to main** button.
    *   Click the **Push origin** button at the top of the window. This uploads your code to GitHub.

### Step 3: Redeploy in Firebase

Once the push is complete, go back to your Firebase App Hosting dashboard in the Google Cloud Console and trigger a new deployment from the `main` branch. This time, it will find all your code and the build should succeed.
