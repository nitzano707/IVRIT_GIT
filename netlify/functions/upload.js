exports.handler = async (event) => {
    console.log('Upload function triggered');
    console.log('HTTP Method:', event.httpMethod);
    console.log('Event body:', event.body);

    // טיפול בבקשות OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    try {
        const uploadPreset = process.env.UPLOAD_PRESET || 'audio_uploads';
        console.log('Using upload preset:', uploadPreset);

        const formData = new FormData();
        formData.append('file', Buffer.from(event.body, 'base64'), {
            filename: 'uploaded_file',
        });
        formData.append('upload_preset', uploadPreset);

        console.log('Sending request to Cloudinary...');
        const response = await fetch(`${process.env.CLOUDINARY_URL}/auto/upload`, {
            method: 'POST',
            body: formData,
        });

        const responseJson = await response.json();
        console.log('Cloudinary response:', responseJson);

        if (responseJson.secure_url) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ url: responseJson.secure_url }),
            };
        } else {
            console.error('Cloudinary upload failed:', responseJson);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Upload failed', details: responseJson }),
            };
        }
    } catch (error) {
        console.error('Error occurred in upload function:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
        };
    }
};
