import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

async function fetchData(blockId: string, setError?: (error: string) => void): Promise<BlockObjectResponse[]> {
    if (!blockId) {
        throw new Error('Falta el blockId');
    }
    try {
        const res = await fetch('/api/notionGetChildren', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pageId: blockId }),
        });
        
        const json = await res.json();
        
        if (!res.ok) {
            // Handle access denied specifically
            if (res.status === 403) {
                throw new Error('Page not accessible by integration. Make sure the page is shared with your integration.');
            }
            
            // Check if the response indicates access denied
            if (json.accessDenied) {
                throw new Error('Page not accessible by integration. Make sure the page is shared with your integration.');
            }
            
            throw new Error(`Error obtenint blocs: ${res.status} - ${json.error || 'Unknown error'}`);
        }
        
        if (!json || !json.results || !Array.isArray(json.results)) {
            throw new Error('Resposta JSON no vàlida o sense blocs.');
        }
        return json.results as BlockObjectResponse[];
    } catch (err: unknown) {
        let errorMsg = 'Error desconegut';
        if (err instanceof Error) errorMsg = err.message;
        console.error('Error al fetchData:', errorMsg);
        if (setError) setError(errorMsg);
        throw err;
    }
}

export default fetchData;