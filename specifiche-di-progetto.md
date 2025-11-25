# Specifiche di progetto
Dobbiamo realizzare una semplice PWA con HTML, CSS e vanilla javascript, installabile, che possa funzionare anche offline, il cui scopo è quello di generare le regole .htaccess per redirigere url origine a url destinazione.

La pagina HTML sarà in hosting su github pages.

Sarà una singola pagina HTML responsive che consente di importare un file CSV contenente 3 colonne: 
- la prima colonna sarà la lista delle url originarie, 
- la seconda colonna conterrà l'url di destinazione 
- la terza colonna opzionale il valore response status (301, 302, 404, 403, 401, 200)

Il file CSV dovrà essere importato nel database indexedDB del browser, e le url dovranno essere convalidate e ripulite da eventuali caratteri non ammessi attaverso la funzione trim ed eventuali sosituzioni.

Il database indexedDB sarà costituito da una tabella con le 3 colonne iniziali imporate dal file CSV e da altre colonne necessarie a gestire ogni riga.

### Strutura della tabella del DB indexedDB
| Field Name        | Type    | Specific                              |
| :---------------- |:------- | :------------------------------------ |
| **unique_id**     | String  | unique {timestamp}-{randomstring}     |
| **url_origin**    | String  | url                                   |
| **url_dest**      | String  | url                                   |
| **http_status**   | String  | enum [301, 302, 404, 403, 401, 200]   |
| **pathname_only** | Boolean | Default true                          |
| **flag_qsd**      | Boolean | Default false                         |
| **active**        | Boolean | Default true                          |
| **duplicated**    | Boolean | Array of unique_id of duplicated rows |
| **malformed**     | Boolean | Default false                         |
| **rewriterule**   | String  | Default empty                         |

### utilizzo dei campi della tabella
Il campo **unique_id** sarà l'identificativo univoco di ogni riga

Il campo **url_origin** conterrà l'url di origine

Il campo **url_dest** conterrà l'url di destinazione

Il campo **http_status** conterrà uno dei valori dell'array [301, 302, 404, 403, 401, 200] se non specificato il valore sarà 301.

Il campo **pathname_only** forza l'eliminazione della parte iniziale della url dei valori del campo **url_dest**, lasciando solo la parte denominata pathname seguita da eventuale queryString.

Il campo **active** servirà per attivare/disattivare la riga importata (comunque visibile nella tabella HTML della pagina).

Il campo **duplicated** indica false se non esistono duplicati oppure restituisce un array degli **unique_id** delle righe duplicate o con lo stesso valore nel campo **url_origin**.

Il campo **malformed** indica che le url dei campi **url_origin** o **url_dest** non sono valide.

Il campo **rewriterule** conterrà la regola .htaccess generata solo se la riga è valida altrimenti deve contenere una stringa vuota; La riga sarà valida se il campo **active** ha valore true.

Se i campi **duplicated** o **malformed** conterranno il valore true il campo **active** deve essere impostato a false.

Il campo **flag_qsd** serve ad indicare che nella regola RewriteRule dovrà essere eliminata la parte della queryString utilizzando il flag QSD.

## Flusso di lavoro
Dopo l'importazione del CSV assicurandosi di convalidare i campi **url_origin**, **url_dest** e **http_status**, mostrare i dati importati in una tabella HTML evidenziare le url malformate e segnalare eventuali duplicati; le righe che contengono url malformate o valori duplicati verranno disattivate tramite apposito pulsante tipo checkbox.

Ogni campo della tabella dovrà essere editabile dall'utente per eventuali correzioni e i nuovi valori salvati nella tabella indexedDB.

Deve essere possibile eliminare righe o aggiungere nuove righe e salvarle sul DB indexedDB senza dover importarle da CSV.

Se la lista delle url contiene valori di **url_origin** che appartengono a domini diversi si renderà necessario ordinare le righe ragruppandole per dominio in maniera che si possa far precedere le regole dal comando RewriteCond solo una volta per ogni dominio. 

Si rende necessario evitare che le regole .htacess per RewriteRule generate dall'applicazione, provochino loop di redirezioni, pertanto va segnalato ogni valore di url_origin che possa essere uguale ad uno qualsiasi dei valori di **url_dest**, e disattivare la riga corrispondente.

In caso di assenza di errori mostrare il pulsante **Genera RewriteRule** il quale genera le regole RewriteRule, salvandole nel campo **rewriterule** del DB indexedDB e crea un link per scaricare il file in formato .txt contenente tute le regole con eventuali RewriteCond per distinguere i domini di orgine.

Nell'interfaccia sarà presente anche un pulsante **Elimina Tutto** che rimuoverà tutti i dati dal DB indexedDB permettendo di ricominciare da zero con nuove url inserite a mano o importate tramite file CSV.

Nella pagina sarà presente un link ad un CSV di esempio per il tipo di formattazione necesaria all'importazione.

### Accorgimenti per la convalida delle url 
Le url inserite manualmente o importate tramite file CSV destinate ai campi **url_origin** e **url_dest** dovranno essere filtrate come segue o con ulteriori filtri che possono essere suggeriti.
```
let filtered_value=new URL(String(unfiltered_value).trim()).href; 
```
### Formattazione RewriteRule
Ovviamente le url provenienti dal campo **url_origin** devono essere prive della parte iniziale e della queriString, ad esempio la url https://www.domain.net/company/contact-us.html verrà inserita nella regola RewriteRule come segue:
```
RewriteRule ^company/contact-us.html$ https://www.sitedomain.net/company/contact-us/ [R=301,L]
```
Le liste di url con domini diversi saranno precedute da RewriteCond per distinguere il dominio, come nel seguente esempio.

```
# URL del dominio www.sitedomain1.com
RewriteCond %{HTTP_HOST} ^www\.sitedomain1\.com$ [NC]
RewriteRule ^path/url/origin1/page.php$ https://www.sitedomain.net/path/url/dest1/page.html [R=301,L]
RewriteRule ^path/url/origin2/?$ /path/url/dest2/ [R=301,L]                                 # Se il campo pathname_only = true
RewriteRule ^path/url/origin3/?$ https://www.sitedomain.net/path/url/dest3/ [R=302,QSD,L]   # Se il campo flag_qsd = true

# URL del dominio www.sitedomain2.org
RewriteCond %{HTTP_HOST} ^www\.sitedomain2\.org$ [NC]
RewriteRule ^path/url/origin4/page.html$ https://www.sitedomain.net/path/url/dest4/page.php [R=301,L]
RewriteRule ^path/url/origin5/?$ /path/url/dest5/ [R=301,L]                                 # Se il campo pathname_only = true
RewriteRule ^path/url/origin6/?$ https://www.sitedomain.net/path/url/dest6/ [R=404,QSD,L]   # Se il campo flag_qsd = true
```
## Aspetto della pagina
La pagina dovrà essere chiaramente leggibile, con una breve descrizione e una sezione più approfondita che ne spiega il funzionamento ma che può essere nascosta dall'utente e richiamata da un pulsante **help**.

Vorrei utilizzare tailwindcss e le classi predefinite.

La versione mobile può essere semplificata per motivi di spazio su schermo.


