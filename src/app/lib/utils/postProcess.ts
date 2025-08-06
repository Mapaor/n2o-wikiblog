import { textcompUnicodeToMacro } from "../constants/textcomp";
import emojiRegex from 'emoji-regex';


export function postprocessTex(inputTex: string, imageMapping?: Map<string, string>): [string, boolean] {
    const mergedTex: string = mergeConsecutiveLists(inputTex);
    const renamedImagesTex: string = imageMapping ? renameImages(mergedTex, imageMapping) : mergedTex;
    const emojiConvertedTex: string = convertEmojis(renamedImagesTex);
    const unicodeConvertedTex: [string, boolean] = convertUnicode(emojiConvertedTex);
    const compareSignsProcessedTex: string = compareSigns(unicodeConvertedTex[0]);
    return [compareSignsProcessedTex, unicodeConvertedTex[1]];
}

function convertUnicode(text: string): [string, boolean] {
  let hasWeirdChars = false;
  // Regex for common accented Latin characters (including Latin-1 Supplement and Latin Extended-A)
  // and common punctuation like right single quotation mark (U+2019)
  const commonAccentsAndPunctRegex = /[\u00C0-\u017F\u2019\u2018\u00B7]/;
  const result = text.replace(/[^\x00-\x7F]/g, (char) => {
    const hexCode = char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0");
    if (commonAccentsAndPunctRegex.test(char)) {
      // Ignore common accented Latin characters (í, ü, etc.) and right single quotation mark (’)
      return char;
    } else if (hexCode && textcompUnicodeToMacro[hexCode]) {
      return textcompUnicodeToMacro[hexCode] + ' ';
    } else {
      hasWeirdChars = true;
      return '\\notRendered{U+' + hexCode + '}';
    }
  });
  return [result, hasWeirdChars];
}

function mergeConsecutiveLists(text: string): string {
  // 1) recursively pull up any same‑type nested \begin…\end blocks
  function flattenEnv(envName: string, input: string): string {
    const pattern = String.raw`\\begin\{${envName}\}([\s\S]*?)\\end\{${envName}\}`;
    const envRegex = new RegExp(pattern, 'g');
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = envRegex.exec(input)) !== null) {
      result += input.slice(lastIndex, match.index);

      // flatten deeper first
      let content = flattenEnv(envName, match[1]);
      // strip any same‑type wrappers inside
      content = content.replace(new RegExp(pattern, 'g'), (_, inner) =>
        flattenEnv(envName, inner)
      );

      result += `\\begin{${envName}}\n${content}\n\\end{${envName}}`;
      lastIndex = envRegex.lastIndex;
    }

    result += input.slice(lastIndex);
    return result;
  }

  // 2) merge any “…\end{env}   \begin{env}…” into one block
  function mergeEnv(envName: string, input: string): string {
    const mergePattern = new RegExp(
      String.raw`\\end\{${envName}\}[ \t\r\n]*\\begin\{${envName}\}`,
      'g'
    );
    return input.replace(mergePattern, '\n');
  }

  // 3) strip out purely empty lines
  function removeEmptyLines(input: string): string {
    // match lines that are only whitespace (or empty) and remove them
    return input.replace(/^[ \t]*[\r\n]/gm, '');
  }

  // apply steps
  let out = flattenEnv('itemize', text);
  out = flattenEnv('enumerate', out);
  out = mergeEnv('itemize', out);
  out = mergeEnv('enumerate', out);
  out = mergeEnv('todolist', out);
  out = removeEmptyLines(out);

  return out;
}

function convertEmojis(text: string): string {
  const regex = emojiRegex();
  return text.replace(regex, (match) => {
    // Remove variation selectors (e.g., \ufe0f)
    const cleaned = match.replace(/\ufe0f/g, '');
    const codepoints = Array.from(cleaned).map(c => c.codePointAt(0)?.toString(16)).filter(Boolean);
    if (codepoints.length === 0) return match;
    return `\\emoji{${codepoints.join('-')}}`;
  });
}

function compareSigns(text: string): string {
  // Transform all '\gt' to '>' and all '\lt' to '<'
  return text.replace(/\\gt/g, '>').replace(/\\lt/g, '<');
}

function renameImages(text: string, imageMapping: Map<string, string>): string {
  // Find all \includegraphics[scale = 0.4]{...} patterns and replace the image URLs with proper filenames
  const includeGraphicsPattern = /\\includegraphics\[scale = 0\.4\]\{([^}]+)\}/g;
  
  return text.replace(includeGraphicsPattern, (match, imageUrl) => {
    // Try to find the corresponding filename in our mapping
    const filename = imageMapping.get(imageUrl);
    if (filename) {
      console.log(`Renaming image in TeX: ${imageUrl} -> ${filename}`);
      return `\\includegraphics[scale = 0.4]{${filename}}`;
    } else {
      console.warn(`No filename mapping found for image URL: ${imageUrl}`);
      return match; // Keep original if no mapping found
    }
  });
}
