// api/chat.js - UPDATED FOR GROQ API (100% FREE)
export default async function handler(req, res) {
    console.log('=== ENGLISH TUTOR API (GROQ) CALLED ===');
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: 'Please use POST method'
        });
    }
    
    try {
        // Parse request
        let body;
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (error) {
            console.error('JSON parse error:', error);
            return res.status(400).json({
                error: 'Invalid JSON',
                message: 'Request body must be valid JSON'
            });
        }
        
        const { message } = body;
        
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                error: 'Invalid message',
                message: 'Please provide a non-empty message'
            });
        }
        
        console.log('User message:', message.substring(0, 100));
        
        // Get GROQ API key (not DeepSeek)
        const apiKey = process.env.GROQ_API_KEY;
        
        if (!apiKey) {
            console.error('GROQ_API_KEY not found in environment');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'GROQ API key is not configured',
                hint: 'Add GROQ_API_KEY to Vercel environment variables'
            });
        }
        
        console.log('GROQ API key found, making request...');
        
        // Call GROQ API (FREE TIER)
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', // FREE MODEL
                messages: [
                    {
                        role: 'system',
                        content: `You are a friendly, patient English tutor. Help users practice and improve their English.
                        
                        GUIDELINES:
                        1. Be encouraging and positive
                        2. Correct mistakes gently with explanations
                        3. Use simple, clear language
                        4. Give examples when explaining grammar
                        5. Keep responses under 150 words
                        6. Focus on practical conversation skills
                        7. Always respond in English
                        
                        EXAMPLE INTERACTIONS:
                        User: "I goed to market"
                        You: "Good try! The correct form is 'I went to the market.' 'Go' is an irregular verb: go → went → gone."
                        
                        Now help the user practice English:`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
                stream: false
            })
        });
        
        console.log('GROQ response status:', groqResponse.status);
        
        if (!groqResponse.ok) {
            let errorText;
            try {
                errorText = await groqResponse.text();
                console.error('GROQ API error:', errorText);
            } catch {
                errorText = 'Could not read error';
            }
            
            // Handle specific errors
            if (groqResponse.status === 401) {
                return res.status(401).json({
                    error: 'Invalid API key',
                    message: 'Groq API key is invalid or expired',
                    hint: 'Get a free key from console.groq.com'
                });
            }
            
            if (groqResponse.status === 429) {
                return res.status(429).json({
                    error: 'Rate limit',
                    message: 'Too many requests. Groq free tier has limits.',
                    hint: 'Wait a minute and try again'
                });
            }
            
            return res.status(groqResponse.status).json({
                error: 'AI service error',
                status: groqResponse.status,
                details: errorText.substring(0, 200)
            });
        }
        
        const data = await groqResponse.json();
        console.log('GROQ response received successfully');
        
        // Groq returns slightly different format than DeepSeek
        if (data.choices && data.choices[0] && data.choices[0].message) {
            // Return in same format as before for compatibility
            return res.status(200).json({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: data.choices[0].message.content
                    }
                }],
                model: data.model,
                usage: data.usage
            });
        } else {
            console.error('Unexpected Groq response format:', data);
            return res.status(500).json({
                error: 'Unexpected response format',
                message: 'The AI service returned an unexpected response'
            });
        }
        
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
