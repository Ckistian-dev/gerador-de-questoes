// Esta função roda no backend da Vercel, não no navegador.
// Ela é responsável por chamar a API do Gemini de forma segura.

export default async function handler(request, response) {
    // Permite apenas requisições do tipo POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Pega a chave da API das variáveis de ambiente da Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return response.status(500).json({ error: 'API key not configured' });
    }

    const { assunto, materia, estilo, dificuldade } = request.body;
    if (!assunto || !materia || !estilo || !dificuldade) {
        return response.status(400).json({ error: 'Missing required fields' });
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const prompt = `Gere UMA única questão de múltipla escolha sobre o assunto "${assunto}", dentro da matéria de "${materia}", no estilo de prova "${estilo}" e com nível de dificuldade "${dificuldade}". A resposta DEVE ser um objeto JSON válido, e NADA MAIS além do JSON. A estrutura do JSON deve ser exatamente a seguinte: { "question": "o enunciado completo da pergunta", "options": ["alternativa 1", "alternativa 2", "alternativa 3", "alternativa 4"], "answer": 0, "explanation": "uma explicação detalhada e clara da resposta correta." }. O campo "answer" deve ser o índice (de 0 a 3) da alternativa correta no array "options".`;

    try {
        const geminiResponse = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error('Gemini API Error:', errorBody);
            throw new Error(`Gemini API responded with status ${geminiResponse.status}`);
        }

        const data = await geminiResponse.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawJsonText) {
            throw new Error("A API do Gemini retornou uma resposta vazia ou em formato inesperado.");
        }

        const cleanedJsonText = rawJsonText.replace(/```json|```/g, '').trim();
        const quizData = JSON.parse(cleanedJsonText);
        
        // Retorna a questão formatada para o frontend
        return response.status(200).json(quizData);

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return response.status(500).json({ error: 'Failed to generate question. ' + error.message });
    }
}
