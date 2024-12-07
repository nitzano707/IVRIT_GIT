const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const statusDiv = document.getElementById("statusDiv");
const outputDiv = document.getElementById("outputDiv");
let apiKey = localStorage.getItem("runpodApiKey");

if (!apiKey) {
    apiKey = prompt("הזן את הטוקן של RunPod:");
    localStorage.setItem("runpodApiKey", apiKey);
}

async function splitAndUpload(audioFile) {
    const CHUNK_SIZE = 9 * 1024 * 1024; // 9MB
    const totalChunks = Math.ceil(audioFile.size / CHUNK_SIZE);
    const chunks = [];

    for (let start = 0; start < audioFile.size; start += CHUNK_SIZE) {
        const chunk = audioFile.slice(start, start + CHUNK_SIZE);
        chunks.push(chunk);
    }

    const jobIds = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("type", "file");
        formData.append("model", "ivrit-ai/faster-whisper-v2-d4");

        statusDiv.innerHTML = `מעלה מקטע ${i + 1} מתוך ${chunks.length}...`;

        try {
            const response = await fetch("https://api.runpod.ai/v2/flsha1hfkp14sw/run", {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey}` },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("שגיאה בבקשת POST:", errorText);
                throw new Error("שגיאה בעת שליחת קובץ: " + response.statusText);
            }

            const result = await response.json();
            jobIds.push(result.id);
        } catch (error) {
            console.error("שגיאה בהעלאת קובץ:", error);
            throw error;
        }
    }

    statusDiv.innerHTML = "כל המקטעים הועלו. ממתין לעיבוד...";
    return jobIds;
}

async function checkAllJobsStatus(jobIds) {
    const results = [];
    for (const jobId of jobIds) {
        let status = null;
        while (status !== "COMPLETED") {
            statusDiv.innerHTML = `בודק סטטוס לעבודה ${jobId}...`;
            await new Promise((resolve) => setTimeout(resolve, 5000)); // המתנה של 5 שניות

            const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
                headers: { "Authorization": `Bearer ${apiKey}` },
            });

            if (!response.ok) {
                console.error(`שגיאה בבדיקת סטטוס לעבודה ${jobId}:`, await response.text());
                throw new Error(`שגיאה בבדיקת סטטוס לעבודה ${jobId}`);
            }

            const result = await response.json();
            status = result.status;

            if (status === "COMPLETED") {
                results.push(result.output);
            }
        }
    }

    return results;
}

function mergeResults(results) {
    return results
        .flatMap((result) => result.segments)
        .map((segment, index) => `סגמנט ${index + 1}:\n${segment.text}`)
        .join("\n\n");
}

uploadButton.addEventListener("click", async () => {
    const selectedFile = fileInput.files[0];
    if (!selectedFile) {
        statusDiv.innerHTML = "אנא בחר קובץ להעלאה.";
        return;
    }

    try {
        const jobIds = await splitAndUpload(selectedFile);
        const results = await checkAllJobsStatus(jobIds);
        const transcript = mergeResults(results);

        statusDiv.innerHTML = "התמלול הושלם!";
        outputDiv.innerHTML = `<pre>${transcript}</pre>`;
    } catch (error) {
        statusDiv.innerHTML = "שגיאה בתהליך התמלול. נסה שוב מאוחר יותר.";
        console.error(error);
    }
});
