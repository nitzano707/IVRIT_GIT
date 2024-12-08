const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
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

    // טיפול בבקשות POST בלבד
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        const contentType = event.headers['content-type'];
        if (!contentType || !contentType.startsWith('multipart/form-data')) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Invalid Content-Type. Expected multipart/form-data.' }),
            };
        }

        const boundary = contentType.split('boundary=')[1];
        const bodyBuffer = Buffer.from(event.body, 'base64'); // פענוח Base64
        const formDataParts = parseMultipartFormData(bodyBuffer, boundary);

        const file = formDataParts.files.file; // שדה הקובץ נקרא "file"
        if (!file) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'No file uploaded.' }),
            };
        }

        // יצירת FormData לשליחה ל-Cloudinary
        const formData = new FormData();
        formData.append('file', file.content, file.filename);
        formData.append('upload_preset', 'ycxh1g5i'); // ה-Upload Preset שלך

        const cloudName = 'de1nxl62t'; // שם הענן שלך
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: formData,
        });

        const cloudinaryResponse = await response.json();
        if (cloudinaryResponse.secure_url) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ url: cloudinaryResponse.secure_url }),
            };
        } else {
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Failed to upload to Cloudinary.' }),
            };
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Internal Server Error.' }),
        };
    }
};

// פונקציה לפענוח multipart/form-data
function parseMultipartFormData(body, boundary) {
    const parts = body.toString().split(`--${boundary}`);
    const files = {};
    const fields = {};

    parts.forEach((part) => {
        const [headers, content] = part.split('\r\n\r\n');
        if (!headers || !content) return;

        const contentDisposition = headers.match(/Content-Disposition: form-data; name="(.+?)"(; filename="(.+?)")?/);
        if (!contentDisposition) return;

        const fieldName = contentDisposition[1];
        const filename = contentDisposition[3];

        if (filename) {
            const contentType = headers.match(/Content-Type: (.+)/)[1];
            files[fieldName] = {
                filename,
                content: Buffer.from(content.trim(), 'utf8'),
                contentType,
            };
        } else {
            fields[fieldName] = content.trim();
        }
    });

    return { files, fields };
}
