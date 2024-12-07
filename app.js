const API_URL = "https://api.runpod.ai/v2/flsha1hfkp14sw/run";
const STATUS_URL = "https://api.runpod.ai/v2/flsha1hfkp14sw/status";
const apiKey = "הכנס-כאן-את-מפתח-ה-API-שלך";

document.getElementById("transcribeButton").addEventListener("click", async () => {
    const fileInput = document.getElementById("audioInput");
    const file = fileInput.files[0];
    if (!file) {
        alert("אנא בחר קובץ שמע.");
        return;
    }

    const statusElement = document.getElementById("status");
    statusElement.textContent = "ממיר את הקובץ ל-Base64...";

    try {
        const base64File = await convertToBase64(file);

        statusElement.textContent = "שולח את הקובץ ל-API...";
        const jobId = await uploadAndGetJobId(base64File);

        statusElement.textContent = "מחכה לתוצאות...";
        const transcription = await waitForResult(jobId);

        statusElement.textContent = "התמלול הסתיים!";
        displayTranscription(transcription);
    } catch (error) {
        statusElement.textContent = "שגיאה: " + error.message;
    }
});

async function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(",")[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
}

async function uploadAndGetJobId(base64File) {
    const payload = {
        input: {
            file: base64File,
            type: "base64",
            model: "ivrit-ai/faster-whisper-v2-d4",
        },
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "שגיאה בשליחת הקובץ ל-API");
    }

    const data = await response.json();
    return data.id;
}

async function waitForResult(jobId) {
    const pollingInterval = 5000; // בדיקה כל 5 שניות
    const maxAttempts = 12; // עד 60 שניות

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch(`${STATUS_URL}/${jobId}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "שגיאה בבדיקת סטטוס העבודה");
        }

        const data = await response.json();
        if (data.status === "COMPLETED") {
            return data.output.result;
        } else if (data.status === "FAILED") {
            throw new Error("העבודה נכשלה.");
        }

        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
    }

    throw new Error("העבודה לא הסתיימה בזמן. נסה שוב מאוחר יותר.");
}

function displayTranscription(transcription) {
    const transcriptionDiv = document.getElementById("transcription");
    transcriptionDiv.innerHTML = "";

    transcription.segments.forEach((segment, index) => {
        const segmentDiv = document.createElement("div");
        segmentDiv.style.marginBottom = "10px";
        segmentDiv.textContent = `${index + 1}. ${segment.text}`;
        transcriptionDiv.appendChild(segmentDiv);
    });
}
