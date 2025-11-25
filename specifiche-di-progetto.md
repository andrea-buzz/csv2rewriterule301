# Specifiche di progetto
Dobbiamo realizzare una semplice PWA installabile con HTML, CSS e vanilla javascript che possa funzionare anche offline, il cui scopo è quello di generare le regole .htaccess per redirigere url origina a url destinazione.
Sarà una singola pagina HTML responsive che consente di importare un file CSV contenente 3 colonne: 
- la prima colonna sarà la lista delle url originarie, 
- la seconda colonna conterrà l'url di destinazione 
- la terza colonna opzionale il valore response status (301, 302, 404, 403, 401, 200)

Il file CSV dovrà essere importato nel database indexedDB del browser, e le url dovranno essere convalidate e ripulite da eventuali caratteri non ammessi attaverso la funzione trim ed eventuali sosituzioni.
Il database indexedDB sarà costituito da ua tabella con le 3 colonne iniziali imporate dal file CSV e da altre colonne necessarie a gestire ogni riga.
### Strutura della tabella indexedDB
| Field Name        | Type    | Specific                              |
| :---------------- |:------- | :------------------------------------ |
| **unique_id**     | String  | unique {timestamp}-{randomstring}     |
| **url_origin**    | String  | url                                   |
| **url_dest**      | String  | url                                   |
| **http_status**   | String  | enum [301, 302, 404, 403, 401, 200]   |
| **pathname_only** | Boolean | Default true                          |
| **active**        | Boolean | Default true                          |
| **duplicated**    | Boolean | Array of unique_id of duplicated rows |
| **malformed**     | Boolean | Default false                         |
| **rewriterule**   | String  | Default empty                         |

Il campo **pathname_only** forza l'eliminazione della parte inizaile della url dei valori del campo **url_dest**, lasciando solo la parte denominata pathname seguita da eventuale queryString. 
Il campo **active** servirà per attivare/disattivare la riga importata (comunque visibile nella tabella HTML della pagina).
Il campo **duplicated** indica false se non esistono duplicati oppure restituisce un array degli **unique_id** delle righe duplicate o con lo stesso valore nel campo **url_origin**.
Il campo **malformed** indica che le url dei campi **url_origin** o **url_dest** non sono valide.
Il campo **rewriterule** conterrà la regola .htaccess generata solo se la riga è valida altrimenti deve contenere una stringa vuota; La riga sarà valida se il campo **active** ha valore true.
Se campi **duplicated** o **malformed** conterranno il valore true il campo **active** deve essere impostato a false. 

## Flusso di lavoro
Dopo l'importazione del CSV assicurandosi di convalidare i campi **url_origin**, **url_dest** e **http_status**, mostrare i dati importati in una tabella HTML evidenziare le url malformate e segnalare eventuali duplicati; le righe che contengono url malformate o valori duplicati verranno disattivate tramite apposito pulsante tipo checkbox.

Ogni campo della tabella dovrà essere editabile dall'utente per eventuali correzioni e i nuovi valori salvati nella tabella indexedDB.
Deve essere possibile agiungere nuove righe e salvarle sul DB indexedDB senza importarle da CSV.

Si rende necessario evitare che le regole .htacess per RewriteRule generate dall'applicazione, provochino loop di redirezioni, pertanto va segnalato ogni valore di url_origin che possa essere uguale ad uno qualsiasi dei valori di **url_dest**, e disattivare la riga corrispondente.
In caso di assenza di errori mostrare il pulsante **Genera RewriteRules** il quale
Nell'interfaccia sarà presente anche un pulsante **Elimina Tutto** che rimuoverà tutti i dati dal DB indexedDB permettendo di ricominciare da zero con nuove url inserite a mano o importate tramite file CSV. Nella pagina sarà presente un link ad un CSV di esempio per il tipo di formattazione necesaria all'importazione.
