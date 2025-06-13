// ==UserScript==
// @name         Civitai自动下载图像和txt
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Intelligently waits for the full image to load, then downloads it and a metadata .txt file with matching names on Civitai image pages.
// @author       Your Name (with fixes)
// @match        https://civitai.com/images/*
// @grant        GM_download
// @grant        GM_log
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // A baseline delay to allow the general page structure to load.
    setTimeout(main, 3000);

    function main() {
        console.log("Civitai Metadata Extractor: Script running...");

        try {
            // --- 1. Extract all metadata ---
            const metadata = extractAllMetadata();
            if (!metadata) {
                console.error("Civitai Metadata Extractor: Could not extract metadata. Page structure might have changed.");
                return;
            }

            // Get the image ID from the URL. This will be our base filename.
            const imageId = window.location.pathname.split('/')[2];
            if (!imageId) {
                console.error("Civitai Metadata Extractor: Could not determine image ID from URL.");
                return;
            }

            // --- 2. Prepare and download the TXT file (this can happen immediately) ---
            const textContent = formatMetadataAsText(metadata);
            const txtFilename = `${imageId}.txt`;
            downloadTextFile(textContent, txtFilename);

            // =================================================================================
            //  --- REVISED LOGIC: Intelligently wait for the final image before downloading ---
            // =================================================================================
            downloadImageWhenReady(imageId);

        } catch (error) {
            console.error("Civitai Metadata Extractor: An error occurred in the main function.", error);
        }
    }

    /**
     * Finds the main image element and polls its `src` attribute until the
     * high-resolution version is loaded, then triggers the download.
     * @param {string} imageId - The base filename for the downloaded image.
     */
    function downloadImageWhenReady(imageId) {
        const pollingInterval = 250; // Check every 250ms
        const maxWaitTime = 10000;   // Wait a maximum of 10 seconds
        let totalWait = 0;

        // The selector for the main image, confirmed by you.
        const imageElement = document.querySelector('img.EdgeImage_image__iH4_q');

        if (!imageElement) {
            console.error("Civitai Metadata Extractor: Could not find the main image element to observe.");
            return;
        }

        console.log("Civitai Metadata Extractor: Waiting for the final high-resolution image to load...");

        const poller = setInterval(() => {
            const currentSrc = imageElement.src;

            // The key condition: The final image URL contains "original=true".
            // We also check if the src is not empty and is a http/https URL.
            if (currentSrc && currentSrc.startsWith('http') && currentSrc.includes('original=true')) {
                clearInterval(poller); // Stop polling
                console.log("Civitai Metadata Extractor: Final image URL detected:", currentSrc);
                downloadImage(currentSrc, imageId);
            } else {
                totalWait += pollingInterval;
                if (totalWait >= maxWaitTime) {
                    clearInterval(poller);
                    console.error(`Civitai Metadata Extractor: Timed out after ${maxWaitTime / 1000}s waiting for the final image URL. The URL found was: ${currentSrc}. It might be a placeholder or the page failed to load completely.`);
                }
            }
        }, pollingInterval);
    }

    /**
     * Downloads an image from a URL with a custom filename.
     * @param {string} imageUrl - The URL of the image to download.
     * @param {string} imageId - The base filename to use.
     */
    function downloadImage(imageUrl, imageId) {
        try {
            const urlPath = new URL(imageUrl).pathname;
            const extension = urlPath.substring(urlPath.lastIndexOf('.'));
            const newImageFilename = `${imageId}${extension}`;

            console.log(`Civitai Metadata Extractor: Initiating image download as '${newImageFilename}'...`);
            GM_download({
                url: imageUrl,
                name: newImageFilename,
                onload: () => console.log(`Civitai Metadata Extractor: Image '${newImageFilename}' download finished.`),
                onerror: (err) => console.error(`Civitai Metadata Extractor: Error downloading image.`, err)
            });
        } catch (e) {
            console.error("Civitai Metadata Extractor: Failed to process image URL for download.", e);
        }
    }

    /**
     * Downloads the metadata as a .txt file.
     * @param {string} textContent - The content for the file.
     * @param {string} filename - The desired filename.
     */
    function downloadTextFile(textContent, filename) {
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const dataUrl = URL.createObjectURL(blob);
        GM_download({
            url: dataUrl,
            name: filename,
            onload: function() {
                URL.revokeObjectURL(dataUrl);
                console.log(`Civitai Metadata Extractor: Metadata file '${filename}' download finished.`);
            },
            onerror: function(error) {
                URL.revokeObjectURL(dataUrl);
                console.error(`Civitai Metadata Extractor: Error downloading metadata file.`, error);
            }
        });
        console.log(`Civitai Metadata Extractor: Metadata file '${filename}' download initiated.`);
    }


    // --- Metadata extraction functions remain the same ---
    function extractAllMetadata() {
        const metadata = {};
        metadata.sourceUrl = window.location.href;
        const prompts = extractPrompts();
        metadata.positivePrompt = prompts.positive;
        metadata.negativePrompt = prompts.negative;
        metadata.resources = extractResources();
        metadata.details = extractDetails();
        return metadata;
    }

    function extractPrompts() {
        const prompts = { positive: "Not found", negative: "Not found" };
        let generationDataContainer = null;
        const allHeaders = document.querySelectorAll('h3.mantine-Title-root');
        for (const h of allHeaders) {
            if (h.textContent.trim().toLowerCase() === 'generation data') {
                generationDataContainer = h.parentElement;
                break;
            }
        }
        if (!generationDataContainer) {
            console.error("Civitai Metadata Extractor: Could not find 'Generation Data' section.");
            generationDataContainer = document;
        }
        const promptElements = generationDataContainer.querySelectorAll('.mantine-1c2skr8');
        if (promptElements.length > 0) {
            prompts.positive = promptElements[0].textContent.trim();
        }
        if (promptElements.length > 1) {
            prompts.negative = promptElements[1].textContent.trim();
        }
        return prompts;
    }

    function extractResources() {
        const resources = [];
        let resourceList = null;
        const allHeaders = document.querySelectorAll('h3.mantine-Title-root');
        for (const h of allHeaders) {
            if (h.textContent.trim().toLowerCase() === 'resources') {
                const container = h.parentElement;
                if (container && container.nextElementSibling && container.nextElementSibling.tagName === 'UL') {
                    resourceList = container.nextElementSibling;
                    break;
                }
            }
        }
        if (!resourceList) {
            resourceList = document.querySelector('ul.flex.list-none.flex-col');
        }
        if (!resourceList) {
            return ["Resource list not found."];
        }
        resourceList.querySelectorAll('li').forEach(item => {
            const linkElement = item.querySelector('a[href*="/models/"]');
            const nameElement = item.querySelector('div.mantine-12h10m4');
            const versionElement = item.querySelector('div.mantine-nvo449');
            const typeElement = item.querySelector('div.mantine-qcxgtg span.mantine-Badge-inner');
            const resource = {};
            if (nameElement) resource.name = nameElement.textContent.trim();
            if (linkElement) resource.link = `https://civitai.com${linkElement.getAttribute('href')}`;
            if (versionElement) resource.version = versionElement.textContent.trim();
            if (typeElement) resource.type = typeElement.textContent.trim();
            const weightElement = item.querySelector('div.mantine-j55fvo span.mantine-Badge-inner');
            if (weightElement) {
                resource.weight = weightElement.textContent.trim();
            }
            resources.push(resource);
        });
        return resources;
    }

    function extractDetails() {
        const details = {};
        const detailsContainer = document.querySelector('div.flex.flex-wrap.gap-2');
        if (!detailsContainer) return details;
        const detailBadges = detailsContainer.querySelectorAll(':scope > div.mantine-Badge-root');
        detailBadges.forEach(badge => {
            const text = badge.textContent.trim();
            const parts = text.split(/:(.*)/s);
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts[1].trim();
                details[key] = value;
            }
        });
        return details;
    }

    function formatMetadataAsText(metadata) {
        let content = "Positive Prompt:\n";
        content += metadata.positivePrompt + "\n\n";
        content += "Negative Prompt:\n";
        content += metadata.negativePrompt + "\n\n";
        content += "--- Details ---\n";
        for (const [key, value] of Object.entries(metadata.details)) {
            content += `${key}: ${value}\n`;
        }
        content += "\n";
        content += "--- Resources ---\n";
        if (metadata.resources.length > 0 && typeof metadata.resources[0] === 'string') {
            content += metadata.resources[0] + "\n\n";
        } else {
            metadata.resources.forEach(res => {
                content += `Type: ${res.type || 'N/A'}\n`;
                content += `Name: ${res.name || 'N/A'}\n`;
                content += `Version: ${res.version || 'N/A'}\n`;
                if (res.weight) {
                    content += `Weight: ${res.weight}\n`;
                }
                content += `Link: ${res.link || 'N/A'}\n\n`;
            });
        }
        content += "--- Source ---\n";
        content += `Image URL: ${metadata.sourceUrl}\n`;
        return content;
    }

})();