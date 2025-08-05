import { Block, RichText, ImageBlock, Table, TableRow, Chunk, ColumnList, Column, Bookmark, Embed, PDF, Video, Audio, LinkPreview, SyncedBlock, Callout } from '../notion/types';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import fetchData from './fetchData';
import getPage from './getPage';
import { supportedMintedLanguages } from '../constants/codeLanguages';


function nestStyles(text: string, annotations: RichText['annotations']): string {
    let result = text;
    if (annotations.code) result = `\\texttt{${result}}`;
    if (annotations.strikethrough) result = `\\sout{${result}}`;
    if (annotations.underline) result = `\\underline{${result}}`;
    if (annotations.italic) result = `\\textit{${result}}`;
    if (annotations.bold) result = `\\textbf{${result}}`;
    return result;
}

function escapeLatex(str: string): string {
    // Escape _ and other common LaTeX special chars
    return str.replace(/([_&#%$~^{}\\])/g, r => `\\${r}`);
}

// Page info cache to store fetched page information
const pageInfoCache = new Map<string, { title: string; icon: string }>();

// Helper function to get page title and icon  
async function getPageInfo(pageId: string): Promise<{ title: string; icon: string }> {
    // Check cache first
    if (pageInfoCache.has(pageId)) {
        return pageInfoCache.get(pageId)!;
    }

    try {
        const pageResult = await getPage(pageId);
        
        // Check if access was denied
        if ('accessDenied' in pageResult && pageResult.accessDenied) {
            const fallback = { title: '\\notRendered{Page not accessible by the integration}', icon: '\\faFileTextO' };
            pageInfoCache.set(pageId, fallback);
            return fallback;
        }
        
        const page = pageResult as PageObjectResponse;
        
        // Extract title from page properties
        let title = 'Untitled';
        const titleProperty = page.properties?.title;
        if (titleProperty && 'title' in titleProperty && Array.isArray(titleProperty.title)) {
            const titleText = titleProperty.title
                .map((chunk: { plain_text?: string }) => chunk.plain_text || '')
                .join('');
            if (titleText.trim()) {
                title = titleText.trim();
            }
        }
        
        // Extract icon
        let icon = '\\faFileTextO'; // Default icon
        if (page.icon) {
            if (page.icon.type === 'emoji' && 'emoji' in page.icon && page.icon.emoji) {
                icon = page.icon.emoji;
            } else if (page.icon.type === 'external' || page.icon.type === 'file') {
                icon = '\\faFileTextO'; // Keep default for external/file icons
            }
        }
        
        const result = { title: escapeLatex(title), icon };
        pageInfoCache.set(pageId, result);
        return result;
    } catch (error) {
        // For any other errors, use fallback
        console.error('Error fetching page info:', error);
        const fallback = { title: 'Untitled', icon: '\\faFileTextO' };
        pageInfoCache.set(pageId, fallback);
        return fallback;
    }
}

function processChunks(rich_text: Chunk[]): string {
    if (!Array.isArray(rich_text)) return '';
    return rich_text.map(chunk => {
        if (chunk.type === 'text') {
            let text = chunk.text?.content || '';
            if (chunk.text?.link && chunk.text.link.url) {
                // If the chunk is a link, wrap with \href
                let url = chunk.text.link.url;
                if (url.startsWith('/')) url = 'https://notion.so' + url
                // Use https if the url starts with http only
                const safeUrl = url.startsWith('http://') ? url.replace('http://', 'https://') : url;
                let styledText = text;
                if (chunk.annotations) {
                    styledText = nestStyles(text, chunk.annotations);
                }
                return `\\href{${safeUrl}}{${styledText}}`;
            } else {
                if (chunk.annotations) {
                    text = nestStyles(text, chunk.annotations);
                }
                return text;
            }
        } else if (chunk.type === 'equation') {
            return `$${chunk.equation?.expression || ''}$`;
        } else if (chunk.type === 'mention') {
            if (chunk.mention?.type === 'page'){
                const pageId = chunk.mention.page.id; // Keep original format with dashes
                const pageIdNoDashes = pageId.replace(/-/g, ''); // For URL only
                
                // Check if we have cached page info
                if (pageInfoCache.has(pageId)) {
                    const { title, icon } = pageInfoCache.get(pageId)!;
                    return `~\\href{https://notion.so/${pageIdNoDashes}}{${icon} \\, ${title}}`;
                }
                
                // Fallback to old behavior if not cached
                let name = chunk.plain_text || 'Untitled';
                name = escapeLatex(name);
                return `~\\href{https://notion.so/${pageIdNoDashes}}{\\faFileTextO \\, ${name}}`;
            } else if (chunk.mention?.type === 'link_mention'){
                const title = chunk.mention.link_mention.title;
                const href = chunk.mention.link_mention.href;
                return `\\href{${href}}{${title}}`;
            } else if(chunk.mention?.type === 'date'){
                let datePlainText: string = ''
                if (chunk.mention.date.end){
                    datePlainText = `\\notRendered{${chunk.mention.date.start} $\\rightarrow$ ${chunk.mention.date.end}}`;
                } else {
                    datePlainText = `\\notRendered{${chunk.mention.date.start}}`
                }
                return datePlainText;
            } else {
                return '';
            }
        }
        return 'ERROR DE LÒGICA';
    }).join('');
}

const processables = [
    'paragraph',
    'bulleted_list_item',
    'numbered_list_item',
    'to_do',
    'heading_1',
    'heading_2',
    'heading_3',
    'equation',
    'image',
    'table',
    'toggle',
    'quote',
    'file',
    'child_page',
    'code',
    'column_list',
    'column',
    'bookmark',
    'embed',
    'pdf',
    'video',
    'audio',
    'child_database',
    'link_preview',
    'breadcrumb',
    'synced_block',
    'callout'
];

function processParagraph(block: Block): string {
    const content = processChunks((block[block.type] as { rich_text?: RichText[] })?.rich_text || []);
    return `${content} \\par`;
}

function processHeading(block: Block): string {
    const blockData = block[block.type] as { rich_text?: RichText[]; is_toggleable?: boolean };
    const content = processChunks(blockData?.rich_text || []);
    const prefix = blockData?.is_toggleable ? '\\faAngleDown \\, ' : ''; // Opcions: \faCaretDown o \faAngleDown
    switch (block.type) {
        case 'heading_1': return `\\section*{${prefix}${content}}`;
        case 'heading_2': return `\\subsection*{${prefix}${content}}`;
        case 'heading_3': return `\\subsubsection*{${prefix}${content}}`;
        default: return '';
    }
}

function processEquation(block: Block): string {
    let expr = '';
    if (typeof block.equation === 'object' && block.equation && 'expression' in block.equation) {
        expr = (block.equation as { expression?: string }).expression || '';
    }
    return `\\begin{equation*}\n${expr}\n\\end{equation*}`;
}

async function processToggle(
    block: Block,
    pageId: string,
    level: number,
    setError?: (error: string) => void
): Promise<string> {
    const content = processChunks((block[block.type] as { rich_text?: RichText[] })?.rich_text || []);
    let childrenTeX = '';
    if (block.has_children) {
        try {
            const children = await fetchData(block.id, setError);
            if (children && children.length > 0) {
                const childResult = await processBlocks(
                    children as Block[],
                    pageId,
                    level + 1,
                    block.id,
                    setError
                );
                childrenTeX = childResult.texBlocks.map(b => '\n' + b.tex).join('');
            }
        } catch {
            // Ignore children errors for now
        }
    }
    return `\\faAngleDown \\, ${content} \\par${childrenTeX}`; // OPCIONS: \faCaretDown o \faAngleDown
}

async function processListItem(
    block: Block,
    pageId: string,
    level: number,
    setError?: (error: string) => void
): Promise<{ tex: string; numBlocsProcessats: number; msgErrorOutput: string | null }> {
    let content = '';
    if (block.type === 'to_do' && block.to_do) {
        content = processChunks((block.to_do as { rich_text: RichText[] }).rich_text || []);
    } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item) {
        content = processChunks((block.bulleted_list_item as { rich_text: RichText[] }).rich_text || []);
    } else if (block.type === 'numbered_list_item' && block.numbered_list_item) {
        content = processChunks((block.numbered_list_item as { rich_text: RichText[] }).rich_text || []);
    } else {
        content = processChunks((block[block.type] as { rich_text?: RichText[] })?.rich_text || []);
    }
    const { childrenTeX, numBlocsProcessats, msgErrorOutput } = await processListItemChildren(
        block,
        pageId,
        level,
        setError
    );

    let listEnv: string = '';
    let tex: string = ``;
    let todoOptParam = '';
    switch (block.type) {
        case 'bulleted_list_item':
            listEnv = 'itemize';
            tex = `\\begin{${listEnv}}\n\\item ${content}${childrenTeX}\n\\end{${listEnv}}`;
            break;
        case 'numbered_list_item':
            listEnv = 'enumerate';
            tex = `\\begin{${listEnv}}\n\\item ${content}${childrenTeX}\n\\end{${listEnv}}`;
            break;
        case 'to_do':
            listEnv = 'todolist';
            if (block.to_do && (block.to_do as { checked?: boolean }).checked === true) todoOptParam = '[\\done]';
            tex = `\\begin{${listEnv}}\n\\item${todoOptParam} ${content}${childrenTeX}\n\\end{${listEnv}}`;
            break;
        default:
            tex = '';
    }
    return { tex, numBlocsProcessats: numBlocsProcessats + 1, msgErrorOutput };
}

async function processListItemChildren(
    block: Block,
    pageId: string,
    level: number,
    setError?: (error: string) => void
): Promise<{ childrenTeX: string; numBlocsProcessats: number; msgErrorOutput: string | null }> {
    let childrenTeX = '';
    let numBlocsProcessats = 0;
    let msgErrorOutput: string | null = null;

    if (block.has_children) {
        try {
            const children = await fetchData(block.id, setError);
            if (children && children.length > 0) {
                const childResult = await processBlocks(
                    children as Block[],
                    pageId,
                    level + 1,
                    block.id,
                    setError
                );
                childrenTeX = childResult.texBlocks.map((b: { tex: string }) => '\n' + b.tex).join('');
                numBlocsProcessats = childResult.numBlocsProcessats;
                msgErrorOutput = childResult.msgErrorOutput;
            }
        } catch {
            msgErrorOutput = "Error inesperat obtenint o processant els children recursivament.";
        }
    }

    return { childrenTeX, numBlocsProcessats, msgErrorOutput };
}

function processImage(block: Block): string {
    const imageBlock = block as ImageBlock;
    let imageUrl = '';
    let caption = '';

    if (imageBlock.image.type === 'file' && imageBlock.image.file) {
        const url = imageBlock.image.file.url;
        const cleanUrl = url.split(/[?#]/)[0];
        imageUrl = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
    } else if (imageBlock.image.type === 'external' && imageBlock.image.external) {
        imageUrl = imageBlock.image.external.url;
    }

    caption = processChunks(imageBlock.image.caption || []);
    return `\\begin{figure}[H]\n    \\centering\n    \\includegraphics[scale = 0.4]{${imageUrl}}\n    \\caption{${caption}}\n\\end{figure}`;
}

async function processTable(
    block: Table,
    pageId: string,
    setError?: (error: string) => void
): Promise<string> {
    // Fetch table rows (children)
    console.log("Processing table block:", block.id);
    let rows: TableRow[] = [];

    try {
        const children = await fetchData(block.id, setError);
        if (children && Array.isArray(children)) {
            rows = (children as Block[]).filter((b) => b.type === 'table_row') as TableRow[];
        }
    } catch {
        return '% Error fetching table rows';
    }

    if (!rows.length) return '';

    const numCols = block.table.table_width;
    const colSpec = Array(numCols).fill('c').join('|');

    // Build LaTeX rows
    const latexRows: string[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.table_row.cells;
        // Each cell is an array of RichText (Cell[])
        const cellContents = cells.map(cellArr => processChunks(cellArr));
        latexRows.push(cellContents.join(' & ') + ' \\\\ \\hline');
    }

    // Compose the table
    const latexTable = [
        '\n\\begin{table}[H]',
        '\\centering',
        `\\begin{tabular}{|${colSpec}|}`,
        '\\hline',
        ...latexRows,
        '\\end{tabular}',
        '\\caption{}',
        '\\end{table}'
    ].join('\n');

    return latexTable;
}

function processSubpage(block: Block): string {
    // block.child_page.title, block.id
    const subpageBlock = block as Block & { child_page: { title?: string } };
    let name = subpageBlock.child_page?.title || 'Subpàgina';
    name = escapeLatex(name);
    const childPageId = (block.id || '').replace(/-/g, '');
    return `\\href{https://notion.so/${childPageId}}{\\faFileTextO \\quad ${name}} \\par`;
}

function processFile(block: Block, pageId: string): string {
    // block.file.name, block.id, pageId
    const fileBlock = block as Block & { file: { name?: string } };
    let name = fileBlock.file?.name || 'file';
    const isPdf = name.trim().toLowerCase().endsWith('.pdf');
    name = escapeLatex(name);
    const blockId = (block.id || '').replace(/-/g, '');
    // pageId is already without dashes
    const icon = isPdf ? '\\faFilePdfO' : '\\faFile';
    const url = `https://notion.so/${pageId}#${blockId}`
    const displayUrl = `${icon} \\quad ${name}`
    return `\\href{${url}}{${displayUrl}} \\par`;
}

function processQuote(block: Block): string {
    const content = processChunks((block[block.type] as { rich_text?: RichText[] })?.rich_text || []);
    return `\\begin{fancyquote}\n${content}\n\\end{fancyquote}`;
}

function processCode(block: Block): string {
    // block.code.language, block.code.rich_text, block.code.caption
    const codeBlock = block as Block & { code: { language?: string; rich_text?: RichText[]; caption?: RichText[] } };
    let language = codeBlock.code?.language || '';
    if (!supportedMintedLanguages.includes(language)) {
        language = 'text';
    }
    // Join all rich_text plain_texts for code content
    const content = (codeBlock.code?.rich_text || [])
        .map(rt => rt.plain_text || '')
        .join('');
    // Use processChunks for caption to support links and styles
    const caption = processChunks(codeBlock.code?.caption || []);
    return `\\begin{code}{${language}}\n${content}\n\\end{code}\n` + (caption ? `\\codeCaption{${caption}}` : '');
}

function processBookmark(block: Bookmark): string {
    const url = block.bookmark?.url || '';
    let displayUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    displayUrl = escapeLatex(displayUrl);
    return `\\href{${url}}{${displayUrl}}\\par`;
}

function processEmbed(block: Embed): string {
    // Handles Notion embed blocks, e.g. { embed: { url: string, caption: [] } }
    const url = block.embed?.url || '';
    if (!url) return '';
    // Remove protocol for display
    let displayUrl = url.replace(/^https?:\/\//, '');
    displayUrl = escapeLatex(displayUrl);
    if (displayUrl.endsWith('/')) displayUrl = displayUrl.slice(0, -1);
    return `[\\notRendered{Embed block}] $\\rightarrow$ \\href{${url}}{${displayUrl}}\\par`;
}

function processPDF(block: PDF, pageId: string): string {
    // If PDF is external --> url = external.url 
    // If PDF is Notion internal --> url = https://notion.so/${pageId}#${blockId}

    let url = '';
    if (block.pdf.type === 'external') {
        url = block.pdf.external.url;
    } else if (block.pdf.type === 'file') {
        // Notion internal: link to the Notion page and block
        const blockId = (block.id || '').replace(/-/g, '');
        url = `https://notion.so/${pageId}#${blockId}`;
    } else return '';
    let displayUrl = url.replace(/^https?:\/\//, '');
    displayUrl = escapeLatex(displayUrl);
    if (displayUrl.endsWith('/')) displayUrl = displayUrl.slice(0, -1);
    const message = `[\\notRendered{Embed PDF}] $\\rightarrow$ \\href{${url}}{${displayUrl}}\\par`;
    return message;
}

function processVideo(block: Video, pageId: string): string {
    let url = '';
    if (block.video.type === 'external') {
        url = block.video.external.url;
    } else if (block.video.type === 'file') {
        // Notion internal: link to the Notion page and block
        const blockId = (block.id || '').replace(/-/g, '');
        url = `https://notion.so/${pageId}#${blockId}`;
    } else return '';
    let displayUrl = url.replace(/^https?:\/\//, '');
    displayUrl = escapeLatex(displayUrl);
    if (displayUrl.endsWith('/')) displayUrl = displayUrl.slice(0, -1);
    const message = `[\\notRendered{Embed Video}] $\\rightarrow$ \\href{${url}}{${displayUrl}}\\par`;
    return message;
}

function processAudio(block: Audio, pageId: string): string {
    let url = '';
    if (block.audio.type === 'external') {
        url = block.audio.external.url;
    } else if (block.audio.type === 'file') {
        // Notion internal: link to the Notion page and block
        const blockId = (block.id || '').replace(/-/g, '');
        url = `https://notion.so/${pageId}#${blockId}`;
    } else return '';
    let displayUrl = url.replace(/^https?:\/\//, '');
    displayUrl = escapeLatex(displayUrl);
    if (displayUrl.endsWith('/')) displayUrl = displayUrl.slice(0, -1);
    const message = `[\\notRendered{Embed Audio}] $\\rightarrow$ \\href{${url}}{${displayUrl}}\\par`;
    return message;
}

function processChildDatabase(block: Block, pageId: string): string {
    const blockId = (block.id || '').replace(/-/g, '');
    const url = `https://notion.so/${pageId}#${blockId}`;
    let displayUrl = url.replace(/^https?:\/\//, '');
    displayUrl = escapeLatex(displayUrl);
    if (displayUrl.endsWith('/')) displayUrl = displayUrl.slice(0, -1);
    const message = `[\\notRendered{Inline Database}] $\\rightarrow$ \\href{${url}}{${displayUrl}}\\par`;
    return message;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function processLinkPreview(block: LinkPreview, pageId: string): string {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const blockId = (block.id || '').replace(/-/g, '');
    const url = block.link_preview.url;
    let displayUrl = url.replace(/^https?:\/\//, '');
    displayUrl = escapeLatex(displayUrl);
    if (displayUrl.endsWith('/')) displayUrl = displayUrl.slice(0, -1);
    return `[\\notRendered{Link Preview}] $\\rightarrow$ \\href{${url}}{${displayUrl}}\\par`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function processBreadcrumb(block: Block): string {
    return '[\\notRendered{Breadcrumbs}] \\par'
}

async function processColumnList(
    block: ColumnList,
    pageId: string,
    level: number,
    setError?: (error: string) => void
): Promise<{ tex: string; numBlocsProcessats: number; msgErrorOutput: string | null }> {
    console.log("Processing column_list block:", block.id);
    let columns: Column[] = [];
    let numBlocsProcessats = 0;
    let msgErrorOutput: string | null = null;
    let allColumnContent = '';

    try {
        // Fetch columns (children of column_list)
        const children = await fetchData(block.id, setError);
        if (children && Array.isArray(children)) {
            columns = (children as Block[]).filter((b) => b.type === 'column') as Column[];
        }
    } catch {
        return { tex: '% Error fetching columns', numBlocsProcessats: 0, msgErrorOutput: 'Error fetching columns' };
    }

    if (!columns.length) {
        return { tex: '', numBlocsProcessats: 0, msgErrorOutput: null };
    }

    // Process each column sequentially, ignoring column structure
    for (const column of columns) {
        try {
            // Fetch the blocks inside this column
            const columnBlocks = await fetchData(column.id, setError);
            if (columnBlocks && columnBlocks.length > 0) {
                // Process the blocks inside the column recursively
                const columnResult = await processBlocks(
                    columnBlocks as Block[],
                    pageId,
                    level + 1,
                    column.id,
                    setError
                );
                // Append all the TeX content from this column
                allColumnContent += columnResult.texBlocks.map(b => b.tex).join('\n');
                if (allColumnContent && !allColumnContent.endsWith('\n')) {
                    allColumnContent += '\n';
                }
                numBlocsProcessats += columnResult.numBlocsProcessats;
                if (columnResult.msgErrorOutput) {
                    msgErrorOutput = (msgErrorOutput ? msgErrorOutput + '\n' : '') + columnResult.msgErrorOutput;
                }
            }
        } catch {
            msgErrorOutput = (msgErrorOutput ? msgErrorOutput + '\n' : '') + "Error processing column blocks.";
        }
    }

    return { tex: allColumnContent.trim(), numBlocsProcessats, msgErrorOutput };
}

async function processSyncedBlock(
    block: SyncedBlock,
    pageId: string,
    level: number,
    setError?: (error: string) => void
): Promise<{ tex: string; numBlocsProcessats: number; msgErrorOutput: string | null }> {
    let numBlocsProcessats = 0;
    let msgErrorOutput: string | null = null;
    let childrenTeX = '';

    try {
        // For synced blocks, we always fetch the children from the current block
        // regardless of whether it's original or synced from another block
        const children = await fetchData(block.id, setError);
        if (children && children.length > 0) {
            const childResult = await processBlocks(
                children as Block[],
                pageId,
                level + 1,
                block.id,
                setError
            );
            childrenTeX = childResult.texBlocks.map(b => b.tex).join('\n');
            numBlocsProcessats = childResult.numBlocsProcessats;
            msgErrorOutput = childResult.msgErrorOutput;
        }
    } catch {
        console.error("Error processant els children d'un synced block");
        msgErrorOutput = "Error processing synced block children";
    }

    return { tex: childrenTeX, numBlocsProcessats, msgErrorOutput };
}

// Function to collect all page mentions from blocks and prefetch their info
async function prefetchPageMentions(blocks: Block[]): Promise<void> {
    const pageIds = new Set<string>();
    
    function collectPageMentions(richText: Chunk[]) {
        if (!Array.isArray(richText)) return;
        richText.forEach(chunk => {
            if (chunk.type === 'mention' && chunk.mention?.type === 'page') {
                const pageId = chunk.mention.page.id; // Keep original format with dashes
                pageIds.add(pageId);
            }
        });
    }
    
    function processBlockForMentions(block: Block) {
        // Check different block types for rich_text content
        const blockData = block[block.type] as { rich_text?: Chunk[]; caption?: Chunk[] };
        if (blockData?.rich_text) {
            collectPageMentions(blockData.rich_text);
        }
        
        // Handle specific block types with captions
        switch (block.type) {
            case 'image':
                if (blockData?.caption) collectPageMentions(blockData.caption);
                break;
            case 'code':
                if (blockData?.caption) collectPageMentions(blockData.caption);
                break;
            // Add other block types as needed
        }
    }
    
    // Process all blocks
    blocks.forEach(processBlockForMentions);
    
    // Prefetch page info for all collected page IDs
    const prefetchPromises = Array.from(pageIds).map(pageId => 
        getPageInfo(pageId).catch(error => {
            console.error(`Failed to prefetch page info for ${pageId}:`, error);
        })
    );
    
    await Promise.all(prefetchPromises);
}

// Normal callouts (no children, only rich text)
function processNormalCallout(block: Callout): string {
    const content = processChunks(block.callout.rich_text || []);
    const hasIcon = block.callout.icon !== null;
    const iconIsEmoji = hasIcon && block.callout.icon!.type === 'emoji';
    const color = block.callout.color || 'gray_background';
    
    return getCalloutTex(hasIcon, iconIsEmoji, false, content, '', color, block.callout.icon);
}

// Now we'll handle callouts with children
async function processCallout(
    block: Callout,
    pageId: string,
    level: number,
    setError?: (error: string) => void
): Promise<string> {
    const hasIcon = block.callout.icon !== null;
    const iconIsEmoji = hasIcon && block.callout.icon!.type === 'emoji';
    const color = block.callout.color || 'gray_background';
    let childrenTeX = '';
    let calloutWithTitle = false;
    let title = '';
    
    try {
        const children = await fetchData(block.id, setError);
        if (children && children.length > 0) {
            const childResult = await processBlocks(
                children as Block[],
                pageId,
                level + 1,
                block.id,
                setError
            );
            
            const allChildrenTex = childResult.texBlocks.map(b => b.tex);
            
            // Check if first child is a heading
            if (allChildrenTex.length > 0) {
                const firstChildTex = allChildrenTex[0].trim();
                const headingMatch = firstChildTex.match(/^\\(sub)*section\*?\{([^}]*)\}/);
                
                if (headingMatch) {
                    calloutWithTitle = true;
                    title = headingMatch[2]; // Extract title content
                    // Use all children except the first one (the heading)
                    childrenTeX = allChildrenTex.slice(1).join('\n');
                } else {
                    // No heading, use all children
                    childrenTeX = allChildrenTex.join('\n');
                }
            }
        }
    } catch {
        // Ignore children errors for now
    }
    
    return getCalloutTex(hasIcon, iconIsEmoji, calloutWithTitle, childrenTeX, title, color, block.callout.icon);
}

// Helper for both normal callouts and callouts with children (for tcolorbox is the same, but we handle it different to avoid doing api calls for normal callouts)
function getCalloutTex(
    hasIcon: boolean, 
    iconIsEmoji: boolean, 
    hasTitle: boolean, 
    content: string, 
    title: string = '', 
    color: string = 'gray_background',
    icon: Callout['callout']['icon'] = null
): string {
    // Get the icon string
    let iconStr = '';
    if (hasIcon && icon) {
        if (iconIsEmoji && icon.type === 'emoji') {
            // Convert emoji to LaTeX emoji command - need to handle Unicode
            const emojiCode = icon.emoji.codePointAt(0)?.toString(16) || '1f4a1';
            iconStr = `\\emoji{${emojiCode}}`;
        } else {
            // Use default icon for external icons
            iconStr = '\\notRendered{\\faFileO}';
        }
    }
    
    // Clean color name (remove _background suffix if present)
    const cleanColor = color.replace('_background', '');
    
    if (hasTitle) {
        return `\\begin{callout}[${iconStr}][${title}][${cleanColor}]\n${content}\n\\end{callout}`;
    } else {
        return `\\begin{callout}[${iconStr}][][${cleanColor}]\n${content}\n\\end{callout}`;
    }
}

// Main function

export async function processBlocks(
    blocks: Block[],
    pageId: string,
    level = 1,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parentBlockId: string | null = null,
    setError?: (error: string) => void,
    onProgress?: (current: number, total: number) => void
): Promise<{ numBlocsProcessats: number; msgErrorOutput: string | null; texBlocks: { id: string; tex: string }[] }> {
    if (level > 3) {
        console.log("Nivell màxim d'anidament (3) assolit. No es processaran més nivells.");
        return { numBlocsProcessats: 0, msgErrorOutput: null, texBlocks: [] };
    }

    // Prefetch page mentions at the top level to populate cache
    if (level === 1) {
        console.log("Prefetching page mention information...");
        try {
            await prefetchPageMentions(blocks);
            console.log("Page mention prefetching completed.");
        } catch (error) {
            console.error("Error prefetching page mentions:", error);
        }
    }

    let numBlocsProcessats = 0;
    let msgErrorOutput: string | null = null;
    const texBlocks: { id: string; tex: string }[] = [];

    const totalBlocks = blocks.length;
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (!block || !block.id || !block.type || block.archived || block.in_trash || !processables.includes(block.type)) {
            continue;
        }

        try {
            console.log("Block type:", block.type, "ID:", block.id);
            if (onProgress) onProgress(i + 1, totalBlocks);
            await new Promise((resolve) => setTimeout(resolve, 334));

            let tex = '';
            let isListItem = false;
            let listItemResult: { tex: string; numBlocsProcessats: number; msgErrorOutput: string | null } | null = null;
            let columnListResult: { tex: string; numBlocsProcessats: number; msgErrorOutput: string | null } | null = null;
            let syncedBlockResult: { tex: string; numBlocsProcessats: number; msgErrorOutput: string | null } | null = null;

            switch (block.type) {
                case 'paragraph':
                    tex = processParagraph(block);
                    break;
                case 'heading_1':
                case 'heading_2':
                case 'heading_3':
                    tex = processHeading(block);
                    break;
                case 'bulleted_list_item':
                case 'numbered_list_item':
                case 'to_do':
                    isListItem = true;
                    listItemResult = await processListItem(block, pageId, level, setError);
                    tex = listItemResult.tex;
                    break;
                case 'equation':
                    tex = processEquation(block);
                    break;
                case 'image':
                    tex = processImage(block);
                    break;
                case 'table':
                    tex = await processTable(block as Table, pageId, setError);
                    break;
                case 'toggle':
                    tex = await processToggle(block, pageId, level, setError);
                    break;
                case 'quote':
                    tex = processQuote(block);
                    break;
                case 'file':
                    tex = processFile(block, pageId);
                    break;
                case 'child_page':
                    tex = processSubpage(block);
                    break;
                case 'code':
                    tex = processCode(block);
                    break;
                case 'column_list':
                    columnListResult = await processColumnList(block as ColumnList, pageId, level, setError);
                    tex = columnListResult.tex;
                    break;
                case 'bookmark':
                    tex =  processBookmark(block as Bookmark);
                    break;
                case 'embed':
                    tex = processEmbed(block as Embed);
                    break;
                case 'pdf':
                    tex = processPDF(block as PDF, pageId);
                    break;
                case 'video':
                    tex = processVideo(block as Video, pageId);
                    break;
                case 'audio':
                    tex = processAudio(block as Audio, pageId);
                    break;
                case 'child_database':
                    tex = processChildDatabase(block, pageId);
                    break;
                case 'link_preview':
                    tex = processLinkPreview(block as LinkPreview, pageId)
                    break;
                case 'breadcrumb':
                    tex = processBreadcrumb(block);
                    break;
                case 'synced_block':
                    syncedBlockResult = await processSyncedBlock(block as SyncedBlock, pageId, level, setError)
                    tex = syncedBlockResult.tex;
                    break;
                case 'callout':
                    if (block.has_children === true) {
                        tex = await processCallout(block as Callout, pageId, level, setError);
                    } else {
                        tex = processNormalCallout(block as Callout);
                    }
                    break;
            }

            if (tex) {
                if (isListItem && listItemResult) {
                    // For list items, push immediately and update counters
                    texBlocks.push({ id: block.id, tex });
                    numBlocsProcessats += listItemResult.numBlocsProcessats;
                    if (listItemResult.msgErrorOutput) {
                        msgErrorOutput = (msgErrorOutput ? msgErrorOutput + '\n' : '') + listItemResult.msgErrorOutput;
                    }
                } else if (block.type === 'column_list' && columnListResult) {
                    // For column lists, handle specially since they process multiple blocks
                    texBlocks.push({ id: block.id, tex });
                    numBlocsProcessats += columnListResult.numBlocsProcessats;
                    if (columnListResult.msgErrorOutput) {
                        msgErrorOutput = (msgErrorOutput ? msgErrorOutput + '\n' : '') + columnListResult.msgErrorOutput;
                    }
                } else if (block.type === 'synced_block' && syncedBlockResult) {
                    // For synced blocks, handle specially since they process multiple blocks
                    texBlocks.push({ id: block.id, tex });
                    numBlocsProcessats += syncedBlockResult.numBlocsProcessats;
                    if (syncedBlockResult.msgErrorOutput) {
                        msgErrorOutput = (msgErrorOutput ? msgErrorOutput + '\n' : '') + syncedBlockResult.msgErrorOutput;
                    }
                } else if (block.type === 'callout') {
                    // For callouts, handle specially - they may process children internally
                    texBlocks.push({ id: block.id, tex });
                    numBlocsProcessats++;
                } else {
                    // For non-list items, push and increment counter
                    texBlocks.push({ id: block.id, tex });
                    numBlocsProcessats++;
                }
            }

            // For idented paragraphs or toggle headings we also process the children but with no hierarchy
            // Skip children processing for column_list and synced_block since they're already handled in their respective processors
            if (block.has_children && !isListItem && block.type !== 'toggle' && block.type !== 'table' && block.type !== 'column_list' && block.type !== 'synced_block' && block.type !== 'child_page' && block.type !== 'callout') {
                try {
                    const children = await fetchData(block.id, setError);
                    if (children && children.length > 0) {
                        const childResult = await processBlocks(
                            children as Block[],
                            pageId,
                            level + 1,
                            block.id,
                            setError
                        );
                        numBlocsProcessats += childResult.numBlocsProcessats;
                        texBlocks.push(...childResult.texBlocks);
                        if (childResult.msgErrorOutput) {
                            msgErrorOutput = (msgErrorOutput ? msgErrorOutput + '\n' : '') + childResult.msgErrorOutput;
                        }
                    }
                } catch {
                    msgErrorOutput = (msgErrorOutput ? msgErrorOutput + '\n' : '') + "Error inesperat obtenint o processant els children recursivament.";
                }
            }
        } catch {
            msgErrorOutput = (msgErrorOutput ? msgErrorOutput + '\n' : '') + "Error inesperat processant un bloc.";
        }
    }

    console.log(`Tots els blocs de nivell ${level} iterats. Num de blocs processats: ${numBlocsProcessats}`);
    console.log(`Output final del nivell ${level}:`, { numBlocsProcessats, msgErrorOutput, texBlocks });
    console.log(`Codi TeX generat:`, texBlocks.map(b => b.tex).join('\n'));

    return { numBlocsProcessats, msgErrorOutput, texBlocks };
}