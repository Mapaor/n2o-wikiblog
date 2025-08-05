import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

// Custom type to indicate access denied without throwing
type PageResult = PageObjectResponse | { accessDenied: true };

async function getPage(pageId: string, setError?: (error: string) => void): Promise<PageResult> {
    if (!pageId) {
        throw new Error('Falta el pageId');
    }
    try {
        const res = await fetch('/api/notionGetPage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pageId: pageId }),
        });
        
        const json = await res.json();
        
        if (!res.ok) {
            // If it's a 403 (access denied), return a special object instead of throwing
            if (res.status === 403) {
                return { accessDenied: true };
            }
            
            // Log and throw for other errors
            console.error('API Response:', json);
            throw new Error(`Error obtenint pàgina (${res.status}): ${JSON.stringify(json)}`);
        }
        
        if (!json) {
            throw new Error('Resposta JSON no vàlida.');
        }
        
        // Check if the response contains an error
        if (json.error) {
            // If it's specifically an access denied error, return special object
            if (json.accessDenied) {
                return { accessDenied: true };
            }
            throw new Error(`API Error: ${json.error}${json.details ? ' - ' + json.details : ''}`);
        }
        
        return json as PageObjectResponse;
    } catch (err: unknown) {
        let errorMsg = 'Error desconegut';
        if (err instanceof Error) errorMsg = err.message;
        console.error('Error al fetchData:', errorMsg);
        if (setError) setError(errorMsg);
        throw err;
    }
}

export default getPage;