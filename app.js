const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const statusDiv = document.getElementById("statusDiv");
const outputDiv = document.getElementById("outputDiv");
let apiKey = localStorage.getItem("runpodApiKey");

if (!apiKey) {
    apiKey = prompt("הזן את הטוקן של RunPod:");
    localStorage.setItem("runpodApiKey", apiKey);
}

async function uploadAndTranscribe(audioFile) {
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("type", "file");
    formData.append("model", "ivrit-ai/faster-whisper-v2-d4");

    try {
        statusDiv.innerHTML = "שולח קובץ ל-RunPod...";
        const response = await fetch("https://api.runpod.ai/v2/flsha1hfkp14sw/run", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}` },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("שגיאה בבקשת POST:", errorText);
            throw new Error("שגיאה בשליחת הקובץ: " + errorText);
        }

        const result = await response.json();
        return result.id;
    } catch (error) {
        console.error("שגיאה:", error);
        throw error;
    }
}

async function checkJobStatus(jobId) {
    let status = null;
    while (status !== "COMPLETED") {
        statusDiv.innerHTML = `בודק סטטוס לעבודה ${jobId}...`;
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
            headers: { "Authorization": `Bearer ${apiKey}` },
        });

        if (!response.ok) {
            console.error("שגיאה בבדיקת סטטוס:", await response.text());
            throw new Error("שגיאה בבדיקת הסטטוס.");
        }

        const result = await response.json();
        status = result.status;

        if (status === "COMPLETED") {
            return result.output;
        }
    }
}

function formatTranscript(output) {
    return output.segments
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
        const jobId = await uploadAndTranscribe(selectedFile);
        const result = await checkJobStatus(jobId);
        const transcript = formatTranscript(result);

        statusDiv.innerHTML = "התמלול הושלם!";
        outputDiv.innerHTML = `<pre>${transcript}</pre>`;
    } catch (error) {
        statusDiv.innerHTML = "שגיאה בתהליך התמלול. נסה שוב.";
        console.error(error);
    }
});
