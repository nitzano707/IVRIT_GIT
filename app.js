document.getElementById('transcribe-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('audio-file');
    const statusDiv = document.getElementById('status');
    const transcriptionDiv = document.getElementById('transcription');
    const spinner = document.getElementById('spinner');

    statusDiv.innerHTML = '';
    transcriptionDiv.innerHTML = '';
    spinner.style.display = 'block';

    if (!fileInput.files[0]) {
        alert('Please upload an audio file.');
        spinner.style.display = 'none';
        return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        alert('Please provide a valid API key.');
        spinner.style.display = 'none';
        return;
    }

    const file = fileInput.files[0];
    const base64Audio = await fileToBase64(file);

    const payload = {
        input: {
            type: 'blob',
            data: base64Audio,
            model: 'ivrit-ai/faster-whisper-v2-d4'
        }
    };

    try {
        const response = await fetch('https://api.runpod.ai/v2/flsha1hfkp14sw/run', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.id) {
            await checkJobStatus(data.id, apiKey);
        } else {
            statusDiv.innerHTML = 'Error starting transcription.';
        }
    } catch (error) {
        statusDiv.innerHTML = 'Error connecting to the API.';
    } finally {
        spinner.style.display = 'none';
    }
});

function getApiKey() {
    let apiKey = localStorage.getItem('runpodApiKey');
    if (!apiKey) {
        apiKey = prompt('Please enter your RunPod API key:');
        if (apiKey) {
            localStorage.setItem('runpodApiKey', apiKey);
        }
    }
    return apiKey;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function checkJobStatus(jobId, apiKey) {
    const statusDiv = document.getElementById('status');
    const transcriptionDiv = document.getElementById('transcription');

    statusDiv.innerHTML = 'Job is in progress...';

    let status = 'IN_QUEUE';
    while (status === 'IN_QUEUE' || status === 'PROCESSING') {
        try {
            const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            const data = await response.json();
            status = data.status;

            if (status === 'COMPLETED') {
                displayTranscription(data.output.result.segments);
                statusDiv.innerHTML = 'Transcription completed successfully!';
                return;
            } else if (status === 'FAILED') {
                statusDiv.innerHTML = 'Job failed. Please try again.';
                return;
            }
        } catch (error) {
            statusDiv.innerHTML = 'Error checking job status.';
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
    }
}

function displayTranscription(segments) {
    const transcriptionDiv = document.getElementById('transcription');
    transcriptionDiv.innerHTML = '<h2>Transcription:</h2>';
    segments.forEach(segment => {
        const speakerText = `<strong>Speaker ${segment.id}:</strong> ${segment.text}`;
        transcriptionDiv.innerHTML += `<p>${speakerText}</p>`;
    });
}
