document.getElementById('transcribe-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('audio-file');
    const transcriptionDiv = document.getElementById('transcription');
    const spinner = document.getElementById('spinner');

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
        const response = await fetch('https://api.runpod.ai/v2/<your-endpoint-key>/run', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.status === 'COMPLETED') {
            displayTranscription(data.output.result.segments);
        } else {
            transcriptionDiv.innerHTML = 'Error processing transcription.';
        }
    } catch (error) {
        transcriptionDiv.innerHTML = 'Error connecting to the API.';
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

function displayTranscription(segments) {
    const transcriptionDiv = document.getElementById('transcription');
    transcriptionDiv.innerHTML = '<h2>Transcription:</h2>';
    segments.forEach(segment => {
        const speakerText = `<strong>Speaker ${segment.id}:</strong> ${segment.text}`;
        transcriptionDiv.innerHTML += `<p>${speakerText}</p>`;
    });
}
