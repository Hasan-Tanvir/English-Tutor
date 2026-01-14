// api/chat.js - Vercel Serverless Function (ES Modules)
export default async function handler(req, res) {
    console.log('API endpoint called:', req.method, req.url);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        return res.status(200).end();
    }
    
    // Only allow POST requests
    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Please use POST method to send messages'
        });
    }
    
    try {
        // Parse request body
        let body;
        try {
            body = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => data += chunk);
                req.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON'));
                    }
                });
                req.on('error', reject);
            });
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return res.status(400).json({
                error: 'Invalid request format',
                message: 'Please send valid JSON in the request body'
            });
        }
        
        const { message } = body;
        
        if (!message || typeof message !== 'string' || message.trim() === '') {
            console.error('Invalid message received:', message);
            return res.status(400).json({
                error: 'Invalid message',
                message: 'Please provide a non-empty message'
            });
        }
        
        console.log('Processing message (first 100 chars):', message.substring(0, 100));
        
        // Get API key from environment variable
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!apiKey) {
            console.error('API key not found in environment variables');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'API key is not configured. Please contact the administrator.',
                hint: 'Check Vercel environment variables for DEEPSEEK_API_KEY'
            });
        }
        
        console.log('API key found, calling DeepSeek API...');
        
        // Prepare the request to DeepSeek API
        const requestBody = {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: `You are a friendly, patient English tutor. Your goal is to help users practice and improve their English skills.
                    Guidelines:
                    1. Be encouraging and positive
                    2. Correct mistakes gently
                    3. Explain grammar simply with examples
                    4. Keep responses under 150 words
                    5. Speak at intermediate English level
                    6. Focus on practical conversation
                    
                    Example interactions:
                    - User: "I goed to market yesterday"
                    - You: "Good try! The correct form is 'I went to the market yesterday.' 'Go' is an irregular verb: go → went → gone."
                    
                    Now help the user with their English practice:`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
            stream: false
        };
        
        console.log('Calling DeepSeek API with request body:', JSON.stringify(requestBody).substring(0, 200) + '...');
        
        const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            timeout: 10000 // 10 second timeout
        });
        
        console.log('DeepSeek API response status:', deepseekResponse.status);
        
        if (!deepseekResponse.ok) {
            let errorText;
            try {
                errorText = await deepseekResponse.text();
            } catch {
                errorText = 'Could not read error response';
            }
            
            console.error('DeepSeek API error:', deepseekResponse.status, errorText);
            
            return res.status(deepseekResponse.status).json({
                error: 'AI service error',
                message: `The AI service responded with an error (${deepseekResponse.status})`,
                details: errorText.substring(0, 500)
            });
        }
        
        const responseData = await deepseekResponse.json();
        console.log('DeepSeek API success, received response');
        
        if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
            console.error('Invalid response structure from DeepSeek:', responseData);
            return res.status(500).json({
                error: 'Invalid response from AI service',
                message: 'The AI service returned an unexpected response format'
            });
        }
        
        const aiMessage = responseData.choices[0].message.content;
        console.log('AI response (first 100 chars):', aiMessage.substring(0, 100));
        
        // Return the successful response
        return res.status(200).json({
            ...responseData,
            server_timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Unhandled error in API handler:', error);
        
        return res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
