const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
    console.log('Function triggered');

    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS request');
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

    if (event.httpMethod !== 'POST') {
        console.error('Invalid HTTP method:', event.httpMethod);
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        if (!event.headers['content-type'] || !event.headers['content-type'].includes('multipart/form-data')) {
            console.error('Invalid Content-Type:', event.headers['content-type']);
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Invalid Content-Type. Expected multipart/form-data.' }),
            };
        }

        const boundary = event.headers['content-type'].split('boundary=')[1];
        const bodyBuffer = Buffer.from(event.body, 'base64');
        const parsedData = parseMultipartFormData(bodyBuffer, boundary);

        console.log('Parsed data:', parsedData);

        const file = parsedData.files.file;
        if (!file) {
            console.error('No file found in the request');
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'No file found in the request' }),
            };
        }

        const formData = new FormData();
        formData.append('file', file.content, file.filename);
        formData.append('upload_preset', 'ycxh1g5i');

        const cloudName = 'de1nxl62t';
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: formData,
        });

        const cloudinaryResponse = await response.json();
        console.log('Cloudinary response:', cloudinaryResponse);

        if (cloudinaryResponse.secure_url) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ url: cloudinaryResponse.secure_url }),
            };
        } else {
            console.error('Cloudinary upload failed:', cloudinaryResponse);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Cloudinary upload failed', details: cloudinaryResponse }),
            };
        }
    } catch (error) {
        console.error('Error occurred:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
        };
    }
};

// Helper function to parse multipart form data
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
                content: Buffer.from(content.trim(), 'binary'),
                contentType,
            };
        } else {
            fields[fieldName] = content.trim();
        }
    });

    return { files, fields };
}
