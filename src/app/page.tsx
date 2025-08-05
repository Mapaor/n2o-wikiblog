'use client';
import { useState } from 'react';
import fetchData from './lib/utils/fetchData';
import getPage from './lib/utils/getPage';
import { processBlocks } from './lib/utils/processBlocks';
import Head from 'next/head';
import type { Block } from './lib/notion/types';

import TexCode from './components/TexCode';
import ProgressBar from './components/ProgressBar';
import { Preliminar } from './lib/constants/preliminar';
import { concatTex } from './lib/utils/TexConcat';
import JSONCode from './components/JSONCode';
import { postprocessTex } from './lib/utils/postProcess';


export default function Home() {
  const [pageId, setPageId] = useState('');
  // Removed unused data state
  const [error, setError] = useState<string | null>(null);
  const [msgOutput, setOutput] = useState<string | null>(null);
  const [texOutput, setTeXOutput] = useState<string | null>(null);
  const [hasWeirdChars, setHasWeirdChars] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; loading: boolean }>({ current: 0, total: 0, loading: false });





  // No longer needed: fetchDataHandler (was unused and required the token)

  const generateTeX = async () => {
    let outputRebut: { numBlocsProcessats: number; msgErrorOutput: string | null; texBlocks?: { id: string; tex: string }[] } = { numBlocsProcessats: 0, msgErrorOutput: null };
    try {
      setError(null);
      setOutput(null);
      setTeXOutput(null);
      setProgress({ current: 0, total: 0, loading: true });
      const jsonBlocs = await fetchData(pageId, setError);
      if (!jsonBlocs) {
        setProgress({ current: 0, total: 0, loading: false });
        return;
      }
      console.log('fetchData correcte');
      try {
        console.log("Abans de processar els blocs");
        outputRebut = await processBlocks(
          jsonBlocs as Block[],
          pageId,
          1,
          null,
          undefined,
          (current: number, total: number) => setProgress({ current, total, loading: true })
        );
        setProgress(prev => ({ ...prev, loading: false }));
        console.log("Blocs processats correctament");
        console.log("outputRebut:", outputRebut);
        if (outputRebut.msgErrorOutput !== null) {
          setOutput(outputRebut.msgErrorOutput);
          setTeXOutput(null);
        } else {
          setOutput(`Tot ha anat correctament. Blocs processats: ${outputRebut.numBlocsProcessats}`);
          const texString = (outputRebut.texBlocks && outputRebut.texBlocks.length > 0)
            ? outputRebut.texBlocks.map((b: { tex: string }) => b.tex).join('\n')
            : 'No TeX blocks generated.';
          console.log("Codi TeX rebut:", texString);
          setTeXOutput(postprocessTex(texString)[0]);
          setHasWeirdChars(postprocessTex(texString)[1]);
        }
      } catch (err: unknown) {
        setProgress(prev => ({ ...prev, loading: false }));
        let errorMsg = 'Error desconegut';
        if (err instanceof Error) errorMsg = err.message;
        console.error('Error al fer processBlocks:', errorMsg);
        setError(errorMsg);
        setTeXOutput(null);
      }
    } catch (err: unknown) {
      setProgress(prev => ({ ...prev, loading: false }));
      let errorMsg = 'Error desconegut';
      if (err instanceof Error) errorMsg = err.message;
      console.error('Error al fer fetchData:', errorMsg);
      setError(errorMsg);
      setTeXOutput(null);
    }
    console.log("Conversio a document LaTeX finalitzada!");
  };

  return (
    <div className="max-w-xl mx-auto p-8 font-sans text-gray-800">
      <Head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
      </Head>
      <h3 className="mt-6 text-lg text-gray-600 font-semibold">Page ID</h3>
      <input
        className="w-full p-3 mt-2 border border-gray-300 rounded-md text-base"
        type="text"
        placeholder="23d72e8225e180a48cf1ca83ce688d22"
        value={pageId}
        onChange={(e) => setPageId(e.target.value)}
      />
      <button className="bg-green-600 mt-4 text-white py-3 px-5 rounded-lg font-medium shadow hover:bg-green-500 w-full transition" onClick={generateTeX}>
        Generar codi TeX
      </button>
      <h3 className="mt-6 text-lg text-gray-600 font-semibold">Output</h3>
      <div className="mt-2">
      {error && (
        <>
          <p className="mt-10 font-bold text-gray-800">Error</p>
          <pre className="text-red-600 mt-2 whitespace-pre-wrap">{error}</pre>
        </>
      )}

      {progress.loading && (
        <ProgressBar current={progress.current} total={progress.total} loading={progress.loading} />
      )}

      {msgOutput && (
        <>
          <p className="mt-10 font-bold text-gray-800">Missatge Output</p>
          <pre className="mt-2 bg-gray-100 p-3 rounded text-sm font-mono whitespace-pre-wrap">{msgOutput}</pre>
        </>
      )}

      {texOutput && (
        <>
          <p className="mt-10 font-bold text-gray-800">TeX generat</p>
          <details className="mb-4">
            <summary className="cursor-pointer font-semibold text-green-700">Preàmbul</summary>
            <div className="mt-2">
              <TexCode code={Preliminar} />
            </div>
          </details>
          <TexCode code={texOutput} />
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-green-700">Tot junt</summary>
            <div className="mt-2">
          <TexCode code={concatTex(Preliminar, texOutput, hasWeirdChars)} />
            </div>
          </details>
        </>
      )}
      </div>
    </div>
  );
}