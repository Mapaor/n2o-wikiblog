Això és una app NextJS. El primer que has de fer és utilitzar GitHub Desktop (o simplement Git des de la terminal) per clonar el repositori en local.

A continuació assegura't de tenir npm i node instal·lat.

Un cop tinguis el repositori en una carpeta local l'obres en el vscode (o el teu IDE de confiança) per poder-lo editar, i també obres la terminal integrada del vscode (o una externa i navegues fins al repositori) i fas:

```bash
npm install
```

Això instal·larà tots els paquets i dependències necessaries.

A continuació crees un arxiu `.env.local` i hi poses una variable com la següent:

```
NOTION_TOKEN=ntn_moltsnumerosilletres
```

Finalment fas

```bash
npm run dev
```

I obres [http://localhost:3000](http://localhost:3000) en el navegador.

Felicitats! Estàs visualitzant la aplicació web. Ara edita el que necessitis.

Ara obre el github desktop i publica la teva versió del repositori.

Per últim, pots entrar a Github > Settings > Apps > Vercel > Configure i afegir el teu repositori. A continuació en el dashboard de Vercel crees un nou projecte important el repositori. A 'Environment Variables' hi poses la variable del `.env.local`, i finalment cliques 'Deploy'.

Consulta [documentació de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) per més detalls.
