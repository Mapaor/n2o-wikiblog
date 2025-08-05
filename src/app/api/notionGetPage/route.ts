import { Client } from '@notionhq/client';
import { NextRequest } from 'next/server';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export async function POST(req: NextRequest) {
  console.log('Rebent petició POST');
  try {
    const body = await req.json();
    const { pageId } = body;

    if (!pageId) {
      return new Response(JSON.stringify({ error: 'Falta el pageId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const notionToken = process.env.NOTION_SECRET;
    if (!notionToken) {
      return new Response(JSON.stringify({ error: 'NOTION_SECRET environment variable not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Received pageId:', pageId);

    const notion = new Client({ auth: notionToken });
    const response: PageObjectResponse = await notion.pages.retrieve({ page_id: pageId }) as PageObjectResponse;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    let errorMsg = 'Error desconegut';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMsg = error.message;
      
      // Check if it's an access/permission error
      if (error.message.includes('Could not find page with ID') ||
          error.message.includes('page not found') || 
          error.message.includes('Unauthorized') || 
          error.message.includes('Forbidden') ||
          error.message.includes('object_not_found') ||
          error.message.includes('restricted_resource') ||
          error.message.includes('Make sure the relevant pages and databases are shared with your integration')) {
        statusCode = 403; // Forbidden - no access
        errorMsg = 'Page not accessible by integration';
        // Don't log access denied errors as they're expected for page mentions
      } else {
        // Only log unexpected errors
        console.error('Notion API Error:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', error);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: errorMsg, 
      details: error instanceof Error ? error.message : 'Unknown error',
      accessDenied: statusCode === 403
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}