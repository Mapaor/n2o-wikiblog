'use client';
import { useState } from 'react';
import fetchData from './lib/utils/fetchData';
import { processBlocks } from './lib/utils/processBlocks';
import Head from 'next/head';
import type { Block } from './lib/notion/types';
import { useImageDownload } from './lib/hooks/dowloadImage';

import TexCode from './components/TexCode';
import ProgressBar from './components/ProgressBar';
import ImageProgressBar from './components/ImageProgressBar';
import { Preliminar } from './lib/constants/preliminar';
import { concatTex } from './lib/utils/TexConcat';
import { postprocessTex } from './lib/utils/postProcess';
import { Download } from "lucide-react";


export default function Home() {
  const [pageId, setPageId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [texOutput, setTeXOutput] = useState<string | null>(null);
  const [hasWeirdChars, setHasWeirdChars] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; loading: boolean }>({ current: 0, total: 0, loading: false });

  const { prepareImagesZip, downloadZip, isDownloading, downloadProgress, hasImages, downloadStats } = useImageDownload();

  const generateTeX = async () => {
    let outputRebut: { numBlocsProcessats: number; msgErrorOutput: string | null; texBlocks?: { id: string; tex: string }[] } = { numBlocsProcessats: 0, msgErrorOutput: null };
    try {
      setError(null);
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
          setError(outputRebut.msgErrorOutput);
          setTeXOutput(null);
        } else {
          console.log(`Tot ha anat correctament. Blocs processats: ${outputRebut.numBlocsProcessats}`);
          const texString = (outputRebut.texBlocks && outputRebut.texBlocks.length > 0)
            ? outputRebut.texBlocks.map((b: { tex: string }) => b.tex).join('\n')
            : 'No TeX blocks generated.';
          console.log("Codi TeX rebut:", texString);
          setTeXOutput(postprocessTex(texString)[0]);
          setHasWeirdChars(postprocessTex(texString)[1]);
          
          // Automatically prepare images after processing blocks
          if (jsonBlocs) {
            console.log("Preparant imatges...");
            await prepareImagesZip(jsonBlocs as Block[], setError);
          }
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

  const handleDownloadImages = () => {
    if (!hasImages) {
      alert('No hi ha imatges disponibles per descarregar.');
      return;
    }
    downloadZip(pageId);
  };

  return (
    <div className="max-w-xl mx-auto p-8 font-sans text-gray-800">
      <Head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
      </Head>
      <div className="flex items-center gap-4 mt-2">
        <input
          className="flex-1 p-3 border border-gray-300 rounded-md text-base"
          type="text"
          placeholder="0a2bbe3a40484d25bdba5c37f2637532"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
        />
        <button 
          className="bg-green-600 text-white cursor-pointer py-3 px-5 rounded-lg font-medium shadow hover:bg-green-500 transition whitespace-nowrap disabled:bg-gray-400" 
          onClick={generateTeX}
          disabled={progress.loading || isDownloading}
        >
          Generar codi TeX
        </button>
      </div>
      
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

      {isDownloading && (
        <ImageProgressBar current={downloadProgress.current} total={downloadProgress.total} loading={isDownloading} />
      )}

      {texOutput && (
        <>
          <TexCode code={concatTex(Preliminar, texOutput, hasWeirdChars)} />
        </>
      )}

      {/* {msgOutput && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{msgOutput}</p>
        </div>
      )} */}

      {/* Add download images button */}
      {texOutput && hasImages && (
        <div className="mt-4">
          <button 
            className="flex items-center gap-2 bg-blue-600 text-white cursor-pointer py-2 px-4 rounded-lg font-medium shadow hover:bg-blue-500 transition disabled:bg-gray-400"
            onClick={handleDownloadImages}
            disabled={isDownloading || progress.loading}
          >
            <Download /> Descarregar imatges (ZIP)
          </button>
          {downloadStats.total > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {downloadStats.successful > 0 
                ? `${downloadStats.successful} de ${downloadStats.total} imatges descarregades correctament` 
                : `S'han detectat ${downloadStats.total} imatges`}
            </p>
          )}
        </div>
      )}

      </div>
    </div>
  );
}