
export function concatTex(preliminar: string, texOutput: string, hasWeirdChars: boolean = false): string {
  // Split preliminar into lines
  const lines = preliminar.split(/\r?\n/);
  // Remove the last 3 lines
  const prelimWithoutEnd = lines.slice(0, -3).join('\n');
  // Add texOutput and the final \end{document}
  let finalTex = `${prelimWithoutEnd}\n${texOutput}\n\n\\end{document}`;

  // LOGS
  const hasConversionLogs = hasWeirdChars && true;
  if (hasConversionLogs) {
    finalTex += `\n\n%%%%%%%%%%%%%%%%%%%% WARNINGS SOBRE LA CONVERSIÓ %%%%%%%%%%%%%%%%%%%%%%`
  }

  // If hasWeirdChars is true, add a comment at the end '% Conté caràcters UNICODE no suportats, mostrats com a U+XXXX'
  if (hasWeirdChars) {
    finalTex += "\n\n% NOTA: S'han detectat caràcters UNICODE que no s'han pogut convertir. Es mostren al document en format U+XXXX. " +
      "Per utilitzar-los correctament pots provar amb https://www.johndcook.com/unicode_latex.html. Si tot i així no te'n surts, mira primer de tot quin símbol tenen " +
      "(per exemple a https://www.compart.com/en/unicode) i després consulta com generar-los " +
      "correctament a https://tug.ctan.org/info/symbols/comprehensive/symbols-a4.pdf " +
      "o dibuixa'ls a https://detexify.kirelabs.org/classify.html.";
  }

  return finalTex;
}
